const { User, OrganizationRolePermissions } = require('../models');
const authService = require('./authService');
const { AppError } = require('../utils/errorTypes');

const VALID_ROLES = ['super_admin', 'admin', 'manager', 'operator', 'viewer'];
const VALID_PERMISSION_KEYS = [
  'canSendMessages',
  'canApproveMessages',
  'canManageUsers',
  'canManageTemplates',
  'canManageContacts',
  'canViewReports',
  'canManageSettings',
  'canManageAPIKeys',
  'canAssignRoles',
  'canManageOrganization',
  'canViewLiveChat',
  'canViewLeadership',
];

class RoleService {
  /**
   * Merge code defaults + per-org overrides for a role. Used both by
   * getRoles (display) and the controller's update endpoint (return the new
   * effective permission set).
   */
  async getEffectivePermissions(role, organizationId) {
    const defaults = authService.getDefaultPermissions(role);
    if (!organizationId) return { ...defaults };
    try {
      const row = await OrganizationRolePermissions.findOne({
        where: { organizationId, role },
        attributes: ['permissions'],
      });
      if (row && row.permissions && typeof row.permissions === 'object') {
        return { ...defaults, ...row.permissions };
      }
    } catch (_) {
      // Table missing — fall through.
    }
    return { ...defaults };
  }

  /**
   * Get all available roles with their permissions
   */
  async getRoles(organizationId = null) {
    const rolesWithDetails = await Promise.all(
      VALID_ROLES.map(async (role) => {
        const permissions = await this.getEffectivePermissions(role, organizationId);
        const where = { role };
        if (organizationId) where.organizationId = organizationId;
        const userCount = await User.count({ where });

        return {
          name: role,
          displayName: this.getDisplayName(role),
          description: this.getDescription(role),
          permissions,
          userCount,
          isSystemRole: true,
        };
      })
    );

    return rolesWithDetails;
  }

  /**
   * Get role by name (with effective permissions for the caller's org).
   */
  async getRoleByName(roleName, organizationId = null) {
    if (!VALID_ROLES.includes(roleName)) return null;
    const permissions = await this.getEffectivePermissions(roleName, organizationId);
    const where = { role: roleName };
    if (organizationId) where.organizationId = organizationId;
    const userCount = await User.count({ where });
    return {
      name: roleName,
      displayName: this.getDisplayName(roleName),
      description: this.getDescription(roleName),
      permissions,
      userCount,
      isSystemRole: true,
    };
  }

  /**
   * Replace the per-org permission set for a role. Drops any keys not in the
   * VALID_PERMISSION_KEYS allowlist so the JSON column stays clean.
   *
   * super_admin is not editable — it's the platform owner and needs every
   * permission to recover from a bad config.
   */
  async updateRolePermissions(roleName, organizationId, permissions, updatedBy) {
    if (!VALID_ROLES.includes(roleName)) {
      throw new AppError(`Unknown role: ${roleName}`, 400);
    }
    if (roleName === 'super_admin') {
      throw new AppError('The super_admin role cannot be edited', 403);
    }
    if (!permissions || typeof permissions !== 'object') {
      throw new AppError('permissions must be an object', 400);
    }

    // Whitelist filter — boolean-coerce too.
    const sanitized = {};
    for (const key of VALID_PERMISSION_KEYS) {
      if (Object.prototype.hasOwnProperty.call(permissions, key)) {
        sanitized[key] = Boolean(permissions[key]);
      }
    }

    await OrganizationRolePermissions.upsert({
      organizationId,
      role: roleName,
      permissions: sanitized,
      updatedBy,
      updatedAt: new Date(),
    });

    return this.getRoleByName(roleName, organizationId);
  }

  /**
   * Reset the per-org override for a role — fall back to code defaults.
   */
  async resetRolePermissions(roleName, organizationId) {
    if (!VALID_ROLES.includes(roleName)) {
      throw new AppError(`Unknown role: ${roleName}`, 400);
    }
    await OrganizationRolePermissions.destroy({
      where: { organizationId, role: roleName },
    });
    return this.getRoleByName(roleName, organizationId);
  }

  /**
   * Get users by role
   */
  async getUsersByRole(roleName, organizationId = null) {
    const where = { role: roleName };
    if (organizationId) {
      where.organizationId = organizationId;
    }

    const users = await User.findAll({
      where,
      attributes: ['id', 'email', 'firstName', 'lastName', 'status', 'createdAt'],
      order: [['createdAt', 'DESC']],
    });

    return users;
  }

  /**
   * Get role statistics
   */
  async getRoleStats(organizationId = null) {
    const roles = ['super_admin', 'admin', 'manager', 'operator', 'viewer'];
    
    const stats = await Promise.all(
      roles.map(async (role) => {
        const where = { role };
        if (organizationId) {
          where.organizationId = organizationId;
        }
        
        const count = await User.count({ where });
        return {
          role,
          count,
        };
      })
    );

    return stats.reduce((acc, stat) => {
      acc[stat.role] = stat.count;
      return acc;
    }, {});
  }

  /**
   * Get display name for role
   */
  getDisplayName(role) {
    const displayNames = {
      super_admin: 'Super Admin',
      admin: 'Administrator',
      manager: 'Manager',
      operator: 'Operator',
      viewer: 'Viewer',
    };
    return displayNames[role] || role;
  }

  /**
   * Get description for role
   */
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

