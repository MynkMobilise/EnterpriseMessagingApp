const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const BulkMessageBatch = sequelize.define('bulk_message_batches', {
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
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'created_by',
    references: {
      model: 'users',
      key: 'id',
    },
  },
  name: {
    type: DataTypes.STRING(255),
  },
  templateId: {
    type: DataTypes.INTEGER,
    field: 'template_id',
    references: {
      model: 'templates',
      key: 'id',
    },
  },
  totalRecipients: {
    type: DataTypes.INTEGER,
    field: 'total_recipients',
  },
  totalSent: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'total_sent',
  },
  totalDelivered: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'total_delivered',
  },
  totalFailed: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'total_failed',
  },
  status: {
    type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed'),
    defaultValue: 'pending',
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'created_at',
  },
  startedAt: {
    type: DataTypes.DATE,
    field: 'started_at',
  },
  completedAt: {
    type: DataTypes.DATE,
    field: 'completed_at',
  },
}, {
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['organization_id'] },
    { fields: ['status'] },
    { fields: ['created_at'] },
  ],
});

module.exports = BulkMessageBatch;


