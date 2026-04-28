const { SmsConfiguration } = require('../models');
const { NotFoundError, AppError } = require('../utils/errorTypes');
const { encrypt, decrypt } = require('../utils/encryption');

class SmsConfigurationService {
  /**
   * List all SMS configurations for an organization
   */
  async list(organizationId, filters = {}) {
    const where = { organizationId };
    if (filters.status) {
      where.status = filters.status;
    }

    const configurations = await SmsConfiguration.findAll({
      where,
      order: [['priority', 'ASC'], ['created_at', 'DESC']],
    });

    return configurations.map(config => {
      const configJson = config.toJSON();
      // Don't expose encrypted fields in list
      delete configJson.smsApiKeyEncrypted;
      delete configJson.awsSecretAccessKeyEncrypted;
      delete configJson.vonageApiSecretEncrypted;
      return configJson;
    });
  }

  /**
   * Get SMS configuration by ID
   */
  async getById(id, organizationId) {
    const configuration = await SmsConfiguration.findOne({
      where: { id, organizationId },
    });

    if (!configuration) {
      throw new NotFoundError('SMS configuration');
    }

    return configuration;
  }

  /**
   * Create SMS configuration
   */
  async create(organizationId, data) {
    const {
      name,
      provider,
      smsSenderId,
      smsApiKeyEncrypted,
      twilioAccountSid,
      awsRegion,
      awsAccessKeyId,
      awsSecretAccessKeyEncrypted,
      vonageApiKey,
      vonageApiSecretEncrypted,
      isDefault,
      isFallback,
      priority,
      status,
      metadata,
    } = data;

    // If setting as default, unset other defaults
    if (isDefault) {
      await SmsConfiguration.update(
        { isDefault: false },
        { where: { organizationId, isDefault: true } }
      );
    }

    // If setting as fallback, unset other fallbacks
    if (isFallback) {
      await SmsConfiguration.update(
        { isFallback: false },
        { where: { organizationId, isFallback: true } }
      );
    }

    // Handle custom provider metadata
    let finalMetadata = metadata || {};
    if (provider === 'other') {
      // Extract custom provider fields from data
      const {
        customApiUrl,
        customApiUser,
        customApiKey,
        customEntityId,
        customAccUsage,
      } = data;

      // Validate required fields for custom provider
      if (!customApiUrl || !customApiUser || !customApiKey || !customEntityId) {
        throw new AppError('Custom provider requires: API URL, API User, API Key, and Entity ID', 400);
      }

      // Encrypt API key
      let encryptedCustomApiKey = customApiKey;
      if (encryptedCustomApiKey && encryptedCustomApiKey.trim() !== '') {
        try {
          encryptedCustomApiKey = encrypt(encryptedCustomApiKey);
        } catch (error) {
          console.error('Failed to encrypt custom provider API key:', error.message);
          throw new AppError('Failed to encrypt API key', 500);
        }
      }

      // Build metadata object for custom provider
      finalMetadata = {
        apiUrl: customApiUrl.trim(),
        apiUser: customApiUser.trim(),
        apiKey: encryptedCustomApiKey,
        entityId: customEntityId.trim(),
        accUsage: customAccUsage || '1',
      };
    }

    // Encrypt sensitive fields
    let encryptedApiKey = smsApiKeyEncrypted;
    if (encryptedApiKey && encryptedApiKey.trim() !== '') {
      try {
        encryptedApiKey = encrypt(encryptedApiKey);
      } catch (error) {
        console.error('Failed to encrypt SMS API key:', error.message);
      }
    }

    let encryptedAwsSecret = awsSecretAccessKeyEncrypted;
    if (encryptedAwsSecret && encryptedAwsSecret.trim() !== '') {
      try {
        encryptedAwsSecret = encrypt(encryptedAwsSecret);
      } catch (error) {
        console.error('Failed to encrypt AWS secret:', error.message);
      }
    }

    let encryptedVonageSecret = vonageApiSecretEncrypted;
    if (encryptedVonageSecret && encryptedVonageSecret.trim() !== '') {
      try {
        encryptedVonageSecret = encrypt(encryptedVonageSecret);
      } catch (error) {
        console.error('Failed to encrypt Vonage secret:', error.message);
      }
    }

    const configuration = await SmsConfiguration.create({
      organizationId,
      name,
      provider,
      smsSenderId: smsSenderId || null,
      smsApiKeyEncrypted: encryptedApiKey || null,
      twilioAccountSid: twilioAccountSid || null,
      awsRegion: awsRegion || null,
      awsAccessKeyId: awsAccessKeyId || null,
      awsSecretAccessKeyEncrypted: encryptedAwsSecret || null,
      vonageApiKey: vonageApiKey || null,
      vonageApiSecretEncrypted: encryptedVonageSecret || null,
      isDefault: isDefault || false,
      isFallback: isFallback || false,
      priority: priority || 0,
      status: status || 'active',
      metadata: Object.keys(finalMetadata).length > 0 ? finalMetadata : null,
    });

    return configuration;
  }

