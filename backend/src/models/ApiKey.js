const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ApiKey = sequelize.define('api_keys', {
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
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'created_by',
    references: {
      model: 'users',
      key: 'id',
    },
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  keyPrefix: {
    type: DataTypes.STRING(20),
    allowNull: false,
    field: 'key_prefix',
  },
  keyHash: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'key_hash',
  },
  keyHint: {
    type: DataTypes.STRING(20),
    allowNull: false,
    field: 'key_hint',
  },
  environment: {
    type: DataTypes.ENUM('production', 'development', 'staging'),
    defaultValue: 'production',
    allowNull: false,
  },
  scopes: {
    type: DataTypes.JSON,
  },
  rateLimitPerMinute: {
    type: DataTypes.INTEGER,
    defaultValue: 60,
    field: 'rate_limit_per_minute',
  },
  rateLimitPerDay: {
    type: DataTypes.INTEGER,
    defaultValue: 10000,
    field: 'rate_limit_per_day',
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'revoked'),
    defaultValue: 'active',
    allowNull: false,
  },
  allowedIps: {
    type: DataTypes.JSON,
    field: 'allowed_ips',
  },
  lastUsedAt: {
    type: DataTypes.DATE,
    field: 'last_used_at',
  },
  lastUsedIp: {
    type: DataTypes.STRING(45),
    field: 'last_used_ip',
  },
  totalRequests: {
    type: DataTypes.BIGINT,
    defaultValue: 0,
    field: 'total_requests',
  },
  expiresAt: {
    type: DataTypes.DATE,
    field: 'expires_at',
  },
  description: {
    type: DataTypes.TEXT,
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
  revokedAt: {
    type: DataTypes.DATE,
    field: 'revoked_at',
  },
  revokedBy: {
    type: DataTypes.UUID,
    field: 'revoked_by',
    references: {
      model: 'users',
      key: 'id',
    },
  },
  revokedReason: {
    type: DataTypes.TEXT,
    field: 'revoked_reason',
  },
}, {
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['organization_id'] },
    { fields: ['key_prefix'] },
    { fields: ['status'] },
    { fields: ['environment'] },
    { fields: ['created_at'] },
  ],
});

module.exports = ApiKey;


