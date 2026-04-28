const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SmsConfiguration = sequelize.define('sms_configurations', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  organizationId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'organization_id',
    references: {
      model: 'organizations',
      key: 'id',
    },
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Configuration name (e.g., "Primary Twilio", "Backup AWS SNS")',
  },
  provider: {
    type: DataTypes.ENUM('twilio', 'aws_sns', 'nexmo', 'other'),
    allowNull: false,
  },
  smsSenderId: {
    type: DataTypes.STRING(20),
    field: 'sms_sender_id',
  },
  smsApiKeyEncrypted: {
    type: DataTypes.TEXT,
    field: 'sms_api_key_encrypted',
  },
  // Twilio-specific fields
  twilioAccountSid: {
    type: DataTypes.STRING(255),
    field: 'twilio_account_sid',
  },
  // AWS SNS-specific fields
  awsRegion: {
    type: DataTypes.STRING(50),
    field: 'aws_region',
  },
  awsAccessKeyId: {
    type: DataTypes.STRING(255),
    field: 'aws_access_key_id',
  },
  awsSecretAccessKeyEncrypted: {
    type: DataTypes.TEXT,
    field: 'aws_secret_access_key_encrypted',
  },
  // Vonage/Nexmo-specific fields
  vonageApiKey: {
    type: DataTypes.STRING(255),
    field: 'vonage_api_key',
  },
  vonageApiSecretEncrypted: {
    type: DataTypes.TEXT,
    field: 'vonage_api_secret_encrypted',
  },
  isDefault: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_default',
  },
  isFallback: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_fallback',
  },
  priority: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Priority order (lower number = higher priority)',
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'testing'),
    defaultValue: 'active',
  },
  metadata: {
    type: DataTypes.JSON,
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
  deletedAt: {
    type: DataTypes.DATE,
    field: 'deleted_at',
  },
}, {
  timestamps: true,
  paranoid: true,
  underscored: true,
  indexes: [
    { fields: ['organization_id'] },
    { fields: ['organization_id', 'is_default'] },
    { fields: ['organization_id', 'is_fallback'] },
    { fields: ['organization_id', 'status'] },
  ],
});

module.exports = SmsConfiguration;

