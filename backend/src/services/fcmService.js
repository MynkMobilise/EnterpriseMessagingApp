const axios = require('axios');
const { Message, OrganizationSettings } = require('../models');
const logger = require('../utils/logger');
const { decrypt } = require('../utils/encryption');
const traceLogService = require('./traceLogService');

class FCMService {
  /**
   * Send FCM notification
   */
  async sendMessage(message) {
    await traceLogService.logTrace(message.id, 'processing', {
      stage: 'fcm_service_entry',
      channel: 'fcm',
    }, { channel: 'fcm' });

    try {
      // Get organization settings
      const settings = await OrganizationSettings.findOne({
        where: { organizationId: message.organizationId },
      });

      if (!settings) {
        throw new Error('Organization settings not found');
      }

      await traceLogService.logTrace(message.id, 'processing', {
        stage: 'fcm_config_retrieved',
      }, { channel: 'fcm' });

      // Get FCM configuration from settings or customSettings
      const customSettings = settings.customSettings || {};
      const fcmServerKey = settings.fcmServerKeyEncrypted 
        ? decrypt(settings.fcmServerKeyEncrypted) 
        : (customSettings.fcmServerKey ? decrypt(customSettings.fcmServerKey) : null);
      
      const fcmProjectId = settings.fcmProjectId || customSettings.fcmProjectId;

      if (!fcmServerKey) {
        throw new Error('FCM server key not configured');
      }

      await traceLogService.logTrace(message.id, 'processing', {
        stage: 'fcm_server_key_decrypted',
        projectId: fcmProjectId,
      }, { channel: 'fcm' });

      // Prepare FCM payload
      const fcmPayload = {
        to: message.recipientFcmToken,
        notification: {
          title: message.subject || 'Notification',
          body: message.content,
        },
        data: {
          messageId: message.id,
          organizationId: message.organizationId,
          type: message.messageType || 'text',
          ...(message.templateId && { templateId: message.templateId }),
        },
        priority: message.priority === 'urgent' || message.priority === 'high' ? 'high' : 'normal',
      };

      // Add custom data if available
      if (message.variables && typeof message.variables === 'object') {
        Object.assign(fcmPayload.data, message.variables);
      }

      await traceLogService.logTrace(message.id, 'processing', {
        stage: 'fcm_payload_prepared',
        hasTemplate: !!message.templateId,
        priority: fcmPayload.priority,
      }, { channel: 'fcm' });

      const apiUrl = 'https://fcm.googleapis.com/fcm/send';
      const startTime = Date.now();

      // Log API request
      await traceLogService.logApiRequest(
        message.id,
        'fcm',
        apiUrl,
        'POST',
        {
          'Authorization': 'key=***',
          'Content-Type': 'application/json',
        },
        {
          to: message.recipientFcmToken.substring(0, 20) + '...',
          notification: fcmPayload.notification,
          priority: fcmPayload.priority,
        },
        'Firebase Cloud Messaging'
      );

      // Send FCM notification
      const response = await axios.post(
        apiUrl,
        fcmPayload,
        {
          headers: {
            'Authorization': `key=${fcmServerKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const duration = Date.now() - startTime;

      // Log API response
      await traceLogService.logApiResponse(
        message.id,
        'fcm',
        response.status,
        response.headers,
        response.data,
        duration,
        'Firebase Cloud Messaging'
      );

      if (response.data.success === 0 && response.data.results?.[0]?.error) {
        throw new Error(response.data.results[0].error);
      }

      const fcmMessageId = response.data.multicast_id?.toString() || response.data.message_id?.toString() || `fcm_${Date.now()}`;
      logger.info(`FCM notification sent: ${fcmMessageId} to ${message.recipientFcmToken}`);

      await traceLogService.logTrace(message.id, 'sent', {
        fcmMessageId,
        status: 'sent',
      }, { channel: 'fcm' });

      return {
        messageId: fcmMessageId,
        status: 'sent',
        providerResponse: response.data,
      };
    } catch (error) {
      await traceLogService.logError(message.id, 'fcm', error, {
        stage: 'fcm_send',
      }, 'Firebase Cloud Messaging');
      
      logger.error('FCM send error:', error);
      throw new Error(`FCM send failed: ${error.message}`);
    }
  }

  /**
   * Send bulk FCM notifications
   */
  async sendBulk(messages) {
    const results = [];
    for (const message of messages) {
      try {
        const result = await this.sendMessage(message);
        results.push({ success: true, messageId: message.id, result });
      } catch (error) {
        results.push({ success: false, messageId: message.id, error: error.message });
      }
    }
    return results;
  }

  /**
   * Send to multiple tokens (topic or device group)
   */
  async sendToMultiple(tokens, payload) {
    // FCM allows sending to multiple tokens using registration_ids
    const fcmPayload = {
      registration_ids: Array.isArray(tokens) ? tokens : [tokens],
      notification: payload.notification,
      data: payload.data,
      priority: payload.priority || 'normal',
    };

    // This would use the same send logic but with registration_ids
    // Implementation depends on FCM configuration
    return fcmPayload;
  }
}

module.exports = new FCMService();

