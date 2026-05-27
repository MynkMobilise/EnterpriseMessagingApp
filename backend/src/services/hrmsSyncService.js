/**
 * HRMS sync — pulls employees from an org's external HR system and upserts
 * them into the `contacts` table.
 *
 * Triggered:
 *   - on demand:    POST /api/v1/contacts/hrms/sync
 *   - nightly:      cron at 02:00 (see scheduledJobs.js)
 *
 * The mapping between HRMS JSON payload, Excel/CSV upload, and the local
 * Contact row is centralized in `HRMS_FIELDS` + `mapHrmsRowToContact()`
 * below. To add or rename a field, edit the single table and both the API
 * sync and the bulk Excel import pick it up automatically.
 *
 * Pagination follows the source API's `next_empid` cursor (passed back as
 * `after_id`). Incremental syncs use `last_sync_datetime` so subsequent
 * runs only fetch new/updated employees.
 */
const axios = require('axios');
const { Op } = require('sequelize');
const { Contact, OrganizationSettings, User } = require('../models');
const { decrypt, encrypt, isEncrypted } = require('../utils/encryption');
const { normalizePhone } = require('../utils/phoneNumber');
const logger = require('../utils/logger');

/**
 * Canonical field schema. Each row:
 *   [hrmsKey, contactColumn, excelHeader]
 *
 * `hrmsKey` is the exact key from the HRMS API JSON payload AND the column
 * header in our Excel/CSV template — they're identical so a payload can be
 * dumped to Excel and re-imported losslessly.
 */
const HRMS_FIELDS = [
  // hrmsKey                            // Contact field        // Excel header (same as hrmsKey)
  ['db_id',                              'externalId',           'db_id'],
  ['employee_id',                        'employeeId',           'employee_id'],
  ['employee_name',                      'name',                 'employee_name'],
  ['employee_status',                    'employeeStatus',       'employee_status'],
  ['mobile',                             'phoneNumber',          'mobile'],
  ['employment_category',                'employmentCategory',   'employment_category'],
  ['skill_type',                         'skillType',            'skill_type'],
  ['hiring_type',                        'hiringType',           'hiring_type'],
  ['cost_center_code',                   'costCenterCode',       'cost_center_code'],
  ['cost_center_name',                   'costCenterName',       'cost_center_name'],
  ['reporting_manager_code',             'reportingManagerCode', 'reporting_manager_code'],
  ['reporting_manager_name',             'reportingManagerName', 'reporting_manager_name'],
  ['reporting_manager_contact_number',   'reportingManagerMobile', 'reporting_manager_contact_number'],
  ['designation',                        'designation',          'designation'],
  ['department',                         'department',           'department'],
  ['sub_department',                     'subDepartment',        'sub_department'],
  ['region',                             'region',               'region'],
  ['segment_name',                       'segmentName',          'segment_name'],
  ['sub_segment_name',                   'subSegmentName',       'sub_segment_name'],
];

const HRMS_EXCEL_HEADERS = HRMS_FIELDS.map(([, , header]) => header);

/**
 * Convert one HRMS JSON row (or one Excel/CSV row, since the headers match)
 * into the shape of a Contact upsert payload. Handles:
 *   - mobile → digits-only canonical phone (matches what messageService does)
 *   - employee_status: 'Active' | 'Inactive' → status enum
 *   - empty strings → null (so we don't overwrite good values with '')
 */
function mapHrmsRowToContact(hrmsRow) {
  const out = {};
  for (const [hrmsKey, contactCol] of HRMS_FIELDS) {
    let v = hrmsRow[hrmsKey];
    // Some HRMS deployments use `status` as the field name instead of the
    // documented `employee_status`. Accept either so the mapper doesn't
    // silently drop the employment-status value.
    if ((v === undefined || v === null || v === '') && hrmsKey === 'employee_status') {
      v = hrmsRow.status;
    }
    if (v === undefined || v === null || v === '') {
      // Don't overwrite existing values with empty strings.
      continue;
    }
    if (typeof v === 'string') v = v.trim();
    if (contactCol === 'phoneNumber') {
      const digits = normalizePhone(v);
      if (!digits) continue;
      out.phoneNumber = digits;
    } else {
      out[contactCol] = v;
    }
  }
  // Map 'Active' / 'Inactive' / 'Resigned' → status enum
  if (out.employeeStatus) {
    const s = String(out.employeeStatus).toLowerCase();
    out.status = (s === 'active') ? 'active' : 'inactive';
  }
  return out;
}

