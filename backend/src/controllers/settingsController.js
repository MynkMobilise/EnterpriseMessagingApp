const settingsService = require('../services/settingsService');
const ssoService = require('../services/ssoService');

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
      const { OrganizationSettings } = require('../models');
      const { decrypt, isEncrypted } = require('../utils/encryption');

      // Allow the frontend to "test with the saved token" — when the user has
      // existing credentials in DB and just clicks Test Connection without
      // re-pasting, fall back to whatever is already stored. Anything the
      // user explicitly typed in the form takes precedence over DB values.
      const credentials = { ...req.body };
      if (!credentials.whatsappAccessToken || !credentials.whatsappBusinessAccountId || !credentials.whatsappPhoneNumberId) {
        const stored = await OrganizationSettings.findOne({ where: { organizationId: req.organizationId } });
        if (stored) {
          if (!credentials.whatsappBusinessAccountId && stored.whatsappBusinessAccountId) {
            credentials.whatsappBusinessAccountId = stored.whatsappBusinessAccountId;
          }
          if (!credentials.whatsappPhoneNumberId && stored.whatsappPhoneNumberId) {
            credentials.whatsappPhoneNumberId = stored.whatsappPhoneNumberId;
          }
          if (!credentials.whatsappAccessToken && stored.whatsappAccessToken) {
            try {
              credentials.whatsappAccessToken = isEncrypted(stored.whatsappAccessToken)
                ? decrypt(stored.whatsappAccessToken)
                : stored.whatsappAccessToken;
            } catch (_) {
              // decryption failed (likely ENCRYPTION_KEY mismatch). Leave the
              // field empty so testConnection raises the clear "missing token"
              // error rather than silently testing with garbage.
            }
          }
        }
      }

      const result = await whatsappService.testConnection(credentials);
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

  // ─── SSO Integration endpoints ─────────────────────────────────────
  async getSsoConfig(req, res, next) {
    try {
      const { OrganizationSettings } = require('../models');
      const settings = await OrganizationSettings.findOne({ where: { organizationId: req.organizationId } });
      const { secret } = await ssoService.getOrCreateSecret(req.organizationId);
      res.json({
        success: true,
        data: {
          ssoEnabled: settings?.ssoEnabled || false,
          ssoDefaultRole: settings?.ssoDefaultRole || 'operator',
          ssoSecret: secret,
          exchangeEndpoint: '/api/v1/auth/sso/exchange',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async updateSsoConfig(req, res, next) {
    try {
      const { ssoEnabled, ssoDefaultRole } = req.body;
      const updates = {};
      if (typeof ssoEnabled === 'boolean') {
        const r = await ssoService.setEnabled(req.organizationId, ssoEnabled);
        Object.assign(updates, r);
      }
      if (ssoDefaultRole) {
        const r = await ssoService.setDefaultRole(req.organizationId, ssoDefaultRole);
        Object.assign(updates, r);
      }
      res.json({ success: true, data: updates });
    } catch (error) {
      next(error);
    }
  }

  async rotateSsoSecret(req, res, next) {
    try {
      const { secret } = await ssoService.rotateSecret(req.organizationId);
      res.json({ success: true, data: { ssoSecret: secret } });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new SettingsController();


