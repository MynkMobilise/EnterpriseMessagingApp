const { Role, User, Organization, OrganizationRolePermissions } = require('../models');
const { Op } = require('sequelize');
const authService = require('./authService');
const { AppError, NotFoundError } = require('../utils/errorTypes');
const { effectiveFlags } = require('../utils/featureFlags');

// Phase 2 RBAC: the `roles` table is the primary source of truth for both
// system and custom roles. The legacy OrganizationRolePermissions table is
// kept for backward-compatibility — it's still consulted by the auth
// middleware as a final fallback if a user happens to have no roleId.
//
// API surface (back-compat with the original simple-roles design):
//   getRoles(orgId)                       → list (system + custom)
//   getRoleByName(name, orgId)            → resolve by name OR legacy roleKey
//   getRoleById(id, orgId)                → resolve by primary key
//   updateRolePermissions(name, ...)      → update Role.permissions JSON
//   resetRolePermissions(name, ...)       → restore code defaults
//   getRoleStats(orgId)                   → count users per role
//   getUsersByRole(name, orgId)           → list users assigned to a role
//
// New methods for the custom-role flow:
//   createCustomRole(orgId, by, data)     → enforces maxCustomRoles cap
//   updateCustomRole(orgId, id, data)
//   deleteCustomRole(orgId, id)
//   seedSystemRolesForOrg(orgId)          → idempotent; used on org-create
//   findSystemRoleByKey(orgId, roleKey)   → helper for user-creation

const SYSTEM_ROLE_KEYS = ['super_admin', 'admin', 'manager', 'operator', 'viewer'];

const SYSTEM_ROLE_NAMES = {
  super_admin: 'Super Admin',
  admin: 'Administrator',
  manager: 'Manager',
  operator: 'Operator',
  viewer: 'Viewer',
};

const VALID_PERMISSION_KEYS = [
  'canSendMessages', 'canApproveMessages', 'canManageUsers',
  'canManageTemplates', 'canManageContacts', 'canViewReports',
  'canManageSettings', 'canManageAPIKeys', 'canAssignRoles',
  'canManageOrganization', 'canViewLiveChat', 'canViewLeadership',
];

// Operator-level defaults for a newly-created custom role. Tenant Admin
// tunes the toggles from there.
const DEFAULT_CUSTOM_PERMISSIONS = {
  canSendMessages: true,
  canApproveMessages: false,
  canManageUsers: false,
  canManageTemplates: false,
  canManageContacts: true,
  canViewReports: false,
  canManageSettings: false,
  canManageAPIKeys: false,
  canAssignRoles: false,
  canManageOrganization: false,
  canViewLiveChat: true,
  canViewLeadership: false,
};

function sanitizePermissions(input) {
  const out = {};
  if (!input || typeof input !== 'object') return out;
  for (const k of VALID_PERMISSION_KEYS) {
    if (Object.prototype.hasOwnProperty.call(input, k)) out[k] = Boolean(input[k]);
  }
  return out;
}

class RoleService {
  /**
   * List all roles for an organization (system rows first, then custom rows
   * alphabetically), with user-count enrichment for the UI.
   */
  async getRoles(organizationId) {
    if (!organizationId) return [];
    // Make sure system rows exist (covers freshly-created orgs that haven't
    // hit the seed yet — cheap, idempotent).
    await this.seedSystemRolesForOrg(organizationId);

    const rows = await Role.findAll({
      where: { organizationId },
      order: [['isSystem', 'DESC'], ['name', 'ASC']],
    });

    const counts = await User.findAll({
      attributes: ['roleId', [User.sequelize.fn('COUNT', '*'), 'count']],
      where: {
        organizationId,
        roleId: { [Op.in]: rows.map((r) => r.id) },
      },
      group: ['roleId'],
      raw: true,
    });
    const countByRoleId = Object.fromEntries(counts.map((c) => [String(c.roleId), Number(c.count)]));

    return rows.map((r) => {
      const j = r.toJSON();
      j.userCount = countByRoleId[String(r.id)] || 0;
      // Back-compat shape for the existing RoleManagement / UserManagement UI:
      // it relied on `name` being the legacy enum value (super_admin / admin /
      // ...) to colour badges and gate "can't edit super_admin" actions.
      // Custom rows have no enum value — they expose their display name as
      // `name`. The DB display name is always available as `displayName`.
      j.displayName = j.name;
      if (j.isSystem && j.roleKey) j.name = j.roleKey;
      j.isSystemRole = j.isSystem;
      return j;
    });
  }

