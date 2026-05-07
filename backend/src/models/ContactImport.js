const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ContactImport = sequelize.define('contact_imports', {
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
  importedBy: {
    type: DataTypes.INTEGER,
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
  duplicateContacts: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'duplicate_contacts',
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
    { fields: ['created_at'] },
  ],
});

module.exports = ContactImport;


