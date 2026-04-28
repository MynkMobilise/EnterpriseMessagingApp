const { EmailConfiguration } = require('../models');
const { NotFoundError, AppError } = require('../utils/errorTypes');
const { encrypt, decrypt } = require('../utils/encryption');

class EmailConfigurationService {
  /**
   * List all email configurations for an organization
   */
  async list(organizationId, filters = {}) {
    const where = { organizationId };
    if (filters.status) {
      where.status = filters.status;
    }

    const configurations = await EmailConfiguration.findAll({
      where,
      order: [['priority', 'ASC'], ['created_at', 'DESC']],
    });

    return configurations.map(config => {
      const configJson = config.toJSON();
      // Don't expose encrypted fields in list
      delete configJson.emailApiKeyEncrypted;
      delete configJson.smtpPasswordEncrypted;
      return configJson;
    });
  }

  /**
   * Get email configuration by ID
   */
  async getById(id, organizationId) {
    const configuration = await EmailConfiguration.findOne({
      where: { id, organizationId },
    });

    if (!configuration) {
      throw new NotFoundError('Email configuration');
    }

    return configuration;
  }

  /**
   * Create email configuration
   */
  async create(organizationId, data) {
    const {
      name,
      provider,
      emailFromAddress,
      emailFromName,
      emailApiKeyEncrypted,
      smtpHost,
      smtpPort,
      smtpSecure,
      smtpUsername,
      smtpPasswordEncrypted,
      isDefault,
      isFallback,
      priority,
      status,
      metadata,
      tlsOptions,
    } = data;

    // If setting as default, unset other defaults
    if (isDefault) {
      await EmailConfiguration.update(
        { isDefault: false },
        { where: { organizationId, isDefault: true } }
      );
    }

    // If setting as fallback, unset other fallbacks
    if (isFallback) {
      await EmailConfiguration.update(
        { isFallback: false },
        { where: { organizationId, isFallback: true } }
      );
    }

    // Encrypt sensitive fields
    let encryptedApiKey = emailApiKeyEncrypted;
    if (encryptedApiKey && encryptedApiKey.trim() !== '') {
      try {
        encryptedApiKey = encrypt(encryptedApiKey);
      } catch (error) {
        console.error('Failed to encrypt email API key:', error.message);
      }
    }

    let encryptedPassword = smtpPasswordEncrypted;
    if (encryptedPassword && encryptedPassword.trim() !== '') {
      // Check if already encrypted (contains ':')
      if (encryptedPassword.includes(':')) {
        // Already encrypted, use as-is (might be from update)
        console.log('SMTP password appears to be already encrypted, using as-is');
      } else {
        // Not encrypted, encrypt it
        try {
          encryptedPassword = encrypt(encryptedPassword);
          console.log('SMTP password encrypted successfully');
        } catch (error) {
          console.error('Failed to encrypt SMTP password:', error.message);
          // If encryption fails, store as plain text (not ideal but better than failing)
          encryptedPassword = smtpPasswordEncrypted;
        }
      }
    }

    const configuration = await EmailConfiguration.create({
      organizationId,
      name,
      provider,
      emailFromAddress,
      emailFromName,
      emailApiKeyEncrypted: encryptedApiKey || null,
      smtpHost: smtpHost || null,
      smtpPort: smtpPort || null,
      smtpSecure: smtpSecure !== undefined ? smtpSecure : true,
      smtpUsername: smtpUsername || null,
      smtpPasswordEncrypted: encryptedPassword || null,
      isDefault: isDefault || false,
      isFallback: isFallback || false,
      priority: priority || 0,
      status: status || 'active',
      metadata: metadata || null,
      tlsOptions: tlsOptions || null,
    });

    return configuration;
  }