  /**
   * Resolve a role by its identifier — accepts the numeric id (preferred)
   * OR the legacy ENUM key (super_admin/admin/...) OR the display name.
   */
  async getRoleByName(identifier, organizationId) {
    if (!organizationId || identifier == null) return null;
    await this.seedSystemRolesForOrg(organizationId);

    // Numeric → look up by primary key.
    if (/^\d+$/.test(String(identifier))) {
      const byId = await Role.findOne({
        where: { id: Number(identifier), organizationId },
      });
      if (byId) return await this._enrichSingle(byId, organizationId);
    }
    // Try legacy roleKey (system rows).
    let row = await Role.findOne({
      where: { organizationId, roleKey: String(identifier) },
    });
    if (!row) {
      // Then name match (case-insensitive).
      row = await Role.findOne({
        where: { organizationId, name: { [Op.like]: String(identifier) } },
      });
    }
    if (!row) return null;
    return await this._enrichSingle(row, organizationId);
  }

  async getRoleById(id, organizationId) {
    const row = await Role.findOne({ where: { id, organizationId } });
    if (!row) return null;
    return await this._enrichSingle(row, organizationId);
  }

  async _enrichSingle(role, organizationId) {
    const j = role.toJSON();
    j.userCount = await User.count({ where: { organizationId, roleId: role.id } });
    j.displayName = j.name;
    if (j.isSystem && j.roleKey) j.name = j.roleKey;
    j.isSystemRole = j.isSystem;
    return j;
  }

  /**
   * Replace a role's permissions. For system rows: updates the Role row
   * directly AND mirrors to OrganizationRolePermissions so the legacy
   * middleware path (used by users without a roleId) sees the same change.
   * super_admin remains uneditable — the platform owner must keep every
   * permission to recover from a bad config.
   */
  async updateRolePermissions(identifier, organizationId, permissions, updatedBy) {
    const role = await this._getRowByIdentifier(identifier, organizationId);
    if (!role) throw new AppError(`Unknown role: ${identifier}`, 400);
    if (role.roleKey === 'super_admin') {
      throw new AppError('The Super Admin role cannot be edited', 403);
    }
    if (!permissions || typeof permissions !== 'object') {
      throw new AppError('permissions must be an object', 400);
    }

    const sanitized = sanitizePermissions(permissions);
    await role.update({ permissions: sanitized });

    // For system rows, also keep the legacy override table in sync so any
    // user whose roleId is still null (e.g. a row inserted by older code)
    // continues to see the same permission set.
    if (role.isSystem && role.roleKey) {
      try {
        await OrganizationRolePermissions.upsert({
          organizationId,
          role: role.roleKey,
          permissions: sanitized,
          updatedBy,
          updatedAt: new Date(),
        });
      } catch (_) { /* legacy table missing — non-fatal */ }
    }

    return await this._enrichSingle(role, organizationId);
  }

  /**
   * Restore a role's permissions to code defaults (system rows only). For
   * custom rows the concept of "reset" doesn't apply — they have no defaults.
   */
  async resetRolePermissions(identifier, organizationId) {
    const role = await this._getRowByIdentifier(identifier, organizationId);
    if (!role) throw new AppError(`Unknown role: ${identifier}`, 400);
    if (!role.isSystem) {
      throw new AppError('Only system roles can be reset to defaults.', 400);
    }
    const defaults = authService.getDefaultPermissions(role.roleKey);
    await role.update({ permissions: defaults });
    try {
      await OrganizationRolePermissions.destroy({
        where: { organizationId, role: role.roleKey },
      });
    } catch (_) { /* legacy table missing — non-fatal */ }
    return await this._enrichSingle(role, organizationId);
  }

