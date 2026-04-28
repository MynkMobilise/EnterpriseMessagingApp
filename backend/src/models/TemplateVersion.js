const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TemplateVersion = sequelize.define('template_versions', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  templateId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'template_id',
    references: {
      model: 'templates',
      key: 'id',
    },
  },
  versionNumber: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'version_number',
  },
  body: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  variables: {
    type: DataTypes.JSON,
  },
  buttons: {
    type: DataTypes.JSON,
  },
  changedBy: {
    type: DataTypes.UUID,
    field: 'changed_by',
    references: {
      model: 'users',
      key: 'id',
    },
  },
  changeDescription: {
    type: DataTypes.TEXT,
    field: 'change_description',
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'created_at',
  },
}, {
  timestamps: false,
  underscored: true,
  indexes: [
    { fields: ['template_id'] },
    {
      unique: true,
      fields: ['template_id', 'version_number'],
      name: 'unique_template_version',
    },
  ],
});

module.exports = TemplateVersion;


