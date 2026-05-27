const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// First-class per-tenant role. Seeded with 5 system rows per org (one for
// each legacy enum value) at migration time. Tenants add custom rows via the
// new RoleManagement UI, capped by the tenant's `maxCustomRoles` feature
// flag (Phase 1 work — see config/planFeatures.js).
const Role = sequelize.define('roles', {
  id: {
    type: DataTypes.BIGINT,
    autoIncrement: true,
    primaryKey: true,
  },
  organizationId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'organization_id',
    references: { model: 'organizations', key: 'id' },
  },
  // Display name. Editable for custom rows, immutable for system rows.
  name: {
    type: DataTypes.STRING(64),
    allowNull: false,
  },
  // System rows only: the legacy ENUM value (super_admin / admin / manager /
  // operator / viewer) so we can join `users.role` → `roles.role_key` during
  // backfill and during reads while the legacy column lives on.
  roleKey: {
    type: DataTypes.STRING(64),
    allowNull: true,
    field: 'role_key',
  },
  // Flat permission map (canSendMessages: true, ...). Mirrors the
  // PermissionKey union on the frontend (src/contexts/AuthContext.tsx).
  permissions: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: {},
  },
  // System rows are read-only in the new RoleManagement UI — they can't be
  // renamed or deleted. Org-level per-role permission overrides for system
  // roles still go through OrganizationRolePermissions (existing layer).
  isSystem: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_system',
  },
  description: {
    type: DataTypes.TEXT,
  },
  createdBy: {
    type: DataTypes.INTEGER,
    field: 'created_by',
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
    { fields: ['is_system'] },
    { unique: true, fields: ['organization_id', 'name', 'deleted_at'], name: 'uniq_role_name' },
  ],
});

module.exports = Role;
