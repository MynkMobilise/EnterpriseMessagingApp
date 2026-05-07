const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const MessageEvent = sequelize.define('message_events', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  messageId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'message_id',
    references: {
      model: 'messages',
      key: 'id',
    },
  },
  eventType: {
    type: DataTypes.ENUM(
      'queued',
      'processing',
      'api_request',
      'api_response',
      'provider_selected',
      'fallback_attempted',
      'retry_attempted',
      'delivery_update',
      'sent',
      'delivered',
      'read',
      'failed',
      'clicked',
      'bounced'
    ),
    allowNull: false,
    field: 'event_type',
  },
  eventData: {
    type: DataTypes.JSON,
    field: 'event_data',
  },
  occurredAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'occurred_at',
  },
}, {
  timestamps: false,
  underscored: true,
  indexes: [
    { fields: ['message_id'] },
    { fields: ['event_type'] },
    { fields: ['occurred_at'] },
  ],
});

module.exports = MessageEvent;


