const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ApiKeyUsageLog = sequelize.define('api_key_usage_logs', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  apiKeyId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'api_key_id',
    references: {
      model: 'api_keys',
      key: 'id',
    },
  },
  endpoint: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  method: {
    type: DataTypes.STRING(10),
    allowNull: false,
  },
  statusCode: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'status_code',
  },
  ipAddress: {
    type: DataTypes.STRING(45),
    field: 'ip_address',
  },
  userAgent: {
    type: DataTypes.TEXT,
    field: 'user_agent',
  },
  requestSizeBytes: {
    type: DataTypes.INTEGER,
    field: 'request_size_bytes',
  },
  responseSizeBytes: {
    type: DataTypes.INTEGER,
    field: 'response_size_bytes',
  },
  responseTimeMs: {
    type: DataTypes.INTEGER,
    field: 'response_time_ms',
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'created_at',
  },
}, {
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['api_key_id'] },
    { fields: ['created_at'] },
    { fields: ['endpoint'] },
  ],
});

module.exports = ApiKeyUsageLog;


