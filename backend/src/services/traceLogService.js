/**
 * Trace Log Service
 * Provides comprehensive logging for message processing from submission to delivery
 */

const { MessageEvent } = require('../models');
const logger = require('../utils/logger');

class TraceLogService {
  /**
   * Log a trace event
   * @param {string} messageId - Message ID
   * @param {string} eventType - Event type (queued, processing, api_request, etc.)
   * @param {Object} eventData - Event data to store
   * @param {Object} metadata - Additional metadata (channel, provider, etc.)
   */
  async logTrace(messageId, eventType, eventData = {}, metadata = {}) {
    try {
      const traceData = {
        ...eventData,
        timestamp: new Date().toISOString(),
        ...metadata,
      };

      await MessageEvent.create({
        messageId,
        eventType,
        eventData: traceData,
        occurredAt: new Date(),
      });

      logger.debug(`Trace log: ${eventType} for message ${messageId}`);
    } catch (error) {
      logger.error(`Failed to log trace event: ${error.message}`);
      // Don't throw - logging failures shouldn't break message processing
    }
  }

  /**
   * Log API request
   * @param {string} messageId - Message ID
   * @param {string} channel - Message channel (sms, whatsapp, email, fcm)
   * @param {string} url - API URL
   * @param {string} method - HTTP method
   * @param {Object} headers - Request headers (will be masked)
   * @param {Object|string} body - Request body/params (will be masked)
   * @param {string} provider - Provider name
   */
  async logApiRequest(messageId, channel, url, method, headers = {}, body = {}, provider = 'unknown') {
    const maskedHeaders = this.maskSensitiveData(headers);
    const maskedBody = this.maskSensitiveData(body);
    const maskedUrl = this.maskSensitiveInUrl(url);

    await this.logTrace(
      messageId,
      'api_request',
      {
        url: maskedUrl,
        method: method.toUpperCase(),
        headers: maskedHeaders,
        body: maskedBody,
      },
      {
        channel,
        provider,
        stage: 'api_request',
      }
    );
  }

  /**
   * Log API response
   * @param {string} messageId - Message ID
   * @param {string} channel - Message channel
   * @param {number} status - HTTP status code
   * @param {Object} headers - Response headers
   * @param {Object|string} body - Response body
   * @param {number} duration - Request duration in ms
   * @param {string} provider - Provider name
   */
  async logApiResponse(messageId, channel, status, headers = {}, body = {}, duration = 0, provider = 'unknown') {
    const maskedHeaders = this.maskSensitiveData(headers);
    const maskedBody = this.maskSensitiveData(body);

    await this.logTrace(
      messageId,
      'api_response',
      {
        status,
        headers: maskedHeaders,
        body: maskedBody,
        duration,
        success: status >= 200 && status < 300,
      },
      {
        channel,
        provider,
        stage: 'api_response',
      }
    );
  }

  /**
   * Log error
   * @param {string} messageId - Message ID
   * @param {string} channel - Message channel
   * @param {Error} error - Error object
   * @param {Object} context - Additional context
   * @param {string} provider - Provider name
   */
  async logError(messageId, channel, error, context = {}, provider = 'unknown') {
    await this.logTrace(
      messageId,
      'failed',
      {
        error: {
          message: error.message,
          name: error.name,
          stack: error.stack,
          code: error.code,
          response: error.response ? {
            status: error.response.status,
            statusText: error.response.statusText,
            data: error.response.data,
          } : undefined,
        },
        context,
      },
      {
        channel,
        provider,
        stage: 'error',
      }
    );
  }

  /**
   * Log status change
   * @param {string} messageId - Message ID
   * @param {string} channel - Message channel
   * @param {string} fromStatus - Previous status
   * @param {string} toStatus - New status
   * @param {string} reason - Reason for change
   */
  async logStatusChange(messageId, channel, fromStatus, toStatus, reason = '') {
    await this.logTrace(
      messageId,
      'delivery_update',
      {
        fromStatus,
        toStatus,
        reason,
      },
      {
        channel,
        stage: 'status_change',
      }
    );
  }

  /**
   * Log provider selection
   * @param {string} messageId - Message ID
   * @param {string} channel - Message channel
   * @param {string} provider - Provider name
   * @param {string} providerType - Provider type (default, fallback, legacy)
   * @param {Object} config - Provider configuration (masked)
   */
  async logProviderSelection(messageId, channel, provider, providerType, config = {}) {
    const maskedConfig = this.maskSensitiveData(config);

    await this.logTrace(
      messageId,
      'provider_selected',
      {
        provider,
        providerType,
        config: maskedConfig,
      },
      {
        channel,
        stage: 'provider_selection',
      }
    );
  }

  /**
   * Log fallback attempt
   * @param {string} messageId - Message ID
   * @param {string} channel - Message channel
   * @param {string} previousProvider - Previous provider that failed
   * @param {string} fallbackProvider - Fallback provider being tried
   * @param {string} reason - Reason for fallback
   */
  async logFallbackAttempt(messageId, channel, previousProvider, fallbackProvider, reason) {
    await this.logTrace(
      messageId,
      'fallback_attempted',
      {
        previousProvider,
        fallbackProvider,
        reason,
      },
      {
        channel,
        stage: 'fallback',
      }
    );
  }

