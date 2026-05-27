const { Op, fn, col, literal } = require('sequelize');
const { BulkMessageBatch, Message, Template, User, Contact } = require('../models');
const { NotFoundError } = require('../utils/errorTypes');

// "Campaign" is the user-facing name for a row in `bulk_message_batches`. We
// don't rename the DB table — only the API surface uses the new vocabulary.
//
// Counts are computed LIVE via a single GROUP BY on the Messages table per
// campaign (or batch-resolved subquery for the list). The bulkmessagebatch
// row's own totalSent/Delivered/Failed columns are NOT relied on — they were
// never wired up by sendBulk and would lie. Read paths are the source of
// truth; if we ever add a worker to populate those columns it will be a
// cache, not the canonical view.

const TERMINAL_STATUSES = ['sent', 'delivered', 'read', 'failed', 'cancelled'];

function emptyRollup() {
  return {
    total: 0,
    queued: 0, processing: 0,
    sent: 0, delivered: 0, read: 0,
    failed: 0, cancelled: 0,
    deliveryRate: 0, readRate: 0, failureRate: 0,
  };
}

function deriveRates(r) {
  const reached = r.sent + r.delivered + r.read; // anything Meta accepted
  const denominator = reached + r.failed;
  if (denominator > 0) {
    r.deliveryRate = Math.round((reached * 1000) / denominator) / 10;
    r.failureRate = Math.round((r.failed * 1000) / denominator) / 10;
  }
  const deliveredOrRead = r.delivered + r.read;
  if (deliveredOrRead > 0) {
    r.readRate = Math.round((r.read * 1000) / deliveredOrRead) / 10;
  }
  return r;
}

// Compute the campaign-wide status: 'completed' once every message has a
// terminal status; otherwise 'processing'. The bulk_message_batches.status
// column is ignored — it never advances past 'processing' in practice.
function deriveCampaignStatus(rollup) {
  if (!rollup.total) return 'pending';
  const inFlight = rollup.queued + rollup.processing;
  if (inFlight > 0) return 'processing';
  if (rollup.failed === rollup.total) return 'failed';
  return 'completed';
}

class CampaignService {
  /**
   * List campaigns (= bulk_message_batches) for an org with live rollups.
   * Computes counts in a single SQL pass — joins are cheap because every
   * filter is keyed off `messages.bulk_batch_id` which has an index.
   */
  async list(organizationId, { search, channel, dateFrom, dateTo, page = 1, limit = 20 } = {}) {
    const where = { organizationId };
    if (search) where.name = { [Op.like]: `%${search}%` };
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt[Op.gte] = new Date(dateFrom);
      if (dateTo) where.createdAt[Op.lte] = new Date(dateTo);
    }

    const { rows: batches, count } = await BulkMessageBatch.findAndCountAll({
      where,
      include: [
        {
          model: Template,
          as: 'template',
          attributes: ['id', 'name', 'channel', 'category'],
          // Optional channel filter — only batches whose template's channel
          // matches. Stored on Template, not on batch, because the batch
          // currently doesn't have its own channel column.
          ...(channel ? { where: { channel } } : {}),
          required: !!channel,
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email'],
          required: false,
        },
      ],
      order: [['createdAt', 'DESC']],
      offset: (page - 1) * limit,
      limit,
      distinct: true,
    });

