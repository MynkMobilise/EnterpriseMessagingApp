const { ApiKey, ApiKeyUsageLog } = require('../models');
const { NotFoundError, AppError, AuthenticationError } = require('../utils/errorTypes');
const { generateApiKey, hashKey, verifyApiKeyHash } = require('../utils/encryption');

class ApiKeyService {
  /**
   * Create new API key
   */
  async create(organizationId, createdBy, data) {
    const { name, environment, scopes, rateLimitPerMinute, rateLimitPerDay, expiresAt, description, allowedIps } = data;

    // Generate API key
    const prefix = environment === 'production' ? 'sk_live_' : environment === 'staging' ? 'sk_staging_' : 'sk_test_';
    const { key, keyHash, keyHint, keyPrefix } = generateApiKey(prefix);

    const apiKey = await ApiKey.create({
      organizationId,
      createdBy,
      name,
      keyPrefix,
      keyHash,
      keyHint,
      environment,
      scopes: scopes || [],
      rateLimitPerMinute: rateLimitPerMinute || 60,
      rateLimitPerDay: rateLimitPerDay || 10000,
      expiresAt,
      description,
      allowedIps: allowedIps || [],
      status: 'active',
    });

    // Return key only once (it won't be stored in plain text)
    return {
      apiKey: apiKey.toJSON(),
      key, // Only returned on creation
    };
  }

  /**
   * Validate API key
   */
  async validateApiKey(key) {
    if (!key || !key.startsWith('sk_')) {
      throw new AuthenticationError('Invalid API key format');
    }

    // Extract prefix and find matching keys
    const prefix = key.substring(0, key.indexOf('_', 3) + 1) || key.substring(0, 8);
    const keyHint = key.substring(key.length - 4);

    // Find potential matches
    const potentialKeys = await ApiKey.findAll({
      where: {
        keyPrefix: prefix,
        keyHint,
        status: 'active',
      },
    });

    // Verify hash for each potential key
    for (const apiKey of potentialKeys) {
      if (verifyApiKeyHash(key, apiKey.keyHash)) {
        // Check expiration
        if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
          throw new AuthenticationError('API key has expired');
        }

        // Update last used
        await apiKey.update({
          lastUsedAt: new Date(),
          totalRequests: (apiKey.totalRequests || 0) + 1,
        });

        return apiKey;
      }
    }

    throw new AuthenticationError('Invalid API key');
  }

  /**
   * List API keys for organization
   */
  async list(organizationId, filters = {}) {
    const { environment, status } = filters;

    const where = { organizationId };
    if (environment) where.environment = environment;
    if (status) where.status = status;

    const apiKeys = await ApiKey.findAll({
      where,
      order: [['created_at', 'DESC']],
    });

    // Remove sensitive data
    return apiKeys.map(key => {
      const keyObj = key.toJSON();
      delete keyObj.keyHash;
      return keyObj;
    });
  }

  /**
   * Get API key by ID
   */
  async getById(id, organizationId) {
    const apiKey = await ApiKey.findOne({
      where: { id, organizationId },
    });

    if (!apiKey) {
      throw new NotFoundError('API key');
    }

    const keyObj = apiKey.toJSON();
    delete keyObj.keyHash;
    return keyObj;
  }

  /**
   * Revoke API key
   */
  async revoke(id, organizationId, revokedBy, reason) {
    const apiKey = await ApiKey.findOne({
      where: { id, organizationId },
    });

    if (!apiKey) {
      throw new NotFoundError('API key');
    }

    await apiKey.update({
      status: 'revoked',
      revokedAt: new Date(),
      revokedBy,
      revokedReason: reason,
    });

    return apiKey.toJSON();
  }

  /**
   * Log API key usage
   */
  async logUsage(apiKeyId, data) {
    const { endpoint, method, statusCode, ipAddress, userAgent, requestSizeBytes, responseSizeBytes, responseTimeMs } = data;

    await ApiKeyUsageLog.create({
      apiKeyId,
      endpoint,
      method,
      statusCode,
      ipAddress,
      userAgent,
      requestSizeBytes,
      responseSizeBytes,
      responseTimeMs,
    });
  }

  /**
   * Check rate limit for API key (in-memory)
   */
  async checkRateLimit(apiKeyId, limits) {
    const { rateLimitPerMinute, rateLimitPerDay } = limits;

    // In-memory rate limit store (shared with middleware)
    // For service-level rate limiting, we'll use a separate store
    if (!this._rateLimitStore) {
      this._rateLimitStore = new Map();
      
      // Cleanup expired entries every minute
      setInterval(() => {
        const now = Date.now();
        for (const [key, value] of this._rateLimitStore.entries()) {
          if (value.resetTime < now) {
            this._rateLimitStore.delete(key);
          }
        }
      }, 60000);
    }

    const now = Date.now();
    const minuteWindow = Math.floor(now / 60000);
    const dayWindow = Math.floor(now / 86400000);

    const minuteKey = `rate_limit:api_key:${apiKeyId}:minute:${minuteWindow}`;
    const dayKey = `rate_limit:api_key:${apiKeyId}:day:${dayWindow}`;

    // Get or create minute counter
    let minuteCounter = this._rateLimitStore.get(minuteKey);
    if (!minuteCounter || minuteCounter.resetTime < now) {
      minuteCounter = {
        count: 0,
        resetTime: (minuteWindow + 1) * 60000, // Next minute
      };
      this._rateLimitStore.set(minuteKey, minuteCounter);
    }
    minuteCounter.count++;

    // Get or create day counter
    let dayCounter = this._rateLimitStore.get(dayKey);
    if (!dayCounter || dayCounter.resetTime < now) {
      dayCounter = {
        count: 0,
        resetTime: (dayWindow + 1) * 86400000, // Next day
      };
      this._rateLimitStore.set(dayKey, dayCounter);
    }
    dayCounter.count++;

    if (minuteCounter.count > rateLimitPerMinute) {
      throw new AppError('Rate limit exceeded (per minute)', 429);
    }

    if (dayCounter.count > rateLimitPerDay) {
      throw new AppError('Rate limit exceeded (per day)', 429);
    }

    return {
      minuteCount: minuteCounter.count,
      dayCount: dayCounter.count,
      minuteRemaining: Math.max(0, rateLimitPerMinute - minuteCounter.count),
      dayRemaining: Math.max(0, rateLimitPerDay - dayCounter.count),
    };
  }
}

module.exports = new ApiKeyService();