  async getUsersByRole(identifier, organizationId) {
    const role = await this._getRowByIdentifier(identifier, organizationId);
    if (!role) return [];
    return await User.findAll({
      where: { organizationId, roleId: role.id },
      attributes: ['id', 'email', 'firstName', 'lastName', 'status', 'createdAt'],
      order: [['createdAt', 'DESC']],
    });
  }

  async getRoleStats(organizationId) {
    const rows = await Role.findAll({
      where: { organizationId },
      attributes: ['id', 'name', 'roleKey', 'isSystem'],
    });
    const counts = await User.findAll({
      attributes: ['roleId', [User.sequelize.fn('COUNT', '*'), 'count']],
      where: { organizationId, roleId: { [Op.in]: rows.map((r) => r.id) } },
      group: ['roleId'],
      raw: true,
    });
    const countByRoleId = Object.fromEntries(counts.map((c) => [String(c.roleId), Number(c.count)]));
    return rows.reduce((acc, r) => {
      // Keep the legacy "by-roleKey" stats shape for system rows so existing
      // frontend code keeps working. Custom rows index by their numeric id.
      const key = r.isSystem && r.roleKey ? r.roleKey : `role_${r.id}`;
      acc[key] = countByRoleId[String(r.id)] || 0;
      return acc;
    }, {});
  }

  /* ----- Custom-role lifecycle (Phase 2) ------------------------------- */

  async createCustomRole(organizationId, createdBy, data) {
    const name = (data?.name || '').trim();
    if (!name) throw new AppError('Role name is required', 400);
    if (name.length > 64) throw new AppError('Role name must be 64 characters or less', 400);

    // Cap enforcement using the tenant's feature flag.
    const org = await Organization.findByPk(organizationId);
    const flags = effectiveFlags(org);
    const cap = Number.isFinite(flags.maxCustomRoles) ? flags.maxCustomRoles : 0;
    const existingCustomCount = await Role.count({
      where: { organizationId, isSystem: false },
    });
    if (cap <= 0) {
      throw new AppError(
        'Custom roles are not enabled for your organization. Contact your administrator to increase the limit.',
        400
      );
    }
    if (existingCustomCount >= cap) {
      throw new AppError(
        `You've used ${existingCustomCount} of ${cap} custom-role slots. Contact your administrator to increase the limit.`,
        400
      );
    }

    const dup = await Role.findOne({
      where: { organizationId, name: { [Op.like]: name } },
    });
    if (dup) throw new AppError('A role with this name already exists.', 409);

    const role = await Role.create({
      organizationId,
      name,
      roleKey: null,
      isSystem: false,
      description: data.description || null,
      permissions: sanitizePermissions(data.permissions || DEFAULT_CUSTOM_PERMISSIONS),
      createdBy,
    });
    return await this._enrichSingle(role, organizationId);
  }

  async updateCustomRole(organizationId, id, data) {
    const role = await Role.findOne({ where: { id, organizationId } });
    if (!role) throw new NotFoundError('Role');
    if (role.isSystem) {
      throw new AppError(
        'System roles cannot be edited via this endpoint. Use PUT /roles/:name/permissions to tune their permissions.',
        400
      );
    }

    const patch = {};
    if (typeof data.name === 'string') {
      const nm = data.name.trim();
      if (!nm) throw new AppError('Role name cannot be empty', 400);
      if (nm.length > 64) throw new AppError('Role name must be 64 characters or less', 400);
      if (nm.toLowerCase() !== role.name.toLowerCase()) {
        const dup = await Role.findOne({
          where: { organizationId, name: { [Op.like]: nm }, id: { [Op.ne]: id } },
        });
        if (dup) throw new AppError('A role with this name already exists.', 409);
      }
      patch.name = nm;
    }
    if (data.description !== undefined) {
      patch.description = data.description == null ? null : String(data.description);
    }
    if (data.permissions !== undefined) {
      patch.permissions = sanitizePermissions(data.permissions);
    }

    await role.update(patch);
    return await this._enrichSingle(role, organizationId);
  }

