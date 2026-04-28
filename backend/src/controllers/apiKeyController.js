const apiKeyService = require('../services/apiKeyService');
const { NotFoundError } = require('../utils/errorTypes');

class ApiKeyController {
  /**
   * Create API key
   */
  async create(req, res, next) {
    try {
      const result = await apiKeyService.create(
        req.organizationId,
        req.user.id,
        req.body
      );
      res.status(201).json({
        success: true,
        data: result,
        message: 'API key created. Save the key securely - it will not be shown again.',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List API keys
   */
  async list(req, res, next) {
    try {
      const apiKeys = await apiKeyService.list(req.organizationId, req.query);
      res.json({
        success: true,
        data: apiKeys,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get API key by ID
   */
  async getById(req, res, next) {
    try {
      const apiKey = await apiKeyService.getById(req.params.id, req.organizationId);
      res.json({
        success: true,
        data: apiKey,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Revoke API key
   */
  async revoke(req, res, next) {
    try {
      const apiKey = await apiKeyService.revoke(
        req.params.id,
        req.organizationId,
        req.user.id,
        req.body.reason
      );
      res.json({
        success: true,
        data: apiKey,
        message: 'API key revoked successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get API key usage stats
   */
  async getUsageStats(req, res, next) {
    try {
      const apiKey = await apiKeyService.getById(req.params.id, req.organizationId);
      const { ApiKeyUsageLog } = require('../models');
      const { Op } = require('sequelize');

      const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();

      const logs = await ApiKeyUsageLog.findAll({
        where: {
          apiKeyId: apiKey.id,
          createdAt: {
            [Op.between]: [startDate, endDate],
          },
        },
        order: [['created_at', 'DESC']],
        limit: 100,
      });

      const stats = {
        totalRequests: apiKey.totalRequests,
        lastUsedAt: apiKey.lastUsedAt,
        lastUsedIp: apiKey.lastUsedIp,
        recentLogs: logs,
      };

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ApiKeyController();


