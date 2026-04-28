const { Message, OrganizationSettings } = require('../models');
const { sendEmail } = require('../config/email');
const logger = require('../utils/logger');
const { decrypt } = require('../utils/encryption');
const emailConfigurationService = require('./emailConfigurationService');
const traceLogService = require('./traceLogService');

class EmailService {
  /**
   * Send email message with default and fallback support
   */
  async sendMessage(message) {
    await traceLogService.logTrace(message.id, 'processing', {
      stage: 'email_service_entry',
      channel: 'email',
    }, { channel: 'email' });

    let lastError = null;
    let lastProvider = null;
    
    // Try default configuration first
    try {
      const defaultConfig = await emailConfigurationService.getDefault(message.organizationId);
      if (defaultConfig) {
        await traceLogService.logProviderSelection(
          message.id,
          'email',
          defaultConfig.name || 'default',
          'default',
          { provider: defaultConfig.provider }
        );
        try {
          return await this.sendWithConfiguration(message, defaultConfig);
        } catch (error) {
          lastError = error;
          lastProvider = defaultConfig.name || 'default';
          await traceLogService.logError(message.id, 'email', error, {
            provider: defaultConfig.name,
            providerType: 'default',
          }, defaultConfig.name || 'default');
          logger.warn(`Failed to send email with default configuration: ${error.message}`);
          // Continue to try fallback
        }
      }
    } catch (error) {
      logger.warn(`No default email configuration found: ${error.message}`);
    }

    // Try fallback configuration
    try {
      const fallbackConfig = await emailConfigurationService.getFallback(message.organizationId);
      if (fallbackConfig) {
        await traceLogService.logFallbackAttempt(
          message.id,
          'email',
          lastProvider || 'default',
          fallbackConfig.name || 'fallback',
          lastError?.message || 'Default provider failed'
        );
        await traceLogService.logProviderSelection(
          message.id,
          'email',
          fallbackConfig.name || 'fallback',
          'fallback',
          { provider: fallbackConfig.provider }
        );
        try {
          logger.info(`Attempting to send email with fallback configuration: ${fallbackConfig.name}`);
          return await this.sendWithConfiguration(message, fallbackConfig);
        } catch (error) {
          lastError = error;
          lastProvider = fallbackConfig.name || 'fallback';
          await traceLogService.logError(message.id, 'email', error, {
            provider: fallbackConfig.name,
            providerType: 'fallback',
          }, fallbackConfig.name || 'fallback');
          logger.error(`Failed to send email with fallback configuration: ${error.message}`);
        }
      }
    } catch (error) {
      logger.warn(`No fallback email configuration found: ${error.message}`);
    }

    // If both default and fallback failed, try legacy settings
    try {
      await traceLogService.logFallbackAttempt(
        message.id,
        'email',
        lastProvider || 'fallback',
        'legacy',
        lastError?.message || 'Fallback provider failed'
      );
      return await this.sendWithLegacySettings(message);
    } catch (error) {
      lastError = error;
      await traceLogService.logError(message.id, 'email', error, {
        provider: 'legacy',
        providerType: 'legacy',
      }, 'legacy');
      logger.error(`Failed to send email with legacy settings: ${error.message}`);
    }

    // If all attempts failed, throw the last error
    throw new Error(`Email send failed: ${lastError?.message || 'No email configuration available'}`);
  }

