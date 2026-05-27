/**
 * Leadership Dashboard backend.
 *
 * Powers the org-admin/business-owner dashboard at /leadership. One call
 * returns every widget's data scoped by the same filter set so the frontend
 * doesn't need a dozen round-trips.
 *
 * Filters (all optional):
 *   • startDate, endDate          — ISO strings. Apply to messages.created_at.
 *   • channel                     — 'whatsapp' | 'sms' | 'email' | 'fcm'
 *   • userId                      — operator who sent the message
 *   • department, region,         — HRMS attributes of the RECIPIENT contact.
 *     costCenter, designation       Join through contacts.
 *
 * Why one heavy aggregator: the queries share filter logic, so building them
 * once and reusing avoids drift (e.g. if "channel" filter were applied to
 * KPI cards but not the time-series chart, the totals wouldn't match the
 * chart). Single source of truth = predictable dashboard.
 */
const { Message, Contact, Template, User, sequelize } = require('../models');
const { Op } = require('sequelize');

// ── Filter parsing ──────────────────────────────────────────────────────────

/**
 * Coerce the request's filter query into a sanitized object. We treat unknown
 * channels / non-finite numbers as "no filter" rather than 400-ing — keeps the
 * dashboard resilient when stale filter state lives in the URL.
 */
function parseFilters(orgId, raw = {}) {
  const VALID_CHANNELS = new Set(['whatsapp', 'sms', 'email', 'fcm']);
  const f = {
    organizationId: Number(orgId),
    // Default window: last 30 days. The frontend always sends explicit dates,
    // but the default keeps direct API hits sane.
    startDate: raw.startDate ? new Date(raw.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    endDate: raw.endDate ? new Date(raw.endDate) : new Date(),
    channel: VALID_CHANNELS.has(raw.channel) ? raw.channel : null,
    userId: Number.isFinite(Number(raw.userId)) && Number(raw.userId) > 0 ? Number(raw.userId) : null,
    department: raw.department || null,
    region: raw.region || null,
    costCenter: raw.costCenter || null,
    designation: raw.designation || null,
  };
  // Guard: if endDate < startDate (e.g. URL fiddling), swap.
  if (f.endDate < f.startDate) {
    [f.startDate, f.endDate] = [f.endDate, f.startDate];
  }
  return f;
}

/**
 * Build a Sequelize WHERE clause from the parsed filters.
 * Returns { where, contactJoin } — contactJoin is non-null when any HRMS
 * filter is active, signalling callers to add a Contact include.
 */
function buildWhere(f) {
  const where = {
    organizationId: f.organizationId,
    direction: 'outbound', // Leadership dashboard cares about *our* sends, not customer replies.
    createdAt: { [Op.gte]: f.startDate, [Op.lte]: f.endDate },
  };
  if (f.channel) where.channel = f.channel;
  if (f.userId) where.sentBy = f.userId;

  // Group-scoping: when the viewer is non-privileged, f.allowedContactIds is
  // populated by parseFilters → resolveAllowedContactIds. An empty array means
  // "no contacts visible" → return a contradiction so every query yields zero
  // rows instead of leaking org-wide data.
  if (Array.isArray(f.allowedContactIds)) {
    if (f.allowedContactIds.length === 0) {
      where.contactId = { [Op.in]: [-1] }; // guaranteed-no-match
    } else {
      where.contactId = { [Op.in]: f.allowedContactIds };
    }
  }

  // HRMS filters live on the Contact row — we join when at least one is set.
  const contactWhere = {};
  if (f.department) contactWhere.department = f.department;
  if (f.region) contactWhere.region = f.region;
  if (f.costCenter) contactWhere.costCenterName = f.costCenter;
  if (f.designation) contactWhere.designation = f.designation;
  const contactJoin = Object.keys(contactWhere).length > 0
    ? { model: Contact, as: 'contact', required: true, attributes: [], where: contactWhere }
    : null;

  return { where, contactJoin };
}

// ── KPIs ────────────────────────────────────────────────────────────────────

/**
 * The card row at the top: aggregate counters across the filtered slice.
 * Returns:
 *   totalSent, delivered, read, failed, pendingApproval, queued, activeOperators,
 *   deliveryRate, readRate, failureRate, totalCost.
 *
 * Compared with a prior period of equal length so the UI can render
 * "↑ 12% vs previous 30 days" deltas next to each KPI.
 */
async function getKpis(f) {
  const { where, contactJoin } = buildWhere(f);
  const include = contactJoin ? [contactJoin] : [];

  // Current period — one query, aggregate everything client-side from the row.
  const currentRows = await Message.findAll({
    where,
    include,
    attributes: [
      'deliveryStatus',
      'approvalStatus',
      [sequelize.fn('COUNT', sequelize.col('messages.id')), 'count'],
      [sequelize.fn('SUM', sequelize.col('actual_cost')), 'actualCost'],
      [sequelize.fn('SUM', sequelize.col('estimated_cost')), 'estCost'],
    ],
    group: ['deliveryStatus', 'approvalStatus'],
    raw: true,
  });

  // Active operators — distinct sent_by in the period.
  const activeOps = await Message.count({
    where,
    include,
    distinct: true,
    col: 'sent_by',
  });

  // Roll up the grouped rows into a flat object.
  let total = 0,
    delivered = 0,
    read = 0,
    sent = 0,
    failed = 0,
    queued = 0,
    processing = 0,
    pending = 0,
    actualCost = 0,
    estCost = 0;

  for (const r of currentRows) {
    const c = Number(r.count) || 0;
    total += c;
    actualCost += Number(r.actualCost) || 0;
    estCost += Number(r.estCost) || 0;
    if (r.deliveryStatus === 'delivered') delivered += c;
    if (r.deliveryStatus === 'read') {
      read += c;
      delivered += c; // 'read' implies delivered too — count it for delivery rate.
    }
    if (r.deliveryStatus === 'sent') sent += c;
    if (r.deliveryStatus === 'failed') failed += c;
    if (r.deliveryStatus === 'queued') queued += c;
    if (r.deliveryStatus === 'processing') processing += c;
    if (r.approvalStatus === 'pending') pending += c;
  }

  const deliveryRate = total > 0 ? Math.round((delivered / total) * 10000) / 100 : 0;
  const readRate = delivered > 0 ? Math.round((read / delivered) * 10000) / 100 : 0;
  const failureRate = total > 0 ? Math.round((failed / total) * 10000) / 100 : 0;

  // Previous period (same length, ending at startDate-1ms) for delta arrows.
  const periodMs = f.endDate.getTime() - f.startDate.getTime();
  const prevEnd = new Date(f.startDate.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - periodMs);
  const prevWhere = { ...where, createdAt: { [Op.gte]: prevStart, [Op.lte]: prevEnd } };
  const prevTotal = await Message.count({ where: prevWhere, include });
  const deltaPct = prevTotal > 0
    ? Math.round(((total - prevTotal) / prevTotal) * 10000) / 100
    : null;

  return {
    totalSent: total,
    delivered,
    read,
    sent,
    failed,
    queued: queued + processing,
    pendingApproval: pending,
    activeOperators: activeOps || 0,
    deliveryRate,
    readRate,
    failureRate,
    totalCost: Math.round((actualCost || estCost) * 100) / 100,
    deltaPct,
    prevTotal,
    periodDays: Math.max(1, Math.round(periodMs / 86_400_000)),
  };
}

// ── Time-series trend ────────────────────────────────────────────────────────

/**
 * Daily message counts for the period, split by status (sent/delivered/failed).
 * Used for the main "Messages over time" line chart. Buckets at day granularity
 * because the typical window is 7-90 days; sub-day granularity would be noise.
 */
async function getTrend(f) {
  const { where, contactJoin } = buildWhere(f);
  const include = contactJoin ? [contactJoin] : [];

  const rows = await Message.findAll({
    where,
    include,
    attributes: [
      [sequelize.fn('DATE', sequelize.col('messages.created_at')), 'day'],
      'deliveryStatus',
      [sequelize.fn('COUNT', sequelize.col('messages.id')), 'count'],
    ],
    group: ['day', 'deliveryStatus'],
    order: [[sequelize.literal('day'), 'ASC']],
    raw: true,
  });

  // Pivot to { day, total, delivered, failed } shape recharts can consume.
  const map = new Map();
  for (const r of rows) {
    const day = r.day;
    if (!map.has(day)) map.set(day, { day, total: 0, delivered: 0, failed: 0, read: 0 });
    const row = map.get(day);
    const c = Number(r.count) || 0;
    row.total += c;
    if (r.deliveryStatus === 'delivered') row.delivered += c;
    if (r.deliveryStatus === 'read') {
      row.read += c;
      row.delivered += c;
    }
    if (r.deliveryStatus === 'failed') row.failed += c;
  }
  return Array.from(map.values());
}

// ── Channel breakdown ────────────────────────────────────────────────────────

/**
 * Total counts per channel. Feeds the donut/pie chart. Honors filters EXCEPT
 * the channel filter itself (otherwise the donut would always show one slice).
 */
async function getChannelBreakdown(f) {
  const f2 = { ...f, channel: null };
  const { where, contactJoin } = buildWhere(f2);
  const include = contactJoin ? [contactJoin] : [];

  const rows = await Message.findAll({
    where,
    include,
    attributes: [
      'channel',
      [sequelize.fn('COUNT', sequelize.col('messages.id')), 'count'],
      [sequelize.fn('SUM', sequelize.col('actual_cost')), 'cost'],
    ],
    group: ['channel'],
    raw: true,
  });

  return rows.map((r) => ({
    channel: r.channel,
    count: Number(r.count) || 0,
    cost: Math.round(((Number(r.cost) || 0)) * 100) / 100,
  }));
}

// ── Top performers ───────────────────────────────────────────────────────────

/**
 * Top N operators by volume, with their delivery rate. Used for the
 * "operator scorecard" table.
 */
async function getTopOperators(f, limit = 10) {
  const { where, contactJoin } = buildWhere(f);
  const includes = [
    { model: User, as: 'sender', required: true, attributes: [] },
  ];
  if (contactJoin) includes.push(contactJoin);

  const rows = await Message.findAll({
    where: { ...where, sentBy: { [Op.ne]: null } },
    include: includes,
    attributes: [
      'sentBy',
      [sequelize.col('sender.first_name'), 'firstName'],
      [sequelize.col('sender.last_name'), 'lastName'],
      [sequelize.col('sender.email'), 'email'],
      [sequelize.col('sender.role'), 'role'],
      [sequelize.fn('COUNT', sequelize.col('messages.id')), 'sent'],
      [
        sequelize.fn(
          'SUM',
          sequelize.literal("CASE WHEN messages.delivery_status IN ('delivered','read') THEN 1 ELSE 0 END")
        ),
        'delivered',
      ],
      [
        sequelize.fn(
          'SUM',
          sequelize.literal("CASE WHEN messages.delivery_status = 'failed' THEN 1 ELSE 0 END")
        ),
        'failed',
      ],
    ],
    group: ['sentBy', 'sender.id'],
    order: [[sequelize.literal('sent'), 'DESC']],
    limit,
    subQuery: false,
    raw: true,
  });

  return rows.map((r) => {
    const sent = Number(r.sent) || 0;
    const delivered = Number(r.delivered) || 0;
    const failed = Number(r.failed) || 0;
    return {
      userId: r.sentBy,
      name: `${r.firstName || ''} ${r.lastName || ''}`.trim() || r.email,
      email: r.email,
      role: r.role,
      sent,
      delivered,
      failed,
      deliveryRate: sent > 0 ? Math.round((delivered / sent) * 10000) / 100 : 0,
    };
  });
}

/**
 * Top N templates by usage in the period. Returns name, channel, usage count,
 * delivery rate.
 */
async function getTopTemplates(f, limit = 10) {
  const { where, contactJoin } = buildWhere(f);
  const includes = [
    { model: Template, as: 'template', required: true, attributes: [] },
  ];
  if (contactJoin) includes.push(contactJoin);

  const rows = await Message.findAll({
    where: { ...where, templateId: { [Op.ne]: null } },
    include: includes,
    attributes: [
      'templateId',
      [sequelize.col('template.name'), 'name'],
      [sequelize.col('template.channel'), 'channel'],
      [sequelize.col('template.category'), 'category'],
      [sequelize.fn('COUNT', sequelize.col('messages.id')), 'sent'],
      [
        sequelize.fn(
          'SUM',
          sequelize.literal("CASE WHEN messages.delivery_status IN ('delivered','read') THEN 1 ELSE 0 END")
        ),
        'delivered',
      ],
    ],
    group: ['templateId', 'template.id'],
    order: [[sequelize.literal('sent'), 'DESC']],
    limit,
    subQuery: false,
    raw: true,
  });

  return rows.map((r) => {
    const sent = Number(r.sent) || 0;
    const delivered = Number(r.delivered) || 0;
    return {
      templateId: r.templateId,
      name: r.name,
      channel: r.channel,
      category: r.category,
      sent,
      delivered,
      deliveryRate: sent > 0 ? Math.round((delivered / sent) * 10000) / 100 : 0,
    };
  });
}

// ── HRMS breakdowns ──────────────────────────────────────────────────────────

/**
 * Aggregate counts by an HRMS dimension on the recipient contact. dimension
 * must be one of: department, region, costCenterName, designation.
 */
async function getHrmsBreakdown(f, dimension, limit = 10) {
  const VALID = new Set(['department', 'region', 'costCenterName', 'designation']);
  if (!VALID.has(dimension)) return [];

  // Skip the dimension's own filter so the breakdown isn't always single-row.
  const f2 = { ...f };
  const dimFilterMap = {
    department: 'department',
    region: 'region',
    costCenterName: 'costCenter',
    designation: 'designation',
  };
  f2[dimFilterMap[dimension]] = null;

  const { where } = buildWhere(f2);
  const colSnakeMap = {
    department: 'department',
    region: 'region',
    costCenterName: 'cost_center_name',
    designation: 'designation',
  };
  const col = colSnakeMap[dimension];

  const rows = await Message.findAll({
    where,
    include: [
      {
        model: Contact,
        as: 'contact',
        required: true,
        attributes: [],
        where: { [dimension]: { [Op.ne]: null, [Op.ne]: '' } },
      },
    ],
    attributes: [
      [sequelize.col(`contact.${col}`), 'label'],
      [sequelize.fn('COUNT', sequelize.col('messages.id')), 'count'],
      [
        sequelize.fn(
          'SUM',
          sequelize.literal("CASE WHEN messages.delivery_status IN ('delivered','read') THEN 1 ELSE 0 END")
        ),
        'delivered',
      ],
    ],
    group: [sequelize.col(`contact.${col}`)],
    order: [[sequelize.literal('count'), 'DESC']],
    limit,
    subQuery: false,
    raw: true,
  });

  return rows
    .filter((r) => r.label)
    .map((r) => ({
      label: r.label,
      count: Number(r.count) || 0,
      delivered: Number(r.delivered) || 0,
    }));
}

// ── Approval funnel ──────────────────────────────────────────────────────────

/**
 * The approval → send → deliver → read pipeline counts. Useful for spotting
 * bottlenecks (e.g. lots of pending approvals not getting through).
 */
async function getApprovalFunnel(f) {
  const { where, contactJoin } = buildWhere(f);
  const include = contactJoin ? [contactJoin] : [];

  const rows = await Message.findAll({
    where,
    include,
    attributes: [
      'approvalStatus',
      'deliveryStatus',
      [sequelize.fn('COUNT', sequelize.col('messages.id')), 'count'],
    ],
    group: ['approvalStatus', 'deliveryStatus'],
    raw: true,
  });

  let submitted = 0,
    approved = 0,
    rejected = 0,
    sent = 0,
    delivered = 0,
    read = 0;

  for (const r of rows) {
    const c = Number(r.count) || 0;
    submitted += c;
    if (r.approvalStatus === 'approved') {
      approved += c;
      if (r.deliveryStatus === 'sent') sent += c;
      if (r.deliveryStatus === 'delivered') {
        delivered += c;
        sent += c;
      }
      if (r.deliveryStatus === 'read') {
        read += c;
        delivered += c;
        sent += c;
      }
    }
    if (r.approvalStatus === 'rejected') rejected += c;
  }

  return { submitted, approved, rejected, sent, delivered, read };
}

// ── Recent failures (drill-down) ─────────────────────────────────────────────

/**
 * Last N failed messages with the failure reason, for the drill-down panel.
 * Helps the admin see WHY things failed (invalid number, template rejection,
 * Meta rate limit, etc.) without leaving the dashboard.
 */
async function getRecentFailures(f, limit = 20) {
  const { where, contactJoin } = buildWhere(f);
  const includes = [
    { model: Contact, as: 'contact', required: false, attributes: ['name', 'phoneNumber'] },
  ];
  if (contactJoin) includes[0] = contactJoin;

  const rows = await Message.findAll({
    where: { ...where, deliveryStatus: 'failed' },
    include: includes,
    order: [['createdAt', 'DESC']],
    limit,
    attributes: [
      'id', 'channel', 'recipientPhone', 'recipientName', 'failureReason',
      'failedAt', 'createdAt',
    ],
  });

  return rows.map((m) => {
    const json = m.toJSON();
    return {
      id: json.id,
      channel: json.channel,
      recipient: json.recipientName || json.contact?.name || json.recipientPhone,
      phone: json.recipientPhone || json.contact?.phoneNumber,
      failureReason: json.failureReason || 'No reason provided',
      failedAt: json.failedAt || json.createdAt,
    };
  });
}

// ── Filter options ───────────────────────────────────────────────────────────

/**
 * Distinct values for filter dropdowns. Called once when the dashboard loads.
 * Each list is capped at 200 to keep payloads reasonable.
 */
async function getFilterOptions(organizationId) {
  const [users, departments, regions, costCenters, designations] = await Promise.all([
    User.findAll({
      where: { organizationId },
      attributes: ['id', 'firstName', 'lastName', 'email', 'role'],
      order: [['firstName', 'ASC']],
      limit: 500,
    }),
    Contact.findAll({
      where: { organizationId, deletedAt: null, department: { [Op.ne]: null, [Op.ne]: '' } },
      attributes: [[sequelize.fn('DISTINCT', sequelize.col('department')), 'value']],
      order: [['department', 'ASC']],
      limit: 200,
      raw: true,
    }),
    Contact.findAll({
      where: { organizationId, deletedAt: null, region: { [Op.ne]: null, [Op.ne]: '' } },
      attributes: [[sequelize.fn('DISTINCT', sequelize.col('region')), 'value']],
      order: [['region', 'ASC']],
      limit: 200,
      raw: true,
    }),
    Contact.findAll({
      where: { organizationId, deletedAt: null, costCenterName: { [Op.ne]: null, [Op.ne]: '' } },
      attributes: [[sequelize.fn('DISTINCT', sequelize.col('cost_center_name')), 'value']],
      order: [['cost_center_name', 'ASC']],
      limit: 200,
      raw: true,
    }),
    Contact.findAll({
      where: { organizationId, deletedAt: null, designation: { [Op.ne]: null, [Op.ne]: '' } },
      attributes: [[sequelize.fn('DISTINCT', sequelize.col('designation')), 'value']],
      order: [['designation', 'ASC']],
      limit: 200,
      raw: true,
    }),
  ]);

  return {
    users: users.map((u) => ({
      id: u.id,
      name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
      email: u.email,
      role: u.role,
    })),
    departments: departments.map((r) => r.value).filter(Boolean),
    regions: regions.map((r) => r.value).filter(Boolean),
    costCenters: costCenters.map((r) => r.value).filter(Boolean),
    designations: designations.map((r) => r.value).filter(Boolean),
  };
}

// ── Aggregate ────────────────────────────────────────────────────────────────

/**
 * The single endpoint the frontend calls — returns every widget's data in one
 * payload. Reuses the same filter object across all sub-queries so totals stay
 * internally consistent.
 */
async function getDashboard(organizationId, rawFilters, viewer = null) {
  const f = parseFilters(organizationId, rawFilters);

  // Group-scoping for non-privileged viewers: cap every query to messages
  // whose recipient contact is in a group this user is assigned to. Resolved
  // ONCE here and stuffed into f.allowedContactIds so buildWhere can apply
  // it uniformly. Privileged roles (super_admin/admin/manager) get null and
  // see everything in their org.
  if (viewer) {
    const contactGroupService = require('./contactGroupService');
    const visibleGroupIds = await contactGroupService.visibleGroupIdsForUser(viewer);
    if (visibleGroupIds === null) {
      // privileged — no restriction
      f.allowedContactIds = null;
      f.viewerHasNoGroups = false;
    } else if (visibleGroupIds.length === 0) {
      // operator/viewer with zero assigned groups → show no data, but render
      // the page so the operator sees the empty-state hint.
      f.allowedContactIds = [];
      f.viewerHasNoGroups = true;
      f._visibleGroupCount = 0;
    } else {
      const ids = await contactGroupService.getContactIdsForGroups(organizationId, visibleGroupIds);
      f.allowedContactIds = ids || [];
      f.viewerHasNoGroups = false;
      f._visibleGroupCount = visibleGroupIds.length;
    }
  }

  const [
    kpis,
    trend,
    channelBreakdown,
    topOperators,
    topTemplates,
    departmentBreakdown,
    regionBreakdown,
    costCenterBreakdown,
    designationBreakdown,
    approvalFunnel,
    recentFailures,
  ] = await Promise.all([
    getKpis(f),
    getTrend(f),
    getChannelBreakdown(f),
    getTopOperators(f, 10),
    getTopTemplates(f, 10),
    getHrmsBreakdown(f, 'department', 8),
    getHrmsBreakdown(f, 'region', 8),
    getHrmsBreakdown(f, 'costCenterName', 8),
    getHrmsBreakdown(f, 'designation', 8),
    getApprovalFunnel(f),
    getRecentFailures(f, 15),
  ]);

  return {
    filters: {
      startDate: f.startDate.toISOString(),
      endDate: f.endDate.toISOString(),
      channel: f.channel,
      userId: f.userId,
      department: f.department,
      region: f.region,
      costCenter: f.costCenter,
      designation: f.designation,
    },
    // Viewer scope diagnostics: lets the frontend render a helpful banner
    // when an operator with zero assigned groups lands here (currently shown
    // as a blank dashboard, which is confusing without the hint).
    viewerScope: viewer
      ? {
          scoped: Array.isArray(f.allowedContactIds),
          allowedGroupCount: Array.isArray(f.allowedContactIds)
            ? (f._visibleGroupCount ?? 0)
            : null,
          allowedContactCount: Array.isArray(f.allowedContactIds)
            ? f.allowedContactIds.length
            : null,
          hasNoGroups: !!f.viewerHasNoGroups,
        }
      : null,
    kpis,
    trend,
    channelBreakdown,
    topOperators,
    topTemplates,
    breakdowns: {
      department: departmentBreakdown,
      region: regionBreakdown,
      costCenter: costCenterBreakdown,
      designation: designationBreakdown,
    },
    approvalFunnel,
    recentFailures,
  };
}

module.exports = {
  getDashboard,
  getFilterOptions,
};
