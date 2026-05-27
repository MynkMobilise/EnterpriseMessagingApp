/**
 * Feature-flag resolver. Single source of truth for "is this feature on for
 * THIS organization right now?".
 *
 * Layers:
 *   1. Plan baseline    — PLAN_FEATURES[org.plan]  (in config/planFeatures.js)
 *   2. Tenant override  — org.featureOverrides     (JSON column)
 *
 * Deep-merge tenant overrides on top of the plan baseline. Object values
 * (e.g. `channels`) are merged shallowly inside; primitive values replace.
 *
 * Used by:
 *   - middleware/auth.js to populate req.featureFlags on every request.
 *   - hrmsSyncService.syncForAllConfiguredOrgs to skip disabled tenants.
 *   - messageService.send to refuse disabled channels.
 *   - routes via the requireFeature() middleware factory below.
 *   - super-admin features controller to compute "effective" payload.
 */

const { PLAN_FEATURES } = require('../config/planFeatures');
const { AuthorizationError } = require('./errorTypes');

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function deepMerge(base, override) {
  if (!isPlainObject(base)) return override;
  if (!isPlainObject(override)) return base;
  const out = { ...base };
  for (const [k, v] of Object.entries(override)) {
    if (isPlainObject(v) && isPlainObject(base[k])) {
      out[k] = deepMerge(base[k], v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

/**
 * Resolve the effective feature flags for an organization.
 * @param {Object} organization Sequelize Organization instance or plain row.
 * @returns {Object} Effective flags object (channels, hrmsSync, etc.).
 */
function effectiveFlags(organization) {
  if (!organization) return PLAN_FEATURES.starter;
  const plan = organization.plan || 'starter';
  const baseline = PLAN_FEATURES[plan] || PLAN_FEATURES.starter;
  const overrides = organization.featureOverrides || {};
  return deepMerge(baseline, overrides);
}

/**
 * Quick channel-enabled check. `channel` is one of whatsapp/sms/email/fcm.
 */
function isChannelEnabled(organization, channel) {
  const flags = effectiveFlags(organization);
  return !!(flags.channels && flags.channels[channel]);
}

/**
 * Dot-notation feature lookup, e.g. featureValue(org, 'channels.sms').
 */
function featureValue(organization, dottedKey) {
  const flags = effectiveFlags(organization);
  return dottedKey.split('.').reduce((acc, k) => (acc == null ? undefined : acc[k]), flags);
}

/**
 * Express middleware factory: refuses the request with 403 if the named
 * feature is not enabled for req.organization. Use AFTER the auth middleware
 * that populates req.organization and req.featureFlags.
 *
 *   router.get('/something', authenticate, requireFeature('liveChat'), handler);
 *   router.get('/sms-only',  authenticate, requireFeature('channels.sms'), handler);
 */
function requireFeature(dottedKey) {
  return (req, res, next) => {
    const flags = req.featureFlags || effectiveFlags(req.organization);
    const v = dottedKey.split('.').reduce((acc, k) => (acc == null ? undefined : acc[k]), flags);
    if (v) return next();
    return next(new AuthorizationError(
      `Feature not enabled for your organization: ${dottedKey}. Contact your administrator.`
    ));
  };
}

module.exports = {
  effectiveFlags,
  isChannelEnabled,
  featureValue,
  requireFeature,
};
