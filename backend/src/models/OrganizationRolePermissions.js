const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * Per-organization override for a role's default permission set.
 * Layered between code defaults and per-user overrides in the auth middleware.
 */
const OrganizationRolePermissions = sequelize.define(
  'organization_role_permissions',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    organizationId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'organization_id',
      references: { model: 'organizations', key: 'id' },
    },
    role: {
      type: DataTypes.STRING(32),
      allowNull: false,
    },
    permissions: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    updatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'updated_by',
      references: { model: 'users', key: 'id' },
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'updated_at',
    },
  },
  {
    timestamps: false,
    underscored: true,
    indexes: [
      { unique: true, fields: ['organization_id', 'role'], name: 'unique_org_role' },
    ],
  }
);

module.exports = OrganizationRolePermissions;
