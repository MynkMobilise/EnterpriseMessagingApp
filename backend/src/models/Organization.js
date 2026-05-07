const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Organization = sequelize.define('organizations', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  slug: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
  },
  industry: {
    type: DataTypes.STRING(100),
  },
  plan: {
    type: DataTypes.ENUM('starter', 'professional', 'enterprise'),
    defaultValue: 'starter',
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('active', 'trial', 'suspended', 'cancelled'),
    defaultValue: 'trial',
    allowNull: false,
  },
  trialEndsAt: {
    type: DataTypes.DATE,
    field: 'trial_ends_at',
  },
  subscriptionStartsAt: {
    type: DataTypes.DATE,
    field: 'subscription_starts_at',
  },
  maxUsers: {
    type: DataTypes.INTEGER,
    defaultValue: 5,
    field: 'max_users',
  },
  maxMessagesPerMonth: {
    type: DataTypes.INTEGER,
    defaultValue: 1000,
    field: 'max_messages_per_month',
  },
  usedMessages: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'used_messages',
  },
  email: {
    type: DataTypes.STRING(255),
  },
  phone: {
    type: DataTypes.STRING(50),
  },
  website: {
    type: DataTypes.STRING(500),
  },
  address: {
    type: DataTypes.TEXT,
  },
  logoUrl: {
    type: DataTypes.STRING(500),
    field: 'logo_url',
  },
  settings: {
    type: DataTypes.JSON,
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
    { fields: ['slug'] },
    { fields: ['status'] },
    { fields: ['deleted_at'] },
  ],
});

module.exports = Organization;


