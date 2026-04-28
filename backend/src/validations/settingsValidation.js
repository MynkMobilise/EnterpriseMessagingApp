const Joi = require('joi');

const settingsValidation = {
  updateOrganizationSettings: Joi.object({
    whatsappBusinessAccountId: Joi.string()
      .pattern(/^\d{15,18}$/)
      .allow(null, '')
      .optional()
      .messages({
        'string.pattern.base': 'WABA ID must be 15-18 numeric digits',
      }),
    whatsappPhoneNumberId: Joi.string()
      .pattern(/^\d{15,18}$/)
      .allow(null, '')
      .optional()
      .messages({
        'string.pattern.base': 'Phone Number ID must be 15-18 numeric digits',
      }),
    whatsappApiVersion: Joi.string().allow(null, '').optional(),
    whatsappAccessToken: Joi.string().min(50).allow(null, '').optional()
      .messages({
        'string.min': 'Access Token appears to be invalid (too short)',
      }),
    whatsappAppId: Joi.string()
      .pattern(/^\d{15,17}$/)
      .allow(null, '')
      .optional()
      .messages({
        'string.pattern.base': 'App ID must be 15-17 numeric digits',
      }),
    whatsappAppSecret: Joi.string().min(32).allow(null, '').optional()
      .messages({
        'string.min': 'App Secret appears to be invalid (too short)',
      }),
    whatsappWebhookVerifyToken: Joi.string().allow(null, '').optional(),
    whatsappWebhookUrl: Joi.string().uri().allow(null, '').optional()
      .messages({
        'string.uri': 'Webhook URL must be a valid URL',
      }),
    smsProvider: Joi.string().valid('twilio', 'nexmo', 'aws_sns', 'other').allow(null, '').optional(),
    smsApiKeyEncrypted: Joi.string().allow(null, '').optional(),
    smsSenderId: Joi.string().allow(null, '').optional(),
    emailProvider: Joi.string().valid('smtp', 'sendgrid', 'ses', 'mailgun', 'other').allow(null, '').optional(),
    emailFromAddress: Joi.string().email().allow(null, '').optional(),
    emailFromName: Joi.string().allow(null, '').optional(),
    emailApiKeyEncrypted: Joi.string().allow(null, '').optional(),
    fcmServerKeyEncrypted: Joi.string().allow(null, '').optional(),
    fcmProjectId: Joi.string().allow(null, '').optional(),
    requireMessageApproval: Joi.boolean().optional(),
    autoApproveTemplates: Joi.boolean().optional(),
    emailNotifications: Joi.boolean().optional(),
    webhookNotifications: Joi.boolean().optional(),
    twoFactorRequired: Joi.boolean().optional(),
    passwordExpiryDays: Joi.number().integer().min(0).max(365).optional(),
    sessionTimeoutMinutes: Joi.number().integer().min(0).max(1440).optional(),
    ipWhitelist: Joi.array().items(Joi.string().ip()).allow(null).optional(),
    quotaWarnings: Joi.boolean().optional(),
    failedMessageThreshold: Joi.string().allow(null, '').optional(),
    apiErrorThreshold: Joi.string().allow(null, '').optional(),
    // Custom SMS provider fields
    customApiKey: Joi.string().allow(null, '').optional(),
    customSettings: Joi.object().allow(null).optional(),
    twilioAccountSid: Joi.string().allow(null, '').optional(),
  }),

  updateUserPreferences: Joi.object({
    theme: Joi.string().valid('light', 'dark', 'auto').optional(),
    language: Joi.string().optional(),
    timezone: Joi.string().optional(),
    dateFormat: Joi.string().optional(),
    timeFormat: Joi.string().valid('12h', '24h').optional(),
    emailNotifications: Joi.boolean().optional(),
    desktopNotifications: Joi.boolean().optional(),
  }),
};

module.exports = { settingsValidation };


