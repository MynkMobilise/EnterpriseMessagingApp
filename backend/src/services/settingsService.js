const { OrganizationSettings, UserPreferences, Organization } = require('../models');
const { NotFoundError, AppError } = require('../utils/errorTypes');
const { encrypt, decrypt } = require('../utils/encryption');
const logger = require('../utils/logger');
const { sequelize } = require('../config/database');

class SettingsService {
  /**
   * Get organization settings
   */
  async getOrganizationSettings(organizationId) {
    try {
      let settings = await OrganizationSettings.findOne({
        where: { organizationId },
      });

      // Create default settings if not exists
      if (!settings) {
        settings = await OrganizationSettings.create({
          organizationId,
        });
      }

      // Extract customSettings fields and add them to the main settings object
      let settingsJson;
      try {
        settingsJson = settings.toJSON();
      } catch (error) {
        // If toJSON fails (e.g., due to missing columns), use raw query
        logger.warn('Failed to convert settings to JSON, using raw query:', error.message);
        const [results] = await sequelize.query(
          `SELECT * FROM organization_settings WHERE organization_id = :organizationId LIMIT 1`,
          {
            replacements: { organizationId },
            type: sequelize.QueryTypes.SELECT,
          }
        );
        if (results && results.length > 0) {
          settingsJson = results[0];
        } else {
          settingsJson = {};
        }
      }
      
      // Ensure new WhatsApp fields exist (in case migration hasn't run yet)
      // These fields were added in the OAuth removal update
      if (settingsJson.whatsappAppId === undefined) {
        settingsJson.whatsappAppId = null;
      }
      if (settingsJson.whatsappAppSecret === undefined) {
        settingsJson.whatsappAppSecret = null;
      }
      if (settingsJson.whatsappWebhookUrl === undefined) {
        settingsJson.whatsappWebhookUrl = null;
      }
      
      // Handle customSettings - Sequelize should return it as an object, but handle both cases
      let customSettings = settingsJson.customSettings;
      
      // If customSettings is null/undefined, use empty object
      if (!customSettings) {
        customSettings = {};
      }
      // If it's a string, try to parse it
      else if (typeof customSettings === 'string') {
        try {
          customSettings = JSON.parse(customSettings);
        } catch (e) {
          console.warn('Failed to parse customSettings JSON:', e.message);
          customSettings = {};
        }
      }
      // Ensure it's an object (not array, not null)
      if (!customSettings || typeof customSettings !== 'object' || Array.isArray(customSettings)) {
        customSettings = {};
      }
      
      // Add customSettings fields to main object for easier access
      if (customSettings.quotaWarnings !== undefined) {
        settingsJson.quotaWarnings = customSettings.quotaWarnings;
      }
      if (customSettings.failedMessageThreshold !== undefined) {
        settingsJson.failedMessageThreshold = customSettings.failedMessageThreshold;
      }
      if (customSettings.apiErrorThreshold !== undefined) {
        settingsJson.apiErrorThreshold = customSettings.apiErrorThreshold;
      }
      if (customSettings.twilioAccountSid !== undefined) {
        settingsJson.twilioAccountSid = customSettings.twilioAccountSid;
      }
      
      // Add custom SMS provider fields (always extract if they exist in customSettings)
      // This ensures the frontend can populate form fields even if values are empty strings
      // Use 'in' operator which works even if value is null/undefined/empty string
      // But first ensure customSettings is an object
      if (customSettings && typeof customSettings === 'object' && !Array.isArray(customSettings)) {
        if ('customApiUrl' in customSettings) {
          settingsJson.customApiUrl = customSettings.customApiUrl != null ? String(customSettings.customApiUrl) : '';
        }
        if ('customApiUser' in customSettings) {
          settingsJson.customApiUser = customSettings.customApiUser != null ? String(customSettings.customApiUser) : '';
        }
        if ('customEntityId' in customSettings) {
          settingsJson.customEntityId = customSettings.customEntityId != null ? String(customSettings.customEntityId) : '';
        }
        if ('customAccUsage' in customSettings) {
          settingsJson.customAccUsage = customSettings.customAccUsage != null ? String(customSettings.customAccUsage) : '1';
        }
        // Handle customApiKey - decrypt if encrypted, but don't expose it in the response
        // The frontend should not receive the decrypted key for security
        // We only indicate if a key exists (for UI purposes)
        if ('customApiKey' in customSettings && customSettings.customApiKey) {
          // Just indicate that a key exists, don't send the actual key
          settingsJson.hasCustomApiKey = true;
        } else {
          settingsJson.hasCustomApiKey = false;
        }
      }
      
      // Ensure customSettings is always an object in the response
      settingsJson.customSettings = customSettings;

      return settingsJson;
    } catch (error) {
      logger.error('Error getting organization settings:', error);
      // Return minimal settings object on error
      return {
        whatsappAppId: null,
        whatsappAppSecret: null,
        whatsappWebhookUrl: null,
        customSettings: {},
      };
    }
  }