  /**
   * Send email with a specific configuration
   */
  async sendWithConfiguration(message, config) {
    if (config.status !== 'active') {
      throw new Error(`Email configuration "${config.name}" is not active`);
    }

    // Prepare email content
    const subject = message.subject || 'Notification';
    const htmlContent = message.messageType === 'html' ? message.content : this.textToHtml(message.content);
    const textContent = message.content;

    // Decrypt credentials if needed
    let apiKey = null;
    let smtpPassword = null;

    if (config.emailApiKeyEncrypted) {
      try {
        apiKey = decrypt(config.emailApiKeyEncrypted);
      } catch (error) {
        // If decryption fails, try using as plain text
        logger.warn('Failed to decrypt email API key, using as plain text');
        apiKey = config.emailApiKeyEncrypted;
      }
    }

    if (config.smtpPasswordEncrypted) {
      try {
        // Check if value is already encrypted (contains ':')
        if (config.smtpPasswordEncrypted.includes(':')) {
          // It's encrypted, try to decrypt
          smtpPassword = decrypt(config.smtpPasswordEncrypted);
          logger.info(`SMTP password decrypted successfully for config "${config.name}"`);
        } else {
          // It's plain text (encryption failed or not encrypted), use as-is
          smtpPassword = config.smtpPasswordEncrypted;
          logger.warn(`Using SMTP password as plain text (not encrypted) for config "${config.name}"`);
        }
      } catch (error) {
        // If decryption fails, try using as plain text
        logger.error(`Failed to decrypt SMTP password for config "${config.name}": ${error.message}, using as plain text`);
        smtpPassword = config.smtpPasswordEncrypted;
      }
    } else {
      logger.warn(`No SMTP password found for config "${config.name}"`);
    }
    
    // Log credential status (without actual values)
    logger.info(`SMTP credentials check for "${config.name}": username=${config.smtpUsername ? '***' : 'not set'}, password=${smtpPassword ? '***' : 'not set'}`);

    await traceLogService.logTrace(message.id, 'processing', {
      stage: 'email_composition',
      provider: config.provider,
      from: config.emailFromAddress,
      to: message.recipientEmail,
      subject: subject,
      hasHtml: !!htmlContent,
      hasText: !!textContent,
    }, { channel: 'email', provider: config.name || config.provider });

    // Send email based on provider
    const emailOptions = {
      to: message.recipientEmail,
      subject: subject,
      text: textContent,
      html: htmlContent,
      from: config.emailFromAddress,
      fromName: config.emailFromName,
      provider: config.provider,
      // Provider-specific options
      apiKey: apiKey,
      smtpHost: config.smtpHost || null,
      smtpPort: config.smtpPort ? parseInt(config.smtpPort) : null,
      smtpSecure: config.smtpSecure !== undefined ? Boolean(config.smtpSecure) : undefined,
      smtpUsername: config.smtpUsername || null,
      smtpPassword: smtpPassword || null,
      tlsOptions: config.tlsOptions || null,
    };

    const startTime = Date.now();
    
    // Log API request (for SMTP, this is the connection attempt)
    if (config.provider === 'smtp') {
      await traceLogService.logApiRequest(
        message.id,
        'email',
        `smtp://${config.smtpHost}:${config.smtpPort}`,
        'SMTP',
        {
          'From': config.emailFromAddress,
          'To': message.recipientEmail,
          'Subject': subject,
        },
        {
          host: config.smtpHost,
          port: config.smtpPort,
          secure: config.smtpSecure,
          username: config.smtpUsername ? '***' : null,
        },
        config.name || config.provider
      );
    } else {
      // For API providers (SendGrid, AWS SES, etc.)
      await traceLogService.logApiRequest(
        message.id,
        'email',
        `api://${config.provider}`,
        'POST',
        {
          'Content-Type': 'application/json',
        },
        {
          from: config.emailFromAddress,
          to: message.recipientEmail,
          subject: subject,
        },
        config.name || config.provider
      );
    }

    const result = await sendEmail(emailOptions);
    const duration = Date.now() - startTime;

    if (!result.success) {
      // Log error
      await traceLogService.logError(message.id, 'email', new Error(result.error || 'Email send failed'), {
        stage: 'email_send',
        provider: config.provider,
        errorCode: result.errorCode,
        originalError: result.originalError,
      }, config.name || config.provider);

      // Provide more detailed error message
      let errorMsg = result.error || 'Failed to send email';
      if (result.errorCode === 'EAUTH' || (result.originalError && result.originalError.includes('authentication failed'))) {
        errorMsg = `SMTP authentication failed for configuration "${config.name}". Please verify your SMTP username and password are correct.`;
        if (config.smtpHost && config.smtpHost.includes('gmail')) {
          errorMsg += ' For Gmail, you must use an App Password, not your regular password.';
        }
      } else if (result.originalError && result.originalError.includes('535')) {
        errorMsg = `SMTP authentication failed (Error 535) for configuration "${config.name}". Please verify your SMTP credentials.`;
        if (config.smtpHost && config.smtpHost.includes('gmail')) {
          errorMsg += ' For Gmail, use an App Password instead of your regular password.';
        }
      }
      logger.error(`Email send failed: ${errorMsg}`, { 
        config: config.name, 
        provider: config.provider,
        host: config.smtpHost,
        port: config.smtpPort,
        hasUsername: !!config.smtpUsername,
        hasPassword: !!smtpPassword,
        errorCode: result.errorCode,
      });
      throw new Error(errorMsg);
    }

    // Log API response
    await traceLogService.logApiResponse(
      message.id,
      'email',
      200,
      {},
      { messageId: result.messageId, accepted: result.accepted },
      duration,
      config.name || config.provider
    );

    logger.info(`Email sent via ${config.name} (${config.provider}): ${result.messageId} to ${message.recipientEmail}`);

    return {
      messageId: result.messageId,
      status: 'sent',
      providerResponse: result,
      configurationUsed: config.name,
      provider: config.provider,
    };
  }

  /**
   * Send email with legacy organization settings (backward compatibility)
   */
  async sendWithLegacySettings(message) {
    // Get organization settings
    const settings = await OrganizationSettings.findOne({
      where: { organizationId: message.organizationId },
    });

    if (!settings) {
      throw new Error('Organization settings not found');
    }

    // Get email configuration from settings or customSettings
    const customSettings = settings.customSettings || {};
    const emailProvider = settings.emailProvider || customSettings.emailProvider || 'smtp';
    const fromAddress = settings.emailFromAddress || customSettings.emailFromAddress || process.env.EMAIL_FROM || 'noreply@yourcompany.com';
    const fromName = settings.emailFromName || customSettings.emailFromName || 'Your Company';

    // Prepare email content
    const subject = message.subject || 'Notification';
    const htmlContent = message.messageType === 'html' ? message.content : this.textToHtml(message.content);
    const textContent = message.content;

    // Send email
    const result = await sendEmail({
      to: message.recipientEmail,
      subject: subject,
      text: textContent,
      html: htmlContent,
      from: fromAddress,
      fromName: fromName,
      provider: emailProvider,
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to send email');
    }

    logger.info(`Email sent (legacy): ${result.messageId} to ${message.recipientEmail}`);

    return {
      messageId: result.messageId,
      status: 'sent',
      providerResponse: result,
      configurationUsed: 'legacy',
    };
  }

  /**
   * Convert plain text to HTML
   */
  textToHtml(text) {
    if (!text) return '';
    // Convert line breaks to <br> tags
    const html = text
      .replace(/\n/g, '<br>')
      .replace(/\r\n/g, '<br>');
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        ${html}
      </body>
      </html>
    `;
  }

  /**
   * Send bulk emails
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
}

module.exports = new EmailService();

