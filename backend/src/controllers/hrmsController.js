/**
 * HRMS controller — three endpoints:
 *   GET   /contacts/hrms/config       → return current HRMS config (no secret)
 *   PUT   /contacts/hrms/config       → save URL + optional auth header
 *   POST  /contacts/hrms/sync         → manual trigger; reuses the same path
 *                                       the nightly cron uses.
 *   GET   /contacts/hrms/template.csv → download blank Excel/CSV template
 *                                       whose headers match the API JSON.
 */
const hrmsSyncService = require('../services/hrmsSyncService');
const { OrganizationSettings } = require('../models');
const { encrypt, isEncrypted } = require('../utils/encryption');

async function getConfig(req, res, next) {
  try {
    const settings = await OrganizationSettings.findOne({
      where: { organizationId: req.organizationId },
    });
    res.json({
      success: true,
      data: {
        hrmsApiUrl: settings?.hrmsApiUrl || '',
        hrmsApiAuthHeaderName: settings?.hrmsApiAuthHeaderName || '',
        // Never echo the secret back.
        hrmsApiAuthHeaderValueSet: !!settings?.hrmsApiAuthHeaderValue,
        hrmsLastSyncDatetime: settings?.hrmsLastSyncDatetime || null,
        hrmsLastSyncedCount: settings?.hrmsLastSyncedCount || 0,
        hrmsLastSyncedAt: settings?.hrmsLastSyncedAt || null,
        hrmsLastSyncError: settings?.hrmsLastSyncError || null,
      },
    });
  } catch (e) {
    next(e);
  }
}

async function updateConfig(req, res, next) {
  try {
    const { hrmsApiUrl, hrmsApiAuthHeaderName, hrmsApiAuthHeaderValue, clearAuth } = req.body || {};
    let settings = await OrganizationSettings.findOne({
      where: { organizationId: req.organizationId },
    });
    if (!settings) {
      settings = await OrganizationSettings.create({ organizationId: req.organizationId });
    }
    const patch = {};
    if (hrmsApiUrl !== undefined) patch.hrmsApiUrl = hrmsApiUrl?.trim() || null;
    if (hrmsApiAuthHeaderName !== undefined) {
      patch.hrmsApiAuthHeaderName = hrmsApiAuthHeaderName?.trim() || null;
    }
    if (clearAuth) {
      patch.hrmsApiAuthHeaderName = null;
      patch.hrmsApiAuthHeaderValue = null;
    } else if (hrmsApiAuthHeaderValue) {
      // Encrypt before storage. If already encrypted (re-sent), pass through.
      patch.hrmsApiAuthHeaderValue = isEncrypted(hrmsApiAuthHeaderValue)
        ? hrmsApiAuthHeaderValue
        : encrypt(hrmsApiAuthHeaderValue);
    }
    await settings.update(patch);
    res.json({ success: true, message: 'HRMS configuration saved' });
  } catch (e) {
    next(e);
  }
}

async function syncNow(req, res, next) {
  try {
    const result = await hrmsSyncService.syncForOrg(req.organizationId);
    if (result.error) {
      return res.status(400).json({ success: false, error: { message: result.error }, data: result });
    }
    res.json({
      success: true,
      data: result,
      message: `Synced ${result.inserted} new, ${result.updated} updated across ${result.pages} page(s)`,
    });
  } catch (e) {
    next(e);
  }
}

/**
 * GET /contacts/hrms/template.csv — returns a blank CSV with the canonical
 * HRMS column headers. Customer fills it in and re-uploads via the existing
 * /contacts/import endpoint.
 */
async function downloadTemplate(req, res, next) {
  try {
    const headers = hrmsSyncService.HRMS_EXCEL_HEADERS;
    const csv = headers.join(',') + '\r\n';
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="hrms-contacts-template.csv"');
    res.send(csv);
  } catch (e) {
    next(e);
  }
}

module.exports = {
  getConfig,
  updateConfig,
  syncNow,
  downloadTemplate,
};
