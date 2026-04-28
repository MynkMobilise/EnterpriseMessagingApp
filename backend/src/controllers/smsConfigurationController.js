const smsConfigurationService = require('../services/smsConfigurationService');
const { getPaginationMeta } = require('../utils/helpers');

class SmsConfigurationController {
  /**
   * List SMS configurations
   */
  async list(req, res, next) {
    try {
      const configurations = await smsConfigurationService.list(
        req.organizationId,
        req.query
      );
      res.json({
        success: true,
        data: configurations,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get SMS configuration by ID
   */
  async getById(req, res, next) {
    try {
      const configuration = await smsConfigurationService.getById(
        req.params.id,
        req.organizationId
      );
      res.json({
        success: true,
        data: configuration,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create SMS configuration
   */
  async create(req, res, next) {
    try {
      const configuration = await smsConfigurationService.create(
        req.organizationId,
        req.body
      );
      res.status(201).json({
        success: true,
        data: configuration,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update SMS configuration
   */
  async update(req, res, next) {
    try {
      const configuration = await smsConfigurationService.update(
        req.params.id,
        req.organizationId,
        req.body
      );
      res.json({
        success: true,
        data: configuration,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete SMS configuration
   */
  async delete(req, res, next) {
    try {
      await smsConfigurationService.delete(
        req.params.id,
        req.organizationId
      );
      res.json({
        success: true,
        message: 'SMS configuration deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get default SMS configuration
   */
  async getDefault(req, res, next) {
    try {
      const configuration = await smsConfigurationService.getDefault(
        req.organizationId
      );
      res.json({
        success: true,
        data: configuration,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get fallback SMS configuration
   */
  async getFallback(req, res, next) {
    try {
      const configuration = await smsConfigurationService.getFallback(
        req.organizationId
      );
      res.json({
        success: true,
        data: configuration,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new SmsConfigurationController();

