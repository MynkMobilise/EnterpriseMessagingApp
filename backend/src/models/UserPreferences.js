const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UserPreferences = sequelize.define('user_preferences', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id',
    },
  },
  theme: {
    type: DataTypes.ENUM('light', 'dark', 'auto'),
    defaultValue: 'light',
  },
  language: {
    type: DataTypes.STRING(10),
    defaultValue: 'en',
  },
  timezone: {
    type: DataTypes.STRING(50),
    defaultValue: 'UTC',
  },
  dateFormat: {
    type: DataTypes.STRING(20),
    defaultValue: 'MM/DD/YYYY',
    field: 'date_format',
  },
  timeFormat: {
    type: DataTypes.ENUM('12h', '24h'),
    defaultValue: '12h',
    field: 'time_format',
  },
  emailNotifications: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'email_notifications',
  },
  desktopNotifications: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'desktop_notifications',
  },
  messageApprovalAlerts: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'message_approval_alerts',
  },
  dailyDigest: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'daily_digest',
  },
  defaultDashboard: {
    type: DataTypes.STRING(50),
    defaultValue: 'home',
    field: 'default_dashboard',
  },
  dashboardWidgets: {
    type: DataTypes.JSON,
    field: 'dashboard_widgets',
  },
  customPreferences: {
    type: DataTypes.JSON,
    field: 'custom_preferences',
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
    { fields: ['user_id'] },
  ],
});

module.exports = UserPreferences;


