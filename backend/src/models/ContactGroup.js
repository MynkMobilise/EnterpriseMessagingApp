const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ContactGroup = sequelize.define('contact_groups', {
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
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'created_by',
    references: {
      model: 'users',
      key: 'id',
    },
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
  },
  color: {
    type: DataTypes.STRING(7),
    defaultValue: '#3B82F6',
  },
  isDynamic: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_dynamic',
  },
  filterConditions: {
    type: DataTypes.JSON,
    field: 'filter_conditions',
  },
  contactCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'contact_count',
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
    { fields: ['organization_id'] },
    { fields: ['deleted_at'] },
    {
      unique: true,
      fields: ['organization_id', 'name', 'deleted_at'],
      name: 'unique_group_name_per_org',
    },
  ],
});

module.exports = ContactGroup;