/**
 * Pick an org admin user to attribute auto-created contacts to.
 * Contact.createdBy is NOT NULL; use the oldest admin/super_admin.
 */
async function pickAttributionUser(organizationId) {
  const u = await User.findOne({
    where: { organizationId, role: { [Op.in]: ['super_admin', 'admin'] } },
    order: [['createdAt', 'ASC']],
  });
  if (u) return u;
  return await User.findOne({
    where: { organizationId },
    order: [['createdAt', 'ASC']],
  });
}

/**
 * Upsert a single HRMS-shaped row into contacts. Used by both the API
 * sync loop and the Excel/CSV bulk importer.
 *
 * @param {number} organizationId
 * @param {number} createdById
 * @param {object} hrmsRow         raw row from HRMS API / Excel
 * @param {'api'|'excel'|'manual'} source
 * @returns {Promise<{action: 'inserted'|'updated'|'skipped', error?: string, contactId?: number}>}
 */
async function upsertOne(organizationId, createdById, hrmsRow, source = 'api') {
  const data = mapHrmsRowToContact(hrmsRow);
  if (!data.employeeId && !data.phoneNumber && !data.externalId) {
    return { action: 'skipped', error: 'no employee_id, db_id, or mobile' };
  }

  // Prefer matching on employee_id (most stable); fall back to phone, then external_id.
  const where = { organizationId, deletedAt: null };
  if (data.employeeId) {
    where.employeeId = data.employeeId;
  } else if (data.externalId) {
    where.externalId = data.externalId;
  } else {
    where.phoneNumber = data.phoneNumber;
  }
  const existing = await Contact.findOne({ where });

  data.lastSyncedAt = new Date();
  data.lastSyncSource = source;
  data.source = data.source || (source === 'api' ? 'HRMS API' : source === 'excel' ? 'Excel Import' : 'HRMS Manual');

  if (existing) {
    await existing.update(data);
    return { action: 'updated', contactId: existing.id };
  }
  const created = await Contact.create({
    organizationId,
    createdBy: createdById,
    optInStatus: 'pending',
    ...data,
  });
  return { action: 'inserted', contactId: created.id };
}

/**
 * Pull all employees for one org from its configured HRMS URL and upsert
 * them. Walks the `next_empid` cursor until the API stops returning rows.
 *
 * @param {number} organizationId
 * @returns {Promise<{ inserted, updated, skipped, pages, error? }>}
 */
