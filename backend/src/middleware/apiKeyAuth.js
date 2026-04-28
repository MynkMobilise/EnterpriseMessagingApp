const apiKeyService = require('../services/apiKeyService');
const { AuthenticationError } = require('../utils/errorTypes');

/**
 * Authenticate request using API key
 */
const authenticateApiKey = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');

    if (!apiKey) {
      return next(new AuthenticationError('API key is required'));
    }

    // Validate API key
    const keyData = await apiKeyService.validateApiKey(apiKey);

    // Check IP whitelist if configured
    if (keyData.allowedIps && keyData.allowedIps.length > 0) {
      const clientIp = req.ip || req.connection.remoteAddress;
      if (!keyData.allowedIps.includes(clientIp)) {
        return next(new AuthenticationError('IP address not allowed'));
      }
    }

    // Check rate limits
    await apiKeyService.checkRateLimit(keyData.id, {
      rateLimitPerMinute: keyData.rateLimitPerMinute,
      rateLimitPerDay: keyData.rateLimitPerDay,
    });

    // Attach API key data to request
    req.apiKey = keyData;
    req.organizationId = keyData.organizationId;

    // Log usage
    await apiKeyService.logUsage(keyData.id, {
      endpoint: req.path,
      method: req.method,
      statusCode: 200,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      requestSizeBytes: JSON.stringify(req.body).length,
      responseTimeMs: 0, // Will be updated in response handler
    });

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  authenticateApiKey,
};


