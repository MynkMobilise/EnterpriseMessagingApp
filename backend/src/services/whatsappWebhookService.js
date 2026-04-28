const axios = require('axios');
const crypto = require('crypto');
const { OrganizationSettings } = require('../models');
const metaGraphApiService = require('./metaGraphApiService');
const logger = require('../utils/logger');
const { AppError } = require('../utils/errorTypes');
const { decrypt } = require('../utils/encryption');

class WhatsAppWebhookService {
  /**
   * Generate secure webhook verify token
   */
  generateVerifyToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Configure webhook for WABA
   */
  async configureWebhook(wabaId, accessToken, webhookUrl, verifyToken) {
    try {
      // Subscribe app to WABA
      const subscribeResponse = await metaGraphApiService.makeRequest(
        `/${wabaId}/subscribed_apps`,
        accessToken,
        {
          method: 'POST',
          data: {
            subscribed_fields: [
              'messages',
              'message_status',
              'message_template_status_update',
              'account_update',
            ],
          },
        }
      );

      logger.info(`Subscribed to webhook events for WABA ${wabaId}`, {
        wabaId,
        subscribedFields: subscribeResponse.subscribed_fields,
      });

      // Configure webhook URL (this is done via Meta Business Manager, but we can verify)
      // The webhook URL is configured in Meta App settings, not via API
      // We can only verify it's configured correctly

      return {
        success: true,
        subscribedFields: subscribeResponse.subscribed_fields || [],
        webhookUrl,
        verifyToken,
      };
    } catch (error) {
      logger.error('Error configuring webhook:', error);
      throw new AppError(`Failed to configure webhook: ${error.message}`, 500);
    }
  }

  /**
   * Subscribe to webhook events
   */
  async subscribeToEvents(wabaId, accessToken, events = []) {
    try {
      const defaultEvents = [
        'messages',
        'message_status',
        'message_template_status_update',
        'account_update',
      ];

      const eventsToSubscribe = events.length > 0 ? events : defaultEvents;

      const response = await metaGraphApiService.makeRequest(
        `/${wabaId}/subscribed_apps`,
        accessToken,
        {
          method: 'POST',
          data: {
            subscribed_fields: eventsToSubscribe,
          },
        }
      );

      logger.info(`Subscribed to events for WABA ${wabaId}`, {
        wabaId,
        events: eventsToSubscribe,
      });

      return {
        success: true,
        subscribedFields: response.subscribed_fields || eventsToSubscribe,
      };
    } catch (error) {
      logger.error('Error subscribing to events:', error);
      throw new AppError(`Failed to subscribe to events: ${error.message}`, 500);
    }
  }

  /**
   * Verify webhook configuration
   */
  async verifyWebhookConfiguration(wabaId, accessToken) {
    try {
      // Get subscribed apps
      const response = await metaGraphApiService.makeRequest(
        `/${wabaId}/subscribed_apps`,
        accessToken,
        {
          params: {
            fields: 'subscribed_fields',
          },
        }
      );

      const subscribedFields = response.data?.[0]?.subscribed_fields || [];

      return {
        configured: subscribedFields.length > 0,
        subscribedFields,
      };
    } catch (error) {
      logger.error('Error verifying webhook configuration:', error);
      return {
        configured: false,
        subscribedFields: [],
        error: error.message,
      };
    }
  }

  /**
   * Auto-configure webhook after WABA linking
   */
  async autoConfigureWebhook(organizationId, wabaId, accessToken) {
    try {
      // Get or create organization settings
      let settings = await OrganizationSettings.findOne({
        where: { organizationId },
      });

      if (!settings) {
        throw new AppError('Organization settings not found', 404);
      }

      // Generate or use existing verify token
      let verifyToken = settings.whatsappWebhookVerifyToken;
      if (!verifyToken) {
        verifyToken = this.generateVerifyToken();
        await settings.update({
          whatsappWebhookVerifyToken: verifyToken,
        });
      }

      // Build webhook URL
      const baseUrl = process.env.BACKEND_URL || process.env.FRONTEND_URL || 'http://localhost:3003';
      const webhookUrl = `${baseUrl}/api/v1/webhooks/whatsapp`;

      // Configure webhook
      const result = await this.configureWebhook(wabaId, accessToken, webhookUrl, verifyToken);

      logger.info(`Webhook auto-configured for organization ${organizationId}`, {
        organizationId,
        wabaId,
        webhookUrl,
      });

      return result;
    } catch (error) {
      logger.error('Error auto-configuring webhook:', error);
      // Don't throw - webhook configuration is not critical for initial setup
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Check phone number quality rating
   */
  async checkPhoneNumberQuality(phoneNumberId, accessToken) {
    try {
      const response = await metaGraphApiService.makeRequest(
        `/${phoneNumberId}`,
        accessToken,
        {
          params: {
            fields: 'quality_rating,verified_name,code_verification_status',
          },
        }
      );

      return {
        qualityRating: response.quality_rating || 'UNKNOWN',
        verifiedName: response.verified_name || null,
        codeVerificationStatus: response.code_verification_status || 'UNKNOWN',
      };
    } catch (error) {
      logger.error('Error checking phone number quality:', error);
      return {
        qualityRating: 'UNKNOWN',
        verifiedName: null,
        codeVerificationStatus: 'UNKNOWN',
        error: error.message,
      };
    }
  }

  /**
   * Check business verification status
   */
  async checkBusinessVerificationStatus(businessId, accessToken) {
    try {
      const response = await metaGraphApiService.makeRequest(
        `/${businessId}`,
        accessToken,
        {
          params: {
            fields: 'verification_status',
          },
        }
      );

      return {
        verified: response.verification_status === 'verified',
        status: response.verification_status || 'unknown',
      };
    } catch (error) {
      logger.error('Error checking business verification:', error);
      return {
        verified: false,
        status: 'unknown',
        error: error.message,
      };
    }
  }
}

module.exports = new WhatsAppWebhookService();

