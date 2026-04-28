const axios = require('axios');
const { Message, OrganizationSettings } = require('../models');
const logger = require('../utils/logger');
const { decrypt, isEncrypted } = require('../utils/encryption');
const smsConfigurationService = require('./smsConfigurationService');
const traceLogService = require('./traceLogService');

class SMSService {
  /**
   * Send SMS message with default and fallback support
   */
  async sendMessage(message) {
    await traceLogService.logTrace(message.id, 'processing', {
      stage: 'sms_service_entry',
      channel: 'sms',
    }, { channel: 'sms' });

    let lastError = null;
    let lastProvider = null;
    
    // Try default configuration first
    try {
      const defaultConfig = await smsConfigurationService.getDefault(message.organizationId);
      if (defaultConfig) {
        await traceLogService.logProviderSelection(
          message.id,
          'sms',
          defaultConfig.name || 'default',
          'default',
          { provider: defaultConfig.provider }
        );
        try {
          return await this.sendWithConfiguration(message, defaultConfig);
        } catch (error) {
          lastError = error;
          lastProvider = defaultConfig.name || 'default';
          await traceLogService.logError(message.id, 'sms', error, {
            provider: defaultConfig.name,
            providerType: 'default',
          }, defaultConfig.name || 'default');
          logger.warn(`Failed to send SMS with default configuration: ${error.message}`);
          // Continue to try fallback
        }
      }
    } catch (error) {
      logger.warn(`No default SMS configuration found: ${error.message}`);
    }

    // Try fallback configuration
    try {
      const fallbackConfig = await smsConfigurationService.getFallback(message.organizationId);
      if (fallbackConfig) {
        await traceLogService.logFallbackAttempt(
          message.id,
          'sms',
          lastProvider || 'default',
          fallbackConfig.name || 'fallback',
          lastError?.message || 'Default provider failed'
        );
        await traceLogService.logProviderSelection(
          message.id,
          'sms',
          fallbackConfig.name || 'fallback',
          'fallback',
          { provider: fallbackConfig.provider }
        );
        try {
          logger.info(`Attempting to send SMS with fallback configuration: ${fallbackConfig.name}`);
          return await this.sendWithConfiguration(message, fallbackConfig);
        } catch (error) {
          lastError = error;
          lastProvider = fallbackConfig.name || 'fallback';
          await traceLogService.logError(message.id, 'sms', error, {
            provider: fallbackConfig.name,
            providerType: 'fallback',
          }, fallbackConfig.name || 'fallback');
          logger.error(`Failed to send SMS with fallback configuration: ${error.message}`);
        }
      }
    } catch (error) {
      logger.warn(`No fallback SMS configuration found: ${error.message}`);
    }

    // If both default and fallback failed, try legacy settings
    try {
      await traceLogService.logFallbackAttempt(
        message.id,
        'sms',
        lastProvider || 'fallback',
        'legacy',
        lastError?.message || 'Fallback provider failed'
      );
      return await this.sendWithLegacySettings(message);
    } catch (error) {
      lastError = error;
      await traceLogService.logError(message.id, 'sms', error, {
        provider: 'legacy',
        providerType: 'legacy',
      }, 'legacy');
      logger.error(`Failed to send SMS with legacy settings: ${error.message}`);
    }

    // If all attempts failed, throw the last error
    throw new Error(`SMS send failed: ${lastError?.message || 'No SMS configuration available'}`);
  }

  /**
   * Send SMS with a specific configuration
   */
  async sendWithConfiguration(message, config) {
    if (config.status !== 'active') {
      throw new Error(`SMS configuration "${config.name}" is not active`);
    }

    // Route to appropriate provider
    switch (config.provider) {
      case 'twilio':
        return await this.sendViaTwilio(message, config);
      case 'aws_sns':
        return await this.sendViaAWSSNS(message, config);
      case 'nexmo':
        return await this.sendViaVonage(message, config);
      case 'other':
        return await this.sendViaCustomProvider(message, config);
      default:
        throw new Error(`Unsupported SMS provider: ${config.provider}`);
    }
  }

