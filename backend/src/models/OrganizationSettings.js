const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const OrganizationSettings = sequelize.define('organization_settings', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  organizationId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    field: 'organization_id',
    references: {
      model: 'organizations',
      key: 'id',
    },
  },
  whatsappBusinessAccountId: {
    type: DataTypes.STRING(255),
    field: 'whatsapp_business_account_id',
  },
  whatsappPhoneNumberId: {
    type: DataTypes.STRING(255),
    field: 'whatsapp_phone_number_id',
  },
  whatsappApiVersion: {
    type: DataTypes.STRING(20),
    defaultValue: 'v18.0',
    field: 'whatsapp_api_version',
  },
  whatsappWebhookVerifyToken: {
    type: DataTypes.STRING(255),
    field: 'whatsapp_webhook_verify_token',
  },
  whatsappAccessToken: {
    type: DataTypes.TEXT,
    field: 'whatsapp_access_token',
  },
  whatsappAppId: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'whatsapp_app_id',
  },
  whatsappAppSecret: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'whatsapp_app_secret',
  },
  whatsappWebhookUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'whatsapp_webhook_url',
  },
  metaOAuthAccessToken: {
    type: DataTypes.TEXT,
    field: 'meta_oauth_access_token',
  },
  metaOAuthRefreshToken: {
    type: DataTypes.TEXT,
    field: 'meta_oauth_refresh_token',
  },
  metaOAuthExpiresAt: {
    type: DataTypes.DATE,
    field: 'meta_oauth_expires_at',
  },
  wabaLinkedAt: {
    type: DataTypes.DATE,
    field: 'waba_linked_at',
  },
  wabaLinkedBy: {
    type: DataTypes.UUID,
    field: 'waba_linked_by',
    references: {
      model: 'users',
      key: 'id',
    },
  },
  wabaLinkedVia: {
    type: DataTypes.ENUM('manual', 'oauth'),
    defaultValue: 'manual',
    field: 'waba_linked_via',
  },
  smsProvider: {
    type: DataTypes.ENUM('twilio', 'nexmo', 'aws_sns', 'other'),
    field: 'sms_provider',
  },
  smsApiKeyEncrypted: {
    type: DataTypes.TEXT,
    field: 'sms_api_key_encrypted',
  },
  smsSenderId: {
    type: DataTypes.STRING(20),
    field: 'sms_sender_id',
  },
  emailProvider: {
    type: DataTypes.ENUM('smtp', 'sendgrid', 'ses', 'mailgun', 'other'),
    field: 'email_provider',
  },
  emailFromAddress: {
    type: DataTypes.STRING(255),
    field: 'email_from_address',
  },
  emailFromName: {
    type: DataTypes.STRING(255),
    field: 'email_from_name',
  },
  emailApiKeyEncrypted: {
    type: DataTypes.TEXT,
    field: 'email_api_key_encrypted',
  },
  fcmServerKeyEncrypted: {
    type: DataTypes.TEXT,
    field: 'fcm_server_key_encrypted',
  },
  fcmProjectId: {
    type: DataTypes.STRING(255),
    field: 'fcm_project_id',
  },
  defaultMessageExpiryHours: {
    type: DataTypes.INTEGER,
    defaultValue: 24,
    field: 'default_message_expiry_hours',
  },
  requireMessageApproval: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'require_message_approval',
  },
  autoApproveTemplates: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'auto_approve_templates',
  },
  maxMessageLength: {
    type: DataTypes.INTEGER,
    defaultValue: 1600,
    field: 'max_message_length',
  },
  emailNotifications: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'email_notifications',
  },
  webhookNotifications: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'webhook_notifications',
  },
  slackWebhookUrl: {
    type: DataTypes.STRING(500),
    field: 'slack_webhook_url',
  },
  twoFactorRequired: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'two_factor_required',
  },
  passwordExpiryDays: {
    type: DataTypes.INTEGER,
    defaultValue: 90,
    field: 'password_expiry_days',
  },
  sessionTimeoutMinutes: {
    type: DataTypes.INTEGER,
    defaultValue: 60,
    field: 'session_timeout_minutes',
  },
  ipWhitelist: {
    type: DataTypes.JSON,
    field: 'ip_whitelist',
  },
  erpIntegrations: {
    type: DataTypes.JSON,
    field: 'erp_integrations',
  },
  webhookEndpoints: {
    type: DataTypes.JSON,
    field: 'webhook_endpoints',
  },
  companyLogoUrl: {
    type: DataTypes.STRING(500),
    field: 'company_logo_url',
  },
  brandColor: {
    type: DataTypes.STRING(7),
    defaultValue: '#3B82F6',
    field: 'brand_color',
  },
  customSettings: {
    type: DataTypes.JSON,
    field: 'custom_settings',
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'created_at',
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'updated_at',
  },
}, {
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['organization_id'] },
  ],
});

module.exports = OrganizationSettings;