  /**
   * Mask sensitive data in objects
   * @param {Object|string} data - Data to mask
   * @returns {Object|string} - Masked data
   */
  maskSensitiveData(data) {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sensitiveKeys = [
      'key',
      'apiKey',
      'api_key',
      'password',
      'token',
      'accessToken',
      'access_token',
      'secret',
      'secretKey',
      'secret_key',
      'authToken',
      'auth_token',
      'authorization',
      'Authorization',
    ];

    const masked = { ...data };

    for (const key in masked) {
      const lowerKey = key.toLowerCase();
      if (sensitiveKeys.some(sk => lowerKey.includes(sk.toLowerCase()))) {
        const value = String(masked[key]);
        if (value.length > 4) {
          masked[key] = value.substring(0, 4) + '***' + value.substring(value.length - 4);
        } else {
          masked[key] = '***';
        }
      } else if (typeof masked[key] === 'object' && masked[key] !== null) {
        masked[key] = this.maskSensitiveData(masked[key]);
      }
    }

    return masked;
  }

  /**
   * Mask sensitive data in URL
   * @param {string} url - URL to mask
   * @returns {string} - Masked URL
   */
  maskSensitiveInUrl(url) {
    if (!url || typeof url !== 'string') {
      return url;
    }

    try {
      const urlObj = new URL(url);
      const params = new URLSearchParams(urlObj.search);
      
      const sensitiveParams = ['key', 'apiKey', 'token', 'password', 'secret'];
      sensitiveParams.forEach(param => {
        if (params.has(param)) {
          const value = params.get(param);
          if (value && value.length > 4) {
            params.set(param, value.substring(0, 4) + '***' + value.substring(value.length - 4));
          } else {
            params.set(param, '***');
          }
        }
      });

      urlObj.search = params.toString();
      return urlObj.toString();
    } catch (e) {
      // If URL parsing fails, do simple string replacement
      return url.replace(/([?&])(key|apiKey|token|password|secret)=[^&]*/gi, '$1$2=***');
    }
  }

  /**
   * Format trace logs for channel-specific display
   * @param {Object} message - Message object
   * @param {Array} events - MessageEvent array
   * @param {string} channel - Message channel
   * @returns {Object} - Formatted trace logs
   */
  formatTraceLogsForChannel(message, events, channel) {
    const timeline = events.map(event => ({
      id: event.id,
      type: event.eventType,
      timestamp: event.occurredAt,
      data: event.eventData || {},
    })).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    const channelSpecific = this.extractChannelSpecificInfo(message, events, channel);

    return {
      timeline,
      channelSpecific,
      summary: this.generateSummary(timeline, channel),
    };
  }

  /**
   * Extract channel-specific information
   * @param {Object} message - Message object
   * @param {Array} events - MessageEvent array
   * @param {string} channel - Message channel
   * @returns {Object} - Channel-specific information
   */
  extractChannelSpecificInfo(message, events, channel) {
    const info = {
      provider: null,
      apiCalls: [],
      errors: [],
      statusChanges: [],
    };

    events.forEach(event => {
      const data = event.eventData || {};

      if (event.eventType === 'provider_selected') {
        info.provider = {
          name: data.provider,
          type: data.providerType,
          selectedAt: event.occurredAt,
        };
      }

      if (event.eventType === 'api_request') {
        info.apiCalls.push({
          timestamp: event.occurredAt,
          url: data.url,
          method: data.method,
          provider: data.provider,
        });
      }

      if (event.eventType === 'api_response') {
        const lastApiCall = info.apiCalls[info.apiCalls.length - 1];
        if (lastApiCall) {
          lastApiCall.response = {
            status: data.status,
            duration: data.duration,
            success: data.success,
            timestamp: event.occurredAt,
          };
        }
      }

      if (event.eventType === 'failed' || event.eventType === 'error') {
        info.errors.push({
          timestamp: event.occurredAt,
          error: data.error,
          context: data.context,
        });
      }

      if (event.eventType === 'delivery_update') {
        info.statusChanges.push({
          timestamp: event.occurredAt,
          from: data.fromStatus,
          to: data.toStatus,
          reason: data.reason,
        });
      }
    });

    // Channel-specific extraction
    switch (channel) {
      case 'sms':
        return {
          ...info,
          templateId: message.template?.smsTemplateId || null,
          senderId: message.metadata?.senderId || null,
        };
      case 'whatsapp':
        return {
          ...info,
          wamid: message.externalMessageId || null,
          templateName: message.template?.name || null,
          webhookEvents: events.filter(e => e.eventType === 'delivery_update' || e.eventType === 'read'),
        };
      case 'email':
        return {
          ...info,
          from: message.metadata?.from || null,
          to: message.recipientEmail,
          subject: message.subject,
          emailProvider: info.provider?.name || null,
        };
      case 'fcm':
        return {
          ...info,
          fcmMessageId: message.externalMessageId || null,
          projectId: message.metadata?.projectId || null,
        };
      default:
        return info;
    }
  }

  /**
   * Generate summary from timeline
   * @param {Array} timeline - Timeline events
   * @param {string} channel - Message channel
   * @returns {Object} - Summary information
   */
  generateSummary(timeline, channel) {
    const summary = {
      totalEvents: timeline.length,
      stages: {
        submission: timeline.find(e => e.type === 'queued'),
        processing: timeline.find(e => e.type === 'processing'),
        apiCall: timeline.find(e => e.type === 'api_request'),
        delivery: timeline.find(e => ['delivered', 'read', 'sent'].includes(e.type)),
        failure: timeline.find(e => e.type === 'failed'),
      },
      duration: null,
    };

    const firstEvent = timeline[0];
    const lastEvent = timeline[timeline.length - 1];

    if (firstEvent && lastEvent) {
      summary.duration = new Date(lastEvent.timestamp) - new Date(firstEvent.timestamp);
    }

    return summary;
  }
}

module.exports = new TraceLogService();

