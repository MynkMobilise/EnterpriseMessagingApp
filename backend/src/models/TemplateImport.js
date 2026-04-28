const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TemplateImport = sequelize.define('template_imports', {
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
  importedBy: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'imported_by',
    references: {
      model: 'users',
      key: 'id',
    },
  },
  filename: {
    type: DataTypes.STRING(255),
  },
  fileSize: {
    type: DataTypes.INTEGER,
    field: 'file_size',
  },
  channel: {
    type: DataTypes.ENUM('sms', 'whatsapp', 'email', 'fcm'),
    allowNull: false,
  },
  totalRows: {
    type: DataTypes.INTEGER,
    field: 'total_rows',
  },
  successfulImports: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'successful_imports',
  },
  failedImports: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'failed_imports',
  },
  duplicateTemplates: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'duplicate_templates',
  },
  status: {
    type: DataTypes.ENUM('processing', 'completed', 'failed'),
    defaultValue: 'processing',
    allowNull: false,
  },
  errorLog: {
    type: DataTypes.JSON,
    field: 'error_log',
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'created_at',
  },
  completedAt: {
    type: DataTypes.DATE,
    field: 'completed_at',
  },
}, {
  timestamps: false,
  underscored: true,
  indexes: [
    { fields: ['organization_id'] },
    { fields: ['status'] },
    { fields: ['channel'] },
    { fields: ['created_at'] },
  ],
});

module.exports = TemplateImport;

