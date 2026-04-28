const { User } = require('../models');
const authService = require('./authService');

class RoleService {
  /**
   * Get all available roles with their permissions
   */
  async getRoles() {
    const roles = ['super_admin', 'admin', 'manager', 'operator', 'viewer'];
    
    const rolesWithDetails = await Promise.all(
      roles.map(async (role) => {
        const permissions = authService.getDefaultPermissions(role);
        const userCount = await User.count({
          where: { role },
        });
        
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
   * Get role by name
   */
  async getRoleByName(roleName) {
    const roles = await this.getRoles();
    return roles.find((r) => r.name === roleName) || null;
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