  async deleteCustomRole(organizationId, id) {
    const role = await Role.findOne({ where: { id, organizationId } });
    if (!role) throw new NotFoundError('Role');
    if (role.isSystem) {
      throw new AppError('System roles cannot be deleted.', 400);
    }
    const userCount = await User.count({ where: { organizationId, roleId: id } });
    if (userCount > 0) {
      throw new AppError(
        `Cannot delete: ${userCount} user${userCount === 1 ? '' : 's'} still assigned to this role. Reassign them first.`,
        400
      );
    }
    await role.destroy();
    return { id };
  }

  /* ----- Helpers ------------------------------------------------------- */

  async _getRowByIdentifier(identifier, organizationId) {
    if (/^\d+$/.test(String(identifier))) {
      return Role.findOne({ where: { id: Number(identifier), organizationId } });
    }
    let row = await Role.findOne({
      where: { organizationId, roleKey: String(identifier) },
    });
    if (!row) {
      row = await Role.findOne({
        where: { organizationId, name: { [Op.like]: String(identifier) } },
      });
    }
    return row;
  }

  async findSystemRoleByKey(organizationId, roleKey) {
    if (!SYSTEM_ROLE_KEYS.includes(roleKey)) return null;
    await this.seedSystemRolesForOrg(organizationId);
    return Role.findOne({
      where: { organizationId, roleKey, isSystem: true },
    });
  }

  /**
   * Idempotent: seed the 5 system roles for an org. Safe to call multiple
   * times. Existing per-org legacy permission overrides take precedence when
   * a system row is being seeded — we copy those into the Role row so the
   * tenant's tweaks survive the rollout.
   */
  async seedSystemRolesForOrg(organizationId) {
    const existing = await Role.findAll({
      where: { organizationId, isSystem: true },
      attributes: ['roleKey'],
    });
    const have = new Set(existing.map((r) => r.roleKey));
    const missing = SYSTEM_ROLE_KEYS.filter((k) => !have.has(k));
    if (missing.length === 0) return;

    // Pull legacy overrides so we don't accidentally regress a tenant's
    // tuned permissions when we materialize their system rows.
    let legacyOverrides = {};
    try {
      const legacyRows = await OrganizationRolePermissions.findAll({
        where: { organizationId, role: { [Op.in]: missing } },
        attributes: ['role', 'permissions'],
      });
      legacyOverrides = Object.fromEntries(legacyRows.map((r) => [r.role, r.permissions || {}]));
    } catch (_) { /* legacy table missing — fine */ }

    for (const key of missing) {
      const defaults = authService.getDefaultPermissions(key);
      const perms = { ...defaults, ...(legacyOverrides[key] || {}) };
      await Role.create({
        organizationId,
        name: SYSTEM_ROLE_NAMES[key],
        roleKey: key,
        isSystem: true,
        permissions: sanitizePermissions(perms),
        description: `Built-in ${SYSTEM_ROLE_NAMES[key]} role.`,
      }).catch(() => { /* race: another request seeded it — ignore */ });
    }
  }

  /**
   * Display helpers — retained for back-compat.
   */
  getDisplayName(role) { return SYSTEM_ROLE_NAMES[role] || role; }
  getDescription(role) {
    const descriptions = {
      super_admin: 'Full system access with all permissions including organization management',
      admin: 'Administrative access with user and settings management capabilities',
      manager: 'Management access with message approval and template management',
      operator: 'Standard user with message sending and contact management',
      viewer: 'Read-only access for viewing reports and data',
    };
    return descriptions[role] || 'No description available';
  }
}

module.exports = new RoleService();
