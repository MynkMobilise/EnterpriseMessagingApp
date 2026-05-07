const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const EmailConfiguration = sequelize.define('email_configurations', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  organizationId: {
    type: DataTypes.INTEGER,
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
    comment: 'Configuration name (e.g., "Primary SendGrid", "Backup SMTP")',
  },
  provider: {
    type: DataTypes.ENUM('smtp', 'sendgrid', 'ses', 'mailgun', 'other'),
    allowNull: false,
  },
  emailFromAddress: {
    type: DataTypes.STRING(255),
    allowNull: false,
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
  // SMTP-specific fields
  smtpHost: {
    type: DataTypes.STRING(255),
    field: 'smtp_host',
  },
  smtpPort: {
    type: DataTypes.INTEGER,
    field: 'smtp_port',
  },
  smtpSecure: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'smtp_secure',
  },
  smtpUsername: {
    type: DataTypes.STRING(255),
    field: 'smtp_username',
  },
  smtpPasswordEncrypted: {
    type: DataTypes.TEXT,
    field: 'smtp_password_encrypted',
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
  tlsOptions: {
    type: DataTypes.JSON,
    field: 'tls_options',
    comment: 'TLS configuration options (e.g., { rejectUnauthorized: false })',
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

module.exports = EmailConfiguration;

