/**
 * Cache utility - No-op implementation (Redis removed)
 * Kept for backward compatibility in case any code still references it
 */

/**
 * Cache key naming conventions (kept for reference)
 */
const CacheKeys = {
  organizationSettings: (orgId) => `org_settings:${orgId}`,
  userPermissions: (userId) => `user_permissions:${userId}`,
  template: (templateId) => `template:${templateId}`,
  apiKey: (keyId) => `api_key:${keyId}`,
  messageStatus: (messageId) => `message_status:${messageId}`,
  pendingApprovals: (orgId) => `pending_approvals:${orgId}`,
};

/**
 * Cache TTL in seconds (kept for reference)
 */
const CacheTTL = {
  ORGANIZATION_SETTINGS: 3600, // 1 hour
  USER_PERMISSIONS: 1800, // 30 minutes
  TEMPLATE: 900, // 15 minutes
  API_KEY: 300, // 5 minutes
  MESSAGE_STATUS: 600, // 10 minutes
  PENDING_APPROVALS: 60, // 1 minute
};

/**
 * Get value from cache (no-op - always returns null)
 * @param {string} key - Cache key
 * @returns {Promise<null>} Always returns null
 */
const get = async (key) => {
  return null;
};

/**
 * Set value in cache (no-op)
 * @param {string} key - Cache key
 * @param {*} value - Value to cache
 * @param {number} ttlSeconds - TTL in seconds (optional)
 * @returns {Promise<boolean>} Always returns false
 */
const set = async (key, value, ttlSeconds = null) => {
  return false;
};

/**
 * Delete key from cache (no-op)
 * @param {string} key - Cache key
 * @returns {Promise<boolean>} Always returns false
 */
const del = async (key) => {
  return false;
};

/**
 * Delete multiple keys matching pattern (no-op)
 * @param {string} pattern - Key pattern
 * @returns {Promise<number>} Always returns 0
 */
const delPattern = async (pattern) => {
  return 0;
};

/**
 * Check if key exists in cache (no-op)
 * @param {string} key - Cache key
 * @returns {Promise<boolean>} Always returns false
 */
const exists = async (key) => {
  return false;
};

/**
 * Invalidate organization settings cache (no-op)
 * @param {string} orgId - Organization ID
 * @returns {Promise<boolean>} Always returns false
 */
const invalidateOrgSettings = async (orgId) => {
  return false;
};

/**
 * Invalidate user permissions cache (no-op)
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} Always returns false
 */
const invalidateUserPermissions = async (userId) => {
  return false;
};

/**
 * Invalidate template cache (no-op)
 * @param {string} templateId - Template ID
 * @returns {Promise<boolean>} Always returns false
 */
const invalidateTemplate = async (templateId) => {
  return false;
};

/**
 * Get or set cache value (cache-aside pattern) - Always fetches
 * @param {string} key - Cache key
 * @param {Function} fetchFn - Function to fetch value
 * @param {number} ttlSeconds - TTL in seconds (ignored)
 * @returns {Promise<*>} Always returns fetched value
 */
const getOrSet = async (key, fetchFn, ttlSeconds = null) => {
  // Always fetch from source (no caching)
  return await fetchFn();
};

module.exports = {
  CacheKeys,
  CacheTTL,
  get,
  set,
  del,
  delPattern,
  exists,
  invalidateOrgSettings,
  invalidateUserPermissions,
  invalidateTemplate,
  getOrSet,
};
