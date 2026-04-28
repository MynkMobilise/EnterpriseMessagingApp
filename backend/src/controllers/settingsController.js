const settingsService = require('../services/settingsService');

class SettingsController {
  /**
   * Get organization settings
   */
  async getOrganizationSettings(req, res, next) {
    try {
      const settings = await settingsService.getOrganizationSettings(req.organizationId);
      res.json({
        success: true,
        data: settings,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update organization settings
   */
  async updateOrganizationSettings(req, res, next) {
    try {
      const settings = await settingsService.updateOrganizationSettings(
        req.organizationId,
        req.body
      );
      res.json({
        success: true,
        data: settings,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user preferences
   */
  async getUserPreferences(req, res, next) {
    try {
      const preferences = await settingsService.getUserPreferences(req.user.id);
      res.json({
        success: true,
        data: preferences,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(req, res, next) {
    try {
      const preferences = await settingsService.updateUserPreferences(
        req.user.id,
        req.body
      );
      res.json({
        success: true,
        data: preferences,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get available SMS providers (configured)
   */
  async getAvailableSmsProviders(req, res, next) {
    try {
      const providers = await settingsService.getAvailableSmsProviders(req.organizationId);
      res.json({
        success: true,
        data: providers,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get decrypted SMS API key (Auth Token)
   */
  async getDecryptedSmsApiKey(req, res, next) {
    try {
      const authToken = await settingsService.getDecryptedSmsApiKey(req.organizationId);
      res.json({
        success: true,
        data: {
          authToken: authToken || null,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Test WhatsApp connection
   */
  async testWhatsAppConnection(req, res, next) {
    try {
      const whatsappService = require('../services/whatsappService');
      const result = await whatsappService.testConnection(req.body);
      res.json({
        success: true,
        message: result.message,
        data: result.details,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get decrypted Custom SMS Provider API Key
   */
  async getDecryptedCustomSmsApiKey(req, res, next) {
    try {
      const apiKey = await settingsService.getDecryptedCustomSmsApiKey(req.organizationId);
      res.json({
        success: true,
        data: {
          apiKey: apiKey || null,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new SettingsController();