  /**
   * Send SMS with legacy organization settings (backward compatibility)
   */
  async sendWithLegacySettings(message) {
    // Get organization settings
    const settings = await OrganizationSettings.findOne({
      where: { organizationId: message.organizationId },
    });

    if (!settings || !settings.smsProvider) {
      throw new Error('SMS not configured for this organization');
    }

    // Route to appropriate provider
    switch (settings.smsProvider) {
      case 'twilio':
        return await this.sendViaTwilio(message, settings);
      case 'aws_sns':
        return await this.sendViaAWSSNS(message, settings);
      case 'other':
        // Handle custom provider from legacy settings
        return await this.sendViaCustomProviderFromLegacySettings(message, settings);
      default:
        throw new Error(`Unsupported SMS provider: ${settings.smsProvider}`);
    }
  }

  /**
   * Send via Custom Provider using legacy organization settings
   */
  async sendViaCustomProviderFromLegacySettings(message, settings) {
    const customSettings = settings.customSettings || {};
    const apiUrl = customSettings.customApiUrl;
    const apiUser = customSettings.customApiUser;
    let apiKey = customSettings.customApiKey;
    const entityId = customSettings.customEntityId;
    const accUsage = customSettings.customAccUsage || '1';
    const senderId = settings.smsSenderId;

    // Validate required fields
    if (!apiUrl) {
      throw new Error('Custom SMS provider API URL not configured');
    }
    if (!apiUser) {
      throw new Error('Custom SMS provider API username not configured');
    }
    if (!apiKey) {
      throw new Error('Custom SMS provider API key not configured');
    }
    if (!entityId) {
      throw new Error('Custom SMS provider Entity ID (PE ID) not configured');
    }
    if (!senderId) {
      throw new Error('Custom SMS provider Sender ID not configured');
    }

    // Decrypt API key if it's encrypted
    if (isEncrypted(apiKey)) {
      try {
        const decryptedKey = decrypt(apiKey);
        // Validate decrypted key doesn't contain ':' (encrypted format indicator)
        if (decryptedKey.includes(':')) {
          throw new Error('Decrypted API key still contains encryption format indicator. Decryption may have failed.');
        }
        apiKey = decryptedKey;
        logger.info(`Successfully decrypted custom provider API key (format: ${apiKey.substring(0, 4)}...)`);
      } catch (error) {
        logger.error(`Failed to decrypt custom provider API key: ${error.message}`);
        // Provide a helpful error message
        const errorMessage = error.message.includes('bad decrypt') 
          ? 'API key decryption failed: The encryption key has changed or is missing. Please re-enter your API key in Settings > SMS API > Custom SMS Provider Configuration. The key will be re-encrypted with the current encryption key.'
          : `API key decryption failed: ${error.message}. Please re-enter your API key in Settings > SMS API > Custom SMS Provider Configuration.`;
        throw new Error(errorMessage);
      }
    } else {
      // Validate plain text key doesn't contain ':' (which would indicate it's encrypted)
      if (apiKey.includes(':')) {
        logger.warn('API key appears to be encrypted but isEncrypted() returned false. Attempting decryption anyway...');
        try {
          const decryptedKey = decrypt(apiKey);
          if (decryptedKey.includes(':')) {
            throw new Error('Decryption failed - key still contains encryption format');
          }
          apiKey = decryptedKey;
          logger.info('Successfully decrypted API key after fallback attempt');
        } catch (error) {
          const errorMessage = error.message.includes('bad decrypt')
            ? 'API key appears encrypted but decryption failed: The encryption key has changed or is missing. Please re-enter your API key in Settings > SMS API > Custom SMS Provider Configuration.'
            : `API key appears encrypted but decryption failed: ${error.message}. Please re-enter your API key in Settings > SMS API > Custom SMS Provider Configuration.`;
          throw new Error(errorMessage);
        }
      }
    }

    // Format message content
    const messageContent = message.content || message.body || '';
    logger.debug(`Message content before formatting: ${messageContent.substring(0, 100)}${messageContent.length > 100 ? '...' : ''}`);
    const formattedMessage = this.formatMessageForCustomProvider(messageContent);
    logger.debug(`Message content after formatting: ${formattedMessage.substring(0, 100)}${formattedMessage.length > 100 ? '...' : ''}`);

    // Get recipient phone number (remove any non-digit characters)
    let recipientPhone = message.recipientPhone || '';
    recipientPhone = recipientPhone.replace(/[^0-9]/g, '');
    
    // Normalize to 10 digits (remove country code if present)
    // Working API example uses 10 digits: 9599194330
    if (recipientPhone.length > 10) {
      // If starts with country code 91, remove it
      if (recipientPhone.startsWith('91') && recipientPhone.length === 12) {
        recipientPhone = recipientPhone.substring(2);
        logger.debug(`Removed country code 91 from phone number, normalized to: ${recipientPhone}`);
      } else {
        // Otherwise, take last 10 digits
        recipientPhone = recipientPhone.slice(-10);
        logger.debug(`Normalized phone number to last 10 digits: ${recipientPhone}`);
      }
    }
    
    logger.info(`Phone number normalized: original=${message.recipientPhone}, formatted=${recipientPhone}`);

    // Get template ID from template if message was sent using a template
    let templateId = null;
    if (message.templateId) {
      const { Template } = require('../models');
      const template = await Template.findByPk(message.templateId);
      if (template && template.smsTemplateId) {
        templateId = template.smsTemplateId;
      }
    }

    // Build GET request URL
    const urlParams = new URLSearchParams({
      user: apiUser,
      key: apiKey,
      mobile: recipientPhone,
      message: formattedMessage,
      senderid: senderId,
      accusage: accUsage,
      entityid: entityId,
    });

    if (templateId) {
      urlParams.append('tempid', templateId);
    }

    const requestUrl = `${apiUrl}?${urlParams.toString()}`;
    
    // Log final URL with masked API key for debugging
    const maskedUrl = requestUrl.replace(/key=[^&]+/, 'key=***');
    logger.info(`Sending SMS via custom provider (legacy settings) to ${recipientPhone}`);
    logger.debug(`Final request URL: ${maskedUrl}`);

    const startTime = Date.now();
    try {
      // Log API request
      await traceLogService.logApiRequest(
        message.id,
        'sms',
        requestUrl,
        'GET',
        {},
        {
          user: apiUser,
          mobile: recipientPhone,
          message: formattedMessage.substring(0, 50) + '...',
          senderid: senderId,
          accusage: accUsage,
          entityid: entityId,
          tempid: templateId || null,
        },
        'legacy_custom'
      );

      const response = await axios.get(requestUrl, {
        timeout: 30000,
        validateStatus: () => true, // Accept any status code
      });

      const duration = Date.now() - startTime;

      // Log API response
      await traceLogService.logApiResponse(
        message.id,
        'sms',
        response.status,
        response.headers,
        response.data,
        duration,
        'legacy_custom'
      );

      const responseText = typeof response.data === 'string' ? response.data.trim() : String(response.data || '').trim();
      logger.info(`SMS response from custom provider (legacy settings): ${responseText.substring(0, 100)}`);

      // Parse response to check for failure
      // Format: "fail,ErrorCode,0,0,0" or "success,..." or similar
      const responseLower = responseText.toLowerCase();
      if (responseLower.startsWith('fail') || responseLower.includes('invalid') || responseLower.includes('error')) {
        // Extract error message
        const errorParts = responseText.split(',');
        const errorMessage = errorParts.length > 1 ? errorParts[1] : 'SMS send failed';
        
        await traceLogService.logError(message.id, 'sms', new Error(errorMessage), {
          stage: 'api_response_parsing',
          response: responseText,
          providerType: 'legacy',
        }, 'legacy_custom');
        
        logger.error(`Custom SMS provider returned failure: ${responseText}`);
        throw new Error(`SMS send failed: ${errorMessage}`);
      }

      // Check if response indicates delivery confirmation
      // Format: "sent,success,<messageId>,<otherId>,<phoneNumber>"
      const responseParts = responseText.split(',');
      const isDelivered = responseParts.length >= 2 && 
                          responseParts[0].toLowerCase() === 'sent' && 
                          responseParts[1].toLowerCase() === 'success';
      
      // Extract message ID from response if available
      let externalMessageId = message.id;
      if (isDelivered && responseParts.length >= 3) {
        externalMessageId = responseParts[2].trim();
        logger.info(`Delivery confirmed by provider. Message ID: ${externalMessageId}`);
        
        // Log delivery confirmation trace
        await traceLogService.logTrace(message.id, 'delivery_update', {
          stage: 'delivery_confirmed',
          providerMessageId: externalMessageId,
          phoneNumber: responseParts.length >= 5 ? responseParts[4].trim() : recipientPhone,
          response: responseText,
        }, { channel: 'sms', provider: 'legacy_custom' });
      }

      return {
        success: true,
        provider: 'custom',
        messageId: externalMessageId,
        response: responseText,
        isDelivered: isDelivered,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Log error
      await traceLogService.logError(message.id, 'sms', error, {
        stage: 'api_request',
        url: requestUrl,
        duration,
        providerType: 'legacy',
      }, 'legacy_custom');

      logger.error(`Custom SMS provider error (legacy settings): ${error.message}`, {
        url: requestUrl.replace(/key=[^&]+/, 'key=***'), // Mask API key in logs
        error: error.response?.data || error.message,
      });

      if (error.response) {
        throw new Error(`Custom SMS provider error: ${error.response.status} - ${error.response.statusText}`);
      } else if (error.request) {
        throw new Error('Custom SMS provider: No response received from server');
      } else {
        throw new Error(`Custom SMS provider error: ${error.message}`);
      }
    }
  }

  /**
   * Send via Twilio
   */
  async sendViaTwilio(message, config) {
    // Check if config is a SmsConfiguration or legacy settings
    const isConfiguration = config.provider !== undefined;
    
    let accountSid, authToken, fromNumber;
    
    if (isConfiguration) {
      // Using SmsConfiguration
      accountSid = config.twilioAccountSid;
      fromNumber = config.smsSenderId;
      
      // Decrypt auth token
      if (config.smsApiKeyEncrypted) {
        try {
          if (config.smsApiKeyEncrypted.includes(':')) {
            authToken = decrypt(config.smsApiKeyEncrypted);
          } else {
            authToken = config.smsApiKeyEncrypted;
            logger.warn('Using plain text auth token (encryption not available)');
          }
        } catch (error) {
          logger.warn('Decryption failed, using as plain text:', error.message);
          authToken = config.smsApiKeyEncrypted;
        }
      }
    } else {
      // Legacy settings
      const settingsService = require('./settingsService');
      const fullSettings = await settingsService.getOrganizationSettings(message.organizationId);
      
      accountSid = fullSettings.twilioAccountSid || config.customSettings?.twilioAccountSid;
      fromNumber = fullSettings.smsSenderId || config.smsSenderId;
      
      if (fullSettings.smsApiKeyEncrypted) {
        try {
          if (fullSettings.smsApiKeyEncrypted.includes(':')) {
            authToken = decrypt(fullSettings.smsApiKeyEncrypted);
          } else {
            authToken = fullSettings.smsApiKeyEncrypted;
            logger.warn('Using plain text auth token (encryption not available)');
          }
        } catch (error) {
          logger.warn('Decryption failed, using as plain text:', error.message);
          authToken = fullSettings.smsApiKeyEncrypted;
        }
      }
    }

    if (!accountSid || !authToken) {
      throw new Error('Twilio credentials not configured. Please configure Account SID and Auth Token in SMS settings.');
    }
    
    if (!fromNumber) {
      throw new Error('Twilio sender ID (phone number) not configured');
    }

    const response = await axios.post(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      new URLSearchParams({
        From: fromNumber,
        To: message.recipientPhone,
        Body: message.content,
      }),
      {
        auth: {
          username: accountSid,
          password: authToken,
        },
      }
    );

    const configName = isConfiguration ? config.name : 'legacy';
    logger.info(`SMS sent via Twilio (${configName}): ${response.data.sid}`);

    return {
      messageId: response.data.sid,
      status: 'sent',
      providerResponse: response.data,
      configurationUsed: configName,
      provider: 'twilio',
    };
  }

  /**
   * Send via Vonage (Nexmo)
   */
  async sendViaVonage(message, config) {
    let apiKey = config.vonageApiKey;
    let apiSecret = null;
    
    if (config.vonageApiSecretEncrypted) {
      try {
        if (config.vonageApiSecretEncrypted.includes(':')) {
          apiSecret = decrypt(config.vonageApiSecretEncrypted);
        } else {
          apiSecret = config.vonageApiSecretEncrypted;
        }
      } catch (error) {
        logger.warn('Failed to decrypt Vonage secret, using as plain text');
        apiSecret = config.vonageApiSecretEncrypted;
      }
    }

    if (!apiKey || !apiSecret) {
      throw new Error('Vonage credentials not configured');
    }

    const fromNumber = config.smsSenderId;

    // Vonage API implementation
    const response = await axios.post(
      'https://rest.nexmo.com/sms/json',
      {
        api_key: apiKey,
        api_secret: apiSecret,
        to: message.recipientPhone.replace(/[^0-9]/g, ''),
        from: fromNumber,
        text: message.content,
      }
    );

    if (response.data.messages[0].status !== '0') {
      throw new Error(response.data.messages[0]['error-text'] || 'Vonage SMS send failed');
    }

    logger.info(`SMS sent via Vonage (${config.name}): ${response.data.messages[0]['message-id']}`);

    return {
      messageId: response.data.messages[0]['message-id'],
      status: 'sent',
      providerResponse: response.data,
      configurationUsed: config.name,
      provider: 'nexmo',
    };
  }

  /**
   * Send via AWS SNS
   */
  async sendViaAWSSNS(message, settings) {
    // AWS SNS implementation would go here
    // This is a placeholder
    throw new Error('AWS SNS integration not yet implemented');
  }

  /**
   * Format message for custom provider (SMS Bhejo style)
   * Removes HTML tags, replaces & with "and", removes newlines
   * NOTE: Does NOT URL encode - URLSearchParams will handle encoding automatically
   */
  formatMessageForCustomProvider(messageContent) {
    let formatted = messageContent || '';
    
    // Remove HTML tags
    formatted = formatted.replace(/<[^>]*>/g, '');
    
    // Replace & with "and"
    formatted = formatted.replace(/&/g, 'and');
    
    // DO NOT pre-encode spaces - URLSearchParams will handle URL encoding
    // Removed: formatted = formatted.replace(/ /g, '%20');
    
    // Remove newlines and carriage returns
    formatted = formatted.replace(/\r|\n/g, '');
    
    return formatted;
  }

  /**
   * Send via Custom Provider (SMS Bhejo or similar)
   */
  async sendViaCustomProvider(message, config) {
    // Extract custom parameters from metadata
    const metadata = config.metadata || {};
    const apiUrl = metadata.apiUrl;
    const apiUser = metadata.apiUser;
    let apiKey = metadata.apiKey;
    const entityId = metadata.entityId;
    const accUsage = metadata.accUsage || '1';
    const senderId = config.smsSenderId;

    // Get template ID from template if message was sent using a template
    let templateId = null;
    if (message.templateId) {
      const { Template } = require('../models');
      const template = await Template.findByPk(message.templateId);
      if (template && template.smsTemplateId) {
        templateId = template.smsTemplateId;
      }
    }

    // Validate required fields
    if (!apiUrl) {
      throw new Error('Custom SMS provider API URL not configured');
    }
    if (!apiUser) {
      throw new Error('Custom SMS provider API username not configured');
    }
    if (!apiKey) {
      throw new Error('Custom SMS provider API key not configured');
    }
    if (!entityId) {
      throw new Error('Custom SMS provider Entity ID (PE ID) not configured');
    }
    if (!senderId) {
      throw new Error('Custom SMS provider Sender ID not configured');
    }

    // Decrypt API key if it's encrypted
    if (isEncrypted(apiKey)) {
      try {
        await traceLogService.logTrace(message.id, 'processing', {
          stage: 'api_key_decryption',
          action: 'decrypting',
        }, { channel: 'sms', provider: config.name || 'custom' });
        
        const decryptedKey = decrypt(apiKey);
        // Validate decrypted key doesn't contain ':' (encrypted format indicator)
        if (decryptedKey.includes(':')) {
          throw new Error('Decrypted API key still contains encryption format indicator. Decryption may have failed.');
        }
        apiKey = decryptedKey;
        logger.info(`Successfully decrypted custom provider API key (format: ${apiKey.substring(0, 4)}...)`);
        
        await traceLogService.logTrace(message.id, 'processing', {
          stage: 'api_key_decryption',
          action: 'decrypted_successfully',
        }, { channel: 'sms', provider: config.name || 'custom' });
      } catch (error) {
        await traceLogService.logError(message.id, 'sms', error, {
          stage: 'api_key_decryption',
        }, config.name || 'custom');
        logger.error(`Failed to decrypt custom provider API key: ${error.message}`);
        throw new Error(`API key decryption failed: ${error.message}. Please verify your API key is correctly encrypted.`);
      }
    } else {
      // Validate plain text key doesn't contain ':' (which would indicate it's encrypted)
      if (apiKey.includes(':')) {
        logger.warn('API key appears to be encrypted but isEncrypted() returned false. Attempting decryption anyway...');
        try {
          const decryptedKey = decrypt(apiKey);
          if (decryptedKey.includes(':')) {
            throw new Error('Decryption failed - key still contains encryption format');
          }
          apiKey = decryptedKey;
          logger.info('Successfully decrypted API key after fallback attempt');
        } catch (error) {
          throw new Error(`API key appears encrypted but decryption failed: ${error.message}`);
        }
      }
    }

    // Format message content
    const messageContent = message.content || message.body || '';
    logger.debug(`Message content before formatting: ${messageContent.substring(0, 100)}${messageContent.length > 100 ? '...' : ''}`);
    const formattedMessage = this.formatMessageForCustomProvider(messageContent);
    logger.debug(`Message content after formatting: ${formattedMessage.substring(0, 100)}${formattedMessage.length > 100 ? '...' : ''}`);

    // Get recipient phone number (remove any non-digit characters except +)
    let recipientPhone = message.recipientPhone || '';
    // Remove all non-digit characters for custom provider
    recipientPhone = recipientPhone.replace(/[^0-9]/g, '');
    
    // Normalize to 10 digits (remove country code if present)
    // Working API example uses 10 digits: 9599194330
    if (recipientPhone.length > 10) {
      // If starts with country code 91, remove it
      if (recipientPhone.startsWith('91') && recipientPhone.length === 12) {
        recipientPhone = recipientPhone.substring(2);
        logger.debug(`Removed country code 91 from phone number, normalized to: ${recipientPhone}`);
      } else {
        // Otherwise, take last 10 digits
        recipientPhone = recipientPhone.slice(-10);
        logger.debug(`Normalized phone number to last 10 digits: ${recipientPhone}`);
      }
    }
    
    logger.info(`Phone number normalized: original=${message.recipientPhone}, formatted=${recipientPhone}`);

    if (!recipientPhone) {
      throw new Error('Recipient phone number is required');
    }

    // Build GET request URL
    const urlParams = new URLSearchParams({
      user: apiUser,
      key: apiKey,
      mobile: recipientPhone,
      message: formattedMessage,
      senderid: senderId,
      accusage: accUsage,
      entityid: entityId,
    });

    // Add template ID if provided
    if (templateId) {
      urlParams.append('tempid', templateId);
      await traceLogService.logTrace(message.id, 'processing', {
        stage: 'template_id_added',
        templateId,
      }, { channel: 'sms', provider: config.name || 'custom' });
    }

    const requestUrl = `${apiUrl}?${urlParams.toString()}`;
    
    // Log final URL with masked API key for debugging
    const maskedUrl = requestUrl.replace(/key=[^&]+/, 'key=***');
    logger.info(`Sending SMS via custom provider (${config.name}) to ${recipientPhone}`);
    logger.debug(`Final request URL: ${maskedUrl}`);

    const startTime = Date.now();
    try {
      // Log API request
      await traceLogService.logApiRequest(
        message.id,
        'sms',
        requestUrl,
        'GET',
        { 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' },
        {
          user: apiUser,
          mobile: recipientPhone,
          message: formattedMessage.substring(0, 50) + '...',
          senderid: senderId,
          accusage: accUsage,
          entityid: entityId,
          tempid: templateId || null,
        },
        config.name || 'custom'
      );

      // Make GET request
      const response = await axios.get(requestUrl, {
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        timeout: 30000, // 30 second timeout
      });

      const duration = Date.now() - startTime;

      // Log API response
      await traceLogService.logApiResponse(
        message.id,
        'sms',
        response.status,
        response.headers,
        response.data,
        duration,
        config.name || 'custom'
      );

      // Parse response
      // The response format may vary, but we'll try to extract useful information
      const responseText = typeof response.data === 'string' ? response.data.trim() : String(response.data || '').trim();
      
      logger.info(`SMS response from custom provider (${config.name}): ${responseText.substring(0, 100)}`);

      // Parse response to check for failure
      // Format: "fail,ErrorCode,0,0,0" or "success,..." or similar
      const responseLower = responseText.toLowerCase();
      if (responseLower.startsWith('fail') || responseLower.includes('invalid') || responseLower.includes('error')) {
        // Extract error message
        const errorParts = responseText.split(',');
        const errorMessage = errorParts.length > 1 ? errorParts[1] : 'SMS send failed';
        
        await traceLogService.logError(message.id, 'sms', new Error(errorMessage), {
          stage: 'api_response_parsing',
          response: responseText,
          providerType: 'configuration',
        }, config.name || 'custom');
        
        logger.error(`Custom SMS provider returned failure: ${responseText}`);
        throw new Error(`SMS send failed: ${errorMessage}`);
      }

      // Check if response indicates delivery confirmation
      // Format: "sent,success,<messageId>,<otherId>,<phoneNumber>"
      const responseParts = responseText.split(',');
      const isDelivered = responseParts.length >= 2 && 
                          responseParts[0].toLowerCase() === 'sent' && 
                          responseParts[1].toLowerCase() === 'success';
      
      // Extract message ID from response if available
      let messageId = `custom_${Date.now()}_${recipientPhone.substring(-4)}`;
      if (isDelivered && responseParts.length >= 3) {
        messageId = responseParts[2].trim();
        logger.info(`Delivery confirmed by provider (${config.name}). Message ID: ${messageId}`);
        
        // Log delivery confirmation trace
        await traceLogService.logTrace(message.id, 'delivery_update', {
          stage: 'delivery_confirmed',
          providerMessageId: messageId,
          phoneNumber: responseParts.length >= 5 ? responseParts[4].trim() : recipientPhone,
          response: responseText,
        }, { channel: 'sms', provider: config.name || 'custom' });
      }

      // Return standardized response
      // Note: The actual response format from smsbhejo.org may need adjustment
      return {
        messageId: messageId,
        status: isDelivered ? 'delivered' : 'sent',
        isDelivered: isDelivered,
        providerResponse: response.data,
        configurationUsed: config.name,
        provider: 'other',
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Log error with full context
      await traceLogService.logError(message.id, 'sms', error, {
        stage: 'api_request',
        url: requestUrl,
        duration,
      }, config.name || 'custom');

      logger.error(`Custom SMS provider error: ${error.message}`, {
        url: requestUrl.replace(/key=[^&]+/, 'key=***'), // Mask API key in logs
        error: error.response?.data || error.message,
      });

      if (error.response) {
        throw new Error(`Custom SMS provider error: ${error.response.status} - ${error.response.statusText}`);
      } else if (error.request) {
        throw new Error('Custom SMS provider: No response received from server');
      } else {
        throw new Error(`Custom SMS provider error: ${error.message}`);
      }
    }
  }
}

module.exports = new SMSService();


