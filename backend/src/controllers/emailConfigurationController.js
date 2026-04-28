const emailConfigurationService = require('../services/emailConfigurationService');
const { getPaginationMeta } = require('../utils/helpers');

class EmailConfigurationController {
  /**
   * List email configurations
   */
  async list(req, res, next) {
    try {
      const configurations = await emailConfigurationService.list(
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
   * Get email configuration by ID
   */
  async getById(req, res, next) {
    try {
      const configuration = await emailConfigurationService.getById(
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
   * Create email configuration
   */
  async create(req, res, next) {
    try {
      const configuration = await emailConfigurationService.create(
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
   * Update email configuration
   */
  async update(req, res, next) {
    try {
      const configuration = await emailConfigurationService.update(
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
   * Delete email configuration
   */
  async delete(req, res, next) {
    try {
      await emailConfigurationService.delete(
        req.params.id,
        req.organizationId
      );
      res.json({
        success: true,
        message: 'Email configuration deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get default email configuration
   */
  async getDefault(req, res, next) {
    try {
      const configuration = await emailConfigurationService.getDefault(
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
   * Get fallback email configuration
   */
  async getFallback(req, res, next) {
    try {
      const configuration = await emailConfigurationService.getFallback(
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
   * Test email configuration
   */
  async test(req, res, next) {
    try {
      const { testEmail } = req.body;
      const configurationId = req.params.id;

      if (!testEmail) {
        return res.status(400).json({
          success: false,
          error: { message: 'Test email address is required' },
        });
      }

      const result = await emailConfigurationService.test(
        configurationId,
        req.organizationId,
        testEmail
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new EmailConfigurationController();

