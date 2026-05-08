const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * One row per webhook POST received from Meta. Lets the Webhook Events page
 * surface live delivery activity to operators without server SSH.
 */
const WebhookEvent = sequelize.define('webhook_events', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  organizationId: {
    // Nullable: webhook for an unknown phone_number_id is still logged so
    // the operator can see why nothing's arriving.
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'organization_id',
  },
  field: {
    type: DataTypes.STRING(64),
    allowNull: true,
  },
  direction: {
    type: DataTypes.ENUM('inbound', 'status', 'template_status', 'unknown'),
    allowNull: false,
    defaultValue: 'unknown',
  },
  status: {
    type: DataTypes.ENUM('ok', 'skipped', 'unknown_org', 'error'),
    allowNull: false,
    defaultValue: 'ok',
  },
  summary: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  payload: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  errorMessage: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'error_message',
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'created_at',
  },
}, {
  tableName: 'webhook_events',
  timestamps: false, // we only have created_at
  underscored: true,
});

module.exports = WebhookEvent;