  /**
   * Get decrypted SMS API key (Auth Token)
   */
  async getDecryptedSmsApiKey(organizationId) {
    const settings = await this.getOrganizationSettings(organizationId);
    
    if (!settings.smsApiKeyEncrypted) {
      return null;
    }

    try {
      // Check if value is already encrypted (contains ':')
      if (settings.smsApiKeyEncrypted.includes(':')) {
        // It's encrypted, try to decrypt
        return decrypt(settings.smsApiKeyEncrypted);
      } else {
        // It's plain text (encryption failed), return as-is
        return settings.smsApiKeyEncrypted;
      }
    } catch (error) {
      // If decryption fails, try using as plain text
      return settings.smsApiKeyEncrypted;
    }
  }

  /**
   * Get decrypted Custom SMS Provider API Key
   */
  async getDecryptedCustomSmsApiKey(organizationId) {
    const settings = await this.getOrganizationSettings(organizationId);
    const customSettings = settings.customSettings || {};
    
    if (!customSettings.customApiKey) {
      return null;
    }

    try {
      const { isEncrypted } = require('../utils/encryption');
      
      // Check if value is encrypted
      if (isEncrypted(customSettings.customApiKey)) {
        // It's encrypted, try to decrypt
        return decrypt(customSettings.customApiKey);
      } else {
        // It's plain text (encryption failed or not encrypted), return as-is
        return customSettings.customApiKey;
      }
    } catch (error) {
      logger.error('Failed to decrypt custom SMS API key:', error);
      // If decryption fails, return null for security
      return null;
    }
  }

  /**
   * Get available SMS providers (configured)
   * Only returns 'other' (custom) provider when configured
   */
  async getAvailableSmsProviders(organizationId) {
    const settings = await this.getOrganizationSettings(organizationId);
    const providers = [];

    // Check if custom SMS provider is configured
    // Custom provider is configured if smsProvider is 'other' and customApiKey exists in customSettings
    const customSettings = settings.customSettings || {};
    const isCustomProviderConfigured = 
      settings.smsProvider === 'other' && 
      (customSettings.customApiKey || settings.customApiKey);

    if (isCustomProviderConfigured) {
      providers.push({
        id: 'other',
        name: 'Other',
      });
    }

    return providers;
  }