async function syncForOrg(organizationId) {
  const stats = { inserted: 0, updated: 0, skipped: 0, pages: 0 };

  // Per-tenant feature gate. HRMS sync ships as a paid-tier feature; super
  // admin can flip it off via Organization.featureOverrides without touching
  // the saved API URL.
  const { Organization } = require('../models');
  const { effectiveFlags } = require('../utils/featureFlags');
  const org = await Organization.findByPk(organizationId);
  if (!effectiveFlags(org).hrmsSync) {
    return { ...stats, error: 'HRMS sync is not enabled for this organization' };
  }

  const settings = await OrganizationSettings.findOne({ where: { organizationId } });
  if (!settings || !settings.hrmsApiUrl) {
    return { ...stats, error: 'HRMS API not configured for this organization' };
  }

  const attribUser = await pickAttributionUser(organizationId);
  if (!attribUser) {
    return { ...stats, error: 'No user available to attribute contacts to' };
  }

  // Build request headers. Auth header is optional — added if configured.
  const headers = { 'Accept': 'application/json' };
  if (settings.hrmsApiAuthHeaderName && settings.hrmsApiAuthHeaderValue) {
    let v;
    try {
      v = isEncrypted(settings.hrmsApiAuthHeaderValue)
        ? decrypt(settings.hrmsApiAuthHeaderValue)
        : settings.hrmsApiAuthHeaderValue;
    } catch (_) {
      return { ...stats, error: 'HRMS auth header cannot be decrypted (ENCRYPTION_KEY changed?)' };
    }
    headers[settings.hrmsApiAuthHeaderName] = v;
  }

  // Pagination: walk after_id until count = 0 or next_empid is null.
  // Incremental: pass last_sync_datetime so we only get new/updated rows.
  const baseUrl = settings.hrmsApiUrl;
  const lastSync = settings.hrmsLastSyncDatetime
    ? new Date(settings.hrmsLastSyncDatetime).toISOString().replace('T', ' ').slice(0, 19)
    : '';

  let afterId = '';
  // TEST MODE: fetch only 5 contacts in a single page so we can validate
  // the HRMS pipeline end-to-end before unleashing it on the full dataset.
  // To go back to production scale, set PAGE_SIZE = 100 and MAX_PAGES = 1000.
  const PAGE_SIZE = 5;
  const MAX_PAGES = 1;
  let lastServerSync = null;

  for (let page = 0; page < MAX_PAGES; page++) {
    let resp;
    try {
      resp = await axios.get(baseUrl, {
        params: {
          limit: PAGE_SIZE,
          after_id: afterId,
          last_sync_datetime: lastSync,
        },
        headers,
        // HR systems can be slow when returning paginated employee data.
        // 500s per-page request timeout to accommodate big payloads.
        timeout: 500000,
      });
    } catch (e) {
      const msg = e.response?.data?.message || e.response?.statusText || e.message;
      const errMsg = `HRMS fetch failed at page ${page + 1}: ${msg}`;
      await settings.update({ hrmsLastSyncError: errMsg, hrmsLastSyncedAt: new Date() });
      return { ...stats, error: errMsg };
    }

    const body = resp.data || {};
    if (!body.success) {
      const errMsg = `HRMS API returned success=false at page ${page + 1}`;
      await settings.update({ hrmsLastSyncError: errMsg, hrmsLastSyncedAt: new Date() });
      return { ...stats, error: errMsg };
    }

    const rows = Array.isArray(body.data) ? body.data : [];
    stats.pages = page + 1;
    if (body.last_sync_datetime) lastServerSync = body.last_sync_datetime;

    for (const row of rows) {
      try {
        const r = await upsertOne(organizationId, attribUser.id, row, 'api');
        if (r.action === 'inserted') stats.inserted++;
        else if (r.action === 'updated') stats.updated++;
        else stats.skipped++;
      } catch (e) {
        stats.skipped++;
        logger.warn('HRMS upsert failed for row', { employee_id: row.employee_id, error: e.message });
      }
    }

    // Termination: server says no next page, or returned fewer than asked.
    if (!body.next_empid || rows.length === 0 || rows.length < PAGE_SIZE) break;
    afterId = String(body.next_empid);
  }

  // Update cursor for next incremental sync.
  await settings.update({
    hrmsLastSyncDatetime: lastServerSync ? new Date(lastServerSync) : new Date(),
    hrmsLastSyncedCount: stats.inserted + stats.updated,
    hrmsLastSyncedAt: new Date(),
    hrmsLastSyncError: null,
  });

  logger.info?.('HRMS sync complete', { organizationId, ...stats });
  return stats;
}

/**
 * Nightly cron handler — sync every org that has an HRMS URL configured.
 * Failures on one org don't stop the others.
 */
async function syncForAllConfiguredOrgs() {
  const { Organization } = require('../models');
  const { effectiveFlags } = require('../utils/featureFlags');
  const candidates = await OrganizationSettings.findAll({
    where: { hrmsApiUrl: { [Op.ne]: null } },
    attributes: ['organizationId', 'hrmsApiUrl'],
  });
  // Per-tenant feature gate — skip tenants whose plan/override has hrmsSync
  // disabled so we don't poll their HRMS endpoint at all. Logs stay clean.
  const orgs = [];
  for (const s of candidates) {
    const org = await Organization.findByPk(s.organizationId);
    if (effectiveFlags(org).hrmsSync) orgs.push(s);
  }
  let totalInserted = 0;
  let totalUpdated = 0;
  let totalErrors = 0;
  for (const s of orgs) {
    try {
      const r = await syncForOrg(s.organizationId);
      totalInserted += r.inserted;
      totalUpdated += r.updated;
      if (r.error) totalErrors++;
    } catch (e) {
      totalErrors++;
      logger.error?.('HRMS sync failed for org', { organizationId: s.organizationId, error: e.message });
    }
  }
  return { orgsProcessed: orgs.length, inserted: totalInserted, updated: totalUpdated, errors: totalErrors };
}

module.exports = {
  syncForOrg,
  syncForAllConfiguredOrgs,
  upsertOne,
  mapHrmsRowToContact,
  HRMS_FIELDS,
  HRMS_EXCEL_HEADERS,
  // Re-export the encrypt helper so the settings update path can reuse it
  // without each caller importing the encryption module separately.
  encrypt,
};