  /**
   * Update SMS configuration
   */
  async update(id, organizationId, data) {
    const configuration = await this.getById(id, organizationId);

    const {
      name,
      provider,
      smsSenderId,
      smsApiKeyEncrypted,
      twilioAccountSid,
      awsRegion,
      awsAccessKeyId,
      awsSecretAccessKeyEncrypted,
      vonageApiKey,
      vonageApiSecretEncrypted,
      isDefault,
      isFallback,
      priority,
      status,
      metadata,
    } = data;

    // If setting as default, unset other defaults
    if (isDefault && !configuration.isDefault) {
      await SmsConfiguration.update(
        { isDefault: false },
        { where: { organizationId, isDefault: true, id: { [require('sequelize').Op.ne]: id } } }
      );
    }

    // If setting as fallback, unset other fallbacks
    if (isFallback && !configuration.isFallback) {
      await SmsConfiguration.update(
        { isFallback: false },
        { where: { organizationId, isFallback: true, id: { [require('sequelize').Op.ne]: id } } }
      );
    }

    // Handle custom provider metadata update
    let finalMetadata = metadata;
    const currentProvider = provider !== undefined ? provider : configuration.provider;
    
    if (currentProvider === 'other') {
      // Extract custom provider fields from data
      const {
        customApiUrl,
        customApiUser,
        customApiKey,
        customEntityId,
        customAccUsage,
      } = data;

      // If metadata is being updated or custom fields are provided
      if (metadata !== undefined || customApiUrl !== undefined || customApiUser !== undefined || 
          customApiKey !== undefined || customEntityId !== undefined) {
        
        // Start with existing metadata or empty object
        finalMetadata = configuration.metadata || {};

        // Update fields if provided
        if (customApiUrl !== undefined) {
          finalMetadata.apiUrl = customApiUrl.trim();
        }
        if (customApiUser !== undefined) {
          finalMetadata.apiUser = customApiUser.trim();
        }
        if (customEntityId !== undefined) {
          finalMetadata.entityId = customEntityId.trim();
        }
        if (customAccUsage !== undefined) {
          finalMetadata.accUsage = customAccUsage || '1';
        }

        // Encrypt API key if provided
        if (customApiKey !== undefined && customApiKey.trim() !== '') {
          try {
            finalMetadata.apiKey = encrypt(customApiKey);
          } catch (error) {
            console.error('Failed to encrypt custom provider API key:', error.message);
            throw new AppError('Failed to encrypt API key', 500);
          }
        } else if (customApiKey === '') {
          // If empty string, don't update (keep existing)
          delete finalMetadata.apiKey;
        }

        // Validate required fields
        if (!finalMetadata.apiUrl || !finalMetadata.apiUser || !finalMetadata.apiKey || !finalMetadata.entityId) {
          throw new AppError('Custom provider requires: API URL, API User, API Key, and Entity ID', 400);
        }
      }
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (provider !== undefined) updateData.provider = provider;
    if (smsSenderId !== undefined) updateData.smsSenderId = smsSenderId;
    if (twilioAccountSid !== undefined) updateData.twilioAccountSid = twilioAccountSid;
    if (awsRegion !== undefined) updateData.awsRegion = awsRegion;
    if (awsAccessKeyId !== undefined) updateData.awsAccessKeyId = awsAccessKeyId;
    if (vonageApiKey !== undefined) updateData.vonageApiKey = vonageApiKey;
    if (isDefault !== undefined) updateData.isDefault = isDefault;
    if (isFallback !== undefined) updateData.isFallback = isFallback;
    if (priority !== undefined) updateData.priority = priority;
    if (status !== undefined) updateData.status = status;
    if (finalMetadata !== undefined) {
      updateData.metadata = Object.keys(finalMetadata).length > 0 ? finalMetadata : null;
    }

    // Only update encrypted fields if new values provided
    if (smsApiKeyEncrypted !== undefined && smsApiKeyEncrypted.trim() !== '') {
      try {
        updateData.smsApiKeyEncrypted = encrypt(smsApiKeyEncrypted);
      } catch (error) {
        console.error('Failed to encrypt SMS API key:', error.message);
      }
    }

    if (awsSecretAccessKeyEncrypted !== undefined && awsSecretAccessKeyEncrypted.trim() !== '') {
      try {
        updateData.awsSecretAccessKeyEncrypted = encrypt(awsSecretAccessKeyEncrypted);
      } catch (error) {
        console.error('Failed to encrypt AWS secret:', error.message);
      }
    }

    if (vonageApiSecretEncrypted !== undefined && vonageApiSecretEncrypted.trim() !== '') {
      try {
        updateData.vonageApiSecretEncrypted = encrypt(vonageApiSecretEncrypted);
      } catch (error) {
        console.error('Failed to encrypt Vonage secret:', error.message);
      }
    }

    await configuration.update(updateData);
    return configuration;
  }

  /**
   * Delete SMS configuration
   */
  async delete(id, organizationId) {
    const configuration = await this.getById(id, organizationId);
    await configuration.destroy();
    return { success: true };
  }

  /**
   * Get default SMS configuration
   */
  async getDefault(organizationId) {
    return await SmsConfiguration.findOne({
      where: { organizationId, isDefault: true, status: 'active' },
    });
  }

  /**
   * Get fallback SMS configuration
   */
  async getFallback(organizationId) {
    return await SmsConfiguration.findOne({
      where: { organizationId, isFallback: true, status: 'active' },
    });
  }
}

module.exports = new SmsConfigurationService();