  /**
   * Update organization settings
   */
  async updateOrganizationSettings(organizationId, data) {
    try {
      const settings = await OrganizationSettings.findOne({
        where: { organizationId },
      });

    // Extract fields that go into customSettings
    const { 
      quotaWarnings, 
      failedMessageThreshold, 
      apiErrorThreshold, 
      twilioAccountSid,
      customApiKey,
      customSettings: incomingCustomSettings, 
      ...mainData 
    } = data;
    
    // Prepare customSettings update
    const customSettingsUpdate = {};
    if (quotaWarnings !== undefined) customSettingsUpdate.quotaWarnings = quotaWarnings;
    if (failedMessageThreshold !== undefined) customSettingsUpdate.failedMessageThreshold = failedMessageThreshold;
    if (apiErrorThreshold !== undefined) customSettingsUpdate.apiErrorThreshold = apiErrorThreshold;
    
    // Handle customApiKey (for custom SMS provider) - encrypt and store in customSettings
    // Only process if customApiKey is provided and not empty
    // If not provided, preserve existing encrypted key in database
    if (customApiKey !== undefined && customApiKey !== null) {
      const trimmedKey = String(customApiKey).trim();
      if (trimmedKey !== '') {
        try {
          console.log('Attempting to encrypt custom API key, length:', trimmedKey.length);
          const encryptedKey = encrypt(trimmedKey);
          console.log('Encryption successful, encrypted key length:', encryptedKey.length);
          customSettingsUpdate.customApiKey = encryptedKey;
          // Ensure smsProvider is set to 'other' when custom API key is provided
          if (mainData.smsProvider === undefined) {
            mainData.smsProvider = 'other';
          }
          console.log('Successfully encrypted custom API key');
        } catch (error) {
          console.error('Failed to encrypt custom API key');
          console.error('Error message:', error.message);
          console.error('Error name:', error.name);
          console.error('Error stack:', error.stack);
          console.error('Key to encrypt (first 10 chars):', trimmedKey.substring(0, 10));
          throw new AppError(`Failed to encrypt custom API key: ${error.message}`, 500);
        }
      }
      // If trimmedKey is empty, don't update customApiKey (preserve existing)
      // This allows users to update other fields without re-entering the API key
    }
    // If customApiKey is undefined, don't include it in customSettingsUpdate
    // The existing encrypted key will be preserved when we merge with currentCustomSettings
    
    // Merge incoming customSettings (e.g., customApiUrl, customApiUser, etc.)
    // IMPORTANT: Don't allow incomingCustomSettings to overwrite encrypted customApiKey
    if (incomingCustomSettings && typeof incomingCustomSettings === 'object') {
      // Remove customApiKey from incomingCustomSettings if it exists (we handle it separately above)
      const { customApiKey: _, ...safeIncomingSettings } = incomingCustomSettings;
      
      // Merge the safe settings
      Object.assign(customSettingsUpdate, safeIncomingSettings);
      
      // If custom SMS provider fields are being updated, ensure smsProvider is 'other'
      if (safeIncomingSettings.customApiUrl || safeIncomingSettings.customApiUser || 
          safeIncomingSettings.customEntityId) {
        if (mainData.smsProvider === undefined) {
          mainData.smsProvider = 'other';
        }
      }
    }

      if (!settings) {
        // Create if not exists
        const createData = { ...mainData };
        if (Object.keys(customSettingsUpdate).length > 0) {
          createData.customSettings = customSettingsUpdate;
        }
        await OrganizationSettings.create({
          organizationId,
          ...createData,
        });
      } else {
        // Encrypt sensitive fields if provided and not empty
        // Only encrypt if not already encrypted (avoid double encryption)
        const { isEncrypted } = require('../utils/encryption');
        
        if (mainData.whatsappAccessToken && mainData.whatsappAccessToken.trim() !== '') {
          // Only encrypt if not already encrypted
          if (!isEncrypted(mainData.whatsappAccessToken)) {
            try {
              mainData.whatsappAccessToken = encrypt(mainData.whatsappAccessToken);
            } catch (error) {
              console.error('Failed to encrypt WhatsApp access token:', error.message);
              throw new AppError(`Failed to encrypt WhatsApp access token: ${error.message}`, 500);
            }
          } else {
            // Already encrypted, use as-is
            logger.info('WhatsApp access token is already encrypted, using as-is');
          }
        }
      if (mainData.whatsappAppSecret && mainData.whatsappAppSecret.trim() !== '') {
        try {
          mainData.whatsappAppSecret = encrypt(mainData.whatsappAppSecret);
        } catch (error) {
          console.error('Failed to encrypt WhatsApp App Secret:', error.message);
          throw new AppError(`Failed to encrypt WhatsApp App Secret: ${error.message}`, 500);
        }
      }
      if (mainData.smsApiKeyEncrypted && mainData.smsApiKeyEncrypted.trim() !== '') {
        try {
          mainData.smsApiKeyEncrypted = encrypt(mainData.smsApiKeyEncrypted);
        } catch (error) {
          console.error('Failed to encrypt SMS API key:', error.message);
          // Continue without encryption if it fails
        }
      }
      if (mainData.emailApiKeyEncrypted && mainData.emailApiKeyEncrypted.trim() !== '') {
        try {
          mainData.emailApiKeyEncrypted = encrypt(mainData.emailApiKeyEncrypted);
        } catch (error) {
          console.error('Failed to encrypt Email API key:', error.message);
          // Continue without encryption if it fails
        }
      }
      if (mainData.fcmServerKeyEncrypted && mainData.fcmServerKeyEncrypted.trim() !== '') {
        try {
          mainData.fcmServerKeyEncrypted = encrypt(mainData.fcmServerKeyEncrypted);
        } catch (error) {
          console.error('Failed to encrypt FCM server key:', error.message);
          // Continue without encryption if it fails
        }
      }

        // Handle twilioAccountSid in customSettings
        if (twilioAccountSid !== undefined) {
          customSettingsUpdate.twilioAccountSid = twilioAccountSid;
        }

        // Merge customSettings if any
        if (Object.keys(customSettingsUpdate).length > 0) {
        // Handle current customSettings - might be string or object
        let currentCustomSettings = settings.customSettings || {};
        if (typeof currentCustomSettings === 'string') {
          try {
            currentCustomSettings = JSON.parse(currentCustomSettings);
          } catch (e) {
            console.warn('Failed to parse existing customSettings:', e.message);
            currentCustomSettings = {};
          }
        }
        if (!currentCustomSettings || typeof currentCustomSettings !== 'object') {
          currentCustomSettings = {};
        }
        
        mainData.customSettings = {
          ...currentCustomSettings,
          ...customSettingsUpdate,
        };
          console.log('Merged customSettings:', JSON.stringify(mainData.customSettings, null, 2));
        }

        try {
          await settings.update(mainData);
        } catch (error) {
        // If update fails due to missing columns, try raw SQL update
        if (error.name === 'SequelizeDatabaseError' || error.message.includes('Unknown column')) {
          logger.warn('Update failed, attempting raw SQL update (missing columns):', error.message);
          
          // Filter out fields that might not exist in database
          const safeFields = {};
          const knownFields = [
            'whatsappBusinessAccountId',
            'whatsappPhoneNumberId',
            'whatsappAccessToken',
            'whatsappApiVersion',
            'whatsappWebhookVerifyToken',
            'wabaLinkedVia',
          ];
          
          // Only include fields that definitely exist
          knownFields.forEach(field => {
            if (mainData[field] !== undefined) {
              safeFields[field] = mainData[field];
            }
          });
          
          // Try to include new fields if they exist, otherwise skip them
          const newFields = ['whatsappAppId', 'whatsappAppSecret', 'whatsappWebhookUrl'];
          for (const field of newFields) {
            if (mainData[field] !== undefined) {
              try {
                // Try to update with this field - if it fails, we'll catch it
                safeFields[field] = mainData[field];
              } catch (e) {
                logger.warn(`Skipping field ${field} (column may not exist):`, e.message);
              }
            }
          }
          
          // Update with safe fields only
          if (Object.keys(safeFields).length > 0) {
            await settings.update(safeFields);
          }
          
          // Handle customSettings separately
          if (mainData.customSettings) {
            const currentCustomSettings = settings.customSettings || {};
            const mergedCustomSettings = {
              ...(typeof currentCustomSettings === 'object' ? currentCustomSettings : {}),
              ...mainData.customSettings,
            };
            await settings.update({ customSettings: mergedCustomSettings });
          }
        } else {
          // Re-throw if it's a different error
          throw error;
        }
      }
      }

      const updatedSettings = await this.getOrganizationSettings(organizationId);
      console.log('Returning updated settings:', JSON.stringify(updatedSettings, null, 2));
      return updatedSettings;
    } catch (error) {
      logger.error('Error updating organization settings:', error);
      // If it's a database column error, provide helpful message
      if (error.message && error.message.includes('Unknown column')) {
        throw new AppError(
          'Database migration required. Please run: node backend/scripts/migrate-add-whatsapp-manual-fields.js',
          500
        );
      }
      throw error;
    }
  }

  /**
   * Get user preferences
   */
  async getUserPreferences(userId) {
    let preferences = await UserPreferences.findOne({
      where: { userId },
    });

    // Create default preferences if not exists
    if (!preferences) {
      preferences = await UserPreferences.create({
        userId,
      });
    }

    return preferences;
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(userId, data) {
    const preferences = await UserPreferences.findOne({
      where: { userId },
    });

    if (!preferences) {
      await UserPreferences.create({
        userId,
        ...data,
      });
    } else {
      await preferences.update(data);
    }

    return await this.getUserPreferences(userId);
  }
}

module.exports = new SettingsService();