    if (batches.length === 0) {
      return { data: [], pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) } };
    }

    // One GROUP BY query covering every batch on this page — much cheaper
    // than N+1 queries per row.
    const batchIds = batches.map((b) => b.id);
    const rollupRows = await Message.findAll({
      where: { bulkBatchId: { [Op.in]: batchIds } },
      attributes: [
        'bulkBatchId',
        'deliveryStatus',
        [fn('COUNT', col('id')), 'cnt'],
      ],
      group: ['bulkBatchId', 'deliveryStatus'],
      raw: true,
    });

    const rollupByBatchId = new Map();
    for (const id of batchIds) rollupByBatchId.set(id, emptyRollup());
    for (const row of rollupRows) {
      const r = rollupByBatchId.get(row.bulkBatchId) || emptyRollup();
      const n = Number(row.cnt) || 0;
      r.total += n;
      if (row.deliveryStatus in r) r[row.deliveryStatus] += n;
      rollupByBatchId.set(row.bulkBatchId, r);
    }
    for (const r of rollupByBatchId.values()) deriveRates(r);

    const data = batches.map((b) => {
      const rollup = rollupByBatchId.get(b.id) || emptyRollup();
      const j = b.toJSON();
      return {
        ...j,
        derivedStatus: deriveCampaignStatus(rollup),
        rollup,
      };
    });

    return {
      data,
      pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) },
    };
  }

  /**
   * Single campaign — batch + rollup + computed status + cost totals.
   */
  async getById(organizationId, id) {
    const batch = await BulkMessageBatch.findOne({
      where: { id, organizationId },
      include: [
        { model: Template, as: 'template', attributes: ['id', 'name', 'channel', 'category', 'body'] },
        { model: User, as: 'creator', attributes: ['id', 'firstName', 'lastName', 'email'] },
      ],
    });
    if (!batch) throw new NotFoundError('Campaign');

    const rollupRows = await Message.findAll({
      where: { bulkBatchId: id },
      attributes: [
        'deliveryStatus',
        [fn('COUNT', col('id')), 'cnt'],
        [fn('COALESCE', fn('SUM', col('estimated_cost')), 0), 'estCost'],
        [fn('COALESCE', fn('SUM', col('actual_cost')), 0), 'actualCost'],
      ],
      group: ['deliveryStatus'],
      raw: true,
    });
    const rollup = emptyRollup();
    let totalEstCost = 0;
    let totalActualCost = 0;
    for (const row of rollupRows) {
      const n = Number(row.cnt) || 0;
      rollup.total += n;
      if (row.deliveryStatus in rollup) rollup[row.deliveryStatus] += n;
      totalEstCost += Number(row.estCost) || 0;
      totalActualCost += Number(row.actualCost) || 0;
    }
    deriveRates(rollup);

    // Failure-reason breakdown — top 10 failure reasons by count.
    const failureBreakdown = await Message.findAll({
      where: {
        bulkBatchId: id,
        deliveryStatus: 'failed',
      },
      attributes: [
        [fn('COALESCE', col('failure_reason'), literal("'Unknown error'")), 'reason'],
        [fn('COUNT', col('id')), 'cnt'],
      ],
      group: [literal("COALESCE(failure_reason, 'Unknown error')")],
      order: [[literal('cnt'), 'DESC']],
      limit: 10,
      raw: true,
    });

    return {
      ...batch.toJSON(),
      derivedStatus: deriveCampaignStatus(rollup),
      rollup,
      cost: {
        estimated: Number(totalEstCost.toFixed(4)),
        actual: Number(totalActualCost.toFixed(4)),
      },
      failureBreakdown: failureBreakdown.map((f) => ({
        reason: f.reason,
        count: Number(f.cnt) || 0,
      })),
    };
  }

  /**
   * Paginated message list for one campaign. The drill-down table renders
   * this with the recipient name + status + retries.
   */
  async listMessages(organizationId, id, { status, page = 1, limit = 50 } = {}) {
    // Confirm the batch belongs to this org (prevents enumeration across
    // tenants when a numeric id is guessed).
    const batch = await BulkMessageBatch.findOne({
      where: { id, organizationId },
      attributes: ['id'],
    });
    if (!batch) throw new NotFoundError('Campaign');

    const where = { bulkBatchId: id, organizationId };
    if (status && status !== 'all') where.deliveryStatus = status;

    const { rows, count } = await Message.findAndCountAll({
      where,
      include: [
        {
          model: Contact,
          as: 'contact',
          attributes: ['id', 'name', 'phoneNumber', 'email'],
          required: false,
        },
      ],
      order: [['createdAt', 'DESC']],
      offset: (page - 1) * limit,
      limit,
    });

    return {
      data: rows.map((m) => {
        const j = m.toJSON();
        return {
          id: j.id,
          recipientPhone: j.recipientPhone,
          recipientEmail: j.recipientEmail,
          recipientName: j.recipientName || j.contact?.name || null,
          deliveryStatus: j.deliveryStatus,
          sentAt: j.sentAt,
          deliveredAt: j.deliveredAt,
          readAt: j.readAt,
          failedAt: j.failedAt,
          failureReason: j.failureReason,
          retries: j.retryCount || 0,
          createdAt: j.createdAt,
          estimatedCost: j.estimatedCost,
          actualCost: j.actualCost,
        };
      }),
      pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) },
    };
  }

  /**
   * CSV export of every message in a campaign. Streamed isn't strictly
   * required at the scales we expect (≤50k rows) — we build the string in
   * memory and return it for the controller to send as a download.
   */
  async exportToCsv(organizationId, id) {
    const batch = await BulkMessageBatch.findOne({
      where: { id, organizationId },
      include: [{ model: Template, as: 'template', attributes: ['name', 'channel'] }],
    });
    if (!batch) throw new NotFoundError('Campaign');

    const messages = await Message.findAll({
      where: { bulkBatchId: id },
      include: [
        {
          model: Contact,
          as: 'contact',
          attributes: ['name', 'phoneNumber', 'email'],
          required: false,
        },
      ],
      order: [['createdAt', 'ASC']],
    });

    const escape = (v) => {
      if (v == null) return '';
      const s = String(v).replace(/"/g, '""');
      return /[",\n]/.test(s) ? `"${s}"` : s;
    };

    const headers = [
      'message_id', 'recipient_name', 'recipient_phone', 'recipient_email',
      'status', 'sent_at', 'delivered_at', 'read_at', 'failed_at',
      'failure_reason', 'retries', 'estimated_cost', 'actual_cost', 'created_at',
    ];
    const lines = [headers.join(',')];
    for (const m of messages) {
      lines.push([
        m.id,
        m.recipientName || m.contact?.name || '',
        m.recipientPhone || m.contact?.phoneNumber || '',
        m.recipientEmail || m.contact?.email || '',
        m.deliveryStatus,
        m.sentAt ? new Date(m.sentAt).toISOString() : '',
        m.deliveredAt ? new Date(m.deliveredAt).toISOString() : '',
        m.readAt ? new Date(m.readAt).toISOString() : '',
        m.failedAt ? new Date(m.failedAt).toISOString() : '',
        m.failureReason || '',
        m.retryCount || 0,
        m.estimatedCost ?? '',
        m.actualCost ?? '',
        new Date(m.createdAt).toISOString(),
      ].map(escape).join(','));
    }

    return {
      filename: `campaign_${batch.id}_${(batch.name || 'export').replace(/[^A-Za-z0-9_-]+/g, '_').slice(0, 60)}.csv`,
      csv: lines.join('\n'),
    };
  }
}

module.exports = new CampaignService();
