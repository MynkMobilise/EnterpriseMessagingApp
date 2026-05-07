const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Session = sequelize.define('sessions', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id',
    },
  },
  refreshToken: {
    type: DataTypes.STRING(500),
    allowNull: false,
    field: 'refresh_token',
  },
  userAgent: {
    type: DataTypes.TEXT,
    field: 'user_agent',
  },
  ipAddress: {
    type: DataTypes.STRING(45),
    field: 'ip_address',
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'expires_at',
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'created_at',
  },
  revokedAt: {
    type: DataTypes.DATE,
    field: 'revoked_at',
  },
}, {
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['user_id'] },
    { fields: ['refresh_token'] },
    { fields: ['expires_at'] },
    { fields: ['revoked_at'] },
  ],
});

module.exports = Session;