  /**
   * Update email configuration
   */
  async update(id, organizationId, data) {
    const configuration = await this.getById(id, organizationId);

    const {
      name,
      provider,
      emailFromAddress,
      emailFromName,
      emailApiKeyEncrypted,
      smtpHost,
      smtpPort,
      smtpSecure,
      smtpUsername,
      smtpPasswordEncrypted,
      isDefault,
      isFallback,
      priority,
      status,
      metadata,
      tlsOptions,
    } = data;

    // If setting as default, unset other defaults
    if (isDefault && !configuration.isDefault) {
      await EmailConfiguration.update(
        { isDefault: false },
        { where: { organizationId, isDefault: true, id: { [require('sequelize').Op.ne]: id } } }
      );
    }

    // If setting as fallback, unset other fallbacks
    if (isFallback && !configuration.isFallback) {
      await EmailConfiguration.update(
        { isFallback: false },
        { where: { organizationId, isFallback: true, id: { [require('sequelize').Op.ne]: id } } }
      );
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (provider !== undefined) updateData.provider = provider;
    if (emailFromAddress !== undefined) updateData.emailFromAddress = emailFromAddress;
    if (emailFromName !== undefined) updateData.emailFromName = emailFromName;
    if (smtpHost !== undefined) updateData.smtpHost = smtpHost;
    if (smtpPort !== undefined) updateData.smtpPort = smtpPort;
    if (smtpSecure !== undefined) updateData.smtpSecure = smtpSecure;
    if (smtpUsername !== undefined) updateData.smtpUsername = smtpUsername;
    if (isDefault !== undefined) updateData.isDefault = isDefault;
    if (isFallback !== undefined) updateData.isFallback = isFallback;
    if (priority !== undefined) updateData.priority = priority;
    if (status !== undefined) updateData.status = status;
    if (metadata !== undefined) updateData.metadata = metadata;
    if (tlsOptions !== undefined) updateData.tlsOptions = tlsOptions;

    // Only update encrypted fields if new values provided
    if (emailApiKeyEncrypted !== undefined && emailApiKeyEncrypted.trim() !== '') {
      try {
        updateData.emailApiKeyEncrypted = encrypt(emailApiKeyEncrypted);
      } catch (error) {
        console.error('Failed to encrypt email API key:', error.message);
      }
    }

    if (smtpPasswordEncrypted !== undefined && smtpPasswordEncrypted.trim() !== '') {
      // Check if already encrypted (contains ':')
      if (smtpPasswordEncrypted.includes(':')) {
        // Already encrypted, use as-is
        console.log('SMTP password appears to be already encrypted during update, using as-is');
        updateData.smtpPasswordEncrypted = smtpPasswordEncrypted;
      } else {
        // Not encrypted, encrypt it
        try {
          updateData.smtpPasswordEncrypted = encrypt(smtpPasswordEncrypted);
          console.log('SMTP password encrypted successfully during update');
        } catch (error) {
          console.error('Failed to encrypt SMTP password:', error.message);
          // If encryption fails, store as plain text
          updateData.smtpPasswordEncrypted = smtpPasswordEncrypted;
        }
      }
    }

    await configuration.update(updateData);
    return configuration;
  }

  /**
   * Delete email configuration
   */
  async delete(id, organizationId) {
    const configuration = await this.getById(id, organizationId);
    await configuration.destroy();
    return { success: true };
  }

  /**
   * Get default email configuration
   */
  async getDefault(organizationId) {
    return await EmailConfiguration.findOne({
      where: { organizationId, isDefault: true, status: 'active' },
    });
  }

  /**
   * Get fallback email configuration
   */
  async getFallback(organizationId) {
    return await EmailConfiguration.findOne({
      where: { organizationId, isFallback: true, status: 'active' },
    });
  }

  /**
   * Test email configuration by sending a test email
   */
  async test(configurationId, organizationId, testEmail) {
    const configuration = await this.getById(configurationId, organizationId);

    if (configuration.status !== 'active') {
      throw new Error(`Email configuration "${configuration.name}" is not active`);
    }

    // Use emailService to send test email with this configuration
    const emailService = require('./emailService');
    
    // Create a test message object
    const testMessage = {
      organizationId,
      recipientEmail: testEmail,
      subject: `Test Email - ${configuration.name}`,
      content: `This is a test email from ${configuration.name} (${configuration.provider}).\n\nIf you received this email, your email configuration is working correctly!`,
      messageType: 'text',
    };

    // Send using the specific configuration
    const result = await emailService.sendWithConfiguration(testMessage, configuration);

    return {
      success: true,
      message: 'Test email sent successfully',
      messageId: result.messageId,
      configuration: {
        id: configuration.id,
        name: configuration.name,
        provider: configuration.provider,
      },
    };
  }
}

module.exports = new EmailConfigurationService();

