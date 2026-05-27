const roleService = require('../services/roleService');

class RoleController {
  /**
   * List all roles
   */
  list = async (req, res, next) => {
    try {
      const roles = await roleService.getRoles(req.organizationId);
      res.json({
        success: true,
        data: roles,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get role by name
   */
  getByName = async (req, res, next) => {
    try {
      const role = await roleService.getRoleByName(req.params.name, req.organizationId);
      if (!role) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Role not found',
          },
        });
      }
      res.json({
        success: true,
        data: role,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get users by role
   */
  getUsersByRole = async (req, res, next) => {
    try {
      const users = await roleService.getUsersByRole(
        req.params.name,
        req.organizationId
      );
      res.json({
        success: true,
        data: users,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get role statistics
   */
  getStats = async (req, res, next) => {
    try {
      const stats = await roleService.getRoleStats(req.organizationId);
      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Replace this role's permissions for the caller's organization.
   * Body: { permissions: { canSendMessages: true, ... } }
   */
  updatePermissions = async (req, res, next) => {
    try {
      const { permissions } = req.body || {};
      const role = await roleService.updateRolePermissions(
        req.params.name,
        req.organizationId,
        permissions,
        req.user.id
      );
      res.json({ success: true, data: role, message: 'Permissions updated' });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Remove the per-org override and fall back to code defaults.
   */
  resetPermissions = async (req, res, next) => {
    try {
      const role = await roleService.resetRolePermissions(
        req.params.name,
        req.organizationId
      );
      res.json({ success: true, data: role, message: 'Permissions reset to defaults' });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Phase 2 — custom role CRUD. Cap enforced by the service via the tenant's
   * maxCustomRoles feature flag.
   */
  createCustom = async (req, res, next) => {
    try {
      const role = await roleService.createCustomRole(
        req.organizationId,
        req.user?.id,
        req.body || {}
      );
      res.status(201).json({ success: true, data: role, message: 'Custom role created' });
    } catch (error) {
      next(error);
    }
  };

  updateCustom = async (req, res, next) => {
    try {
      const role = await roleService.updateCustomRole(
        req.organizationId,
        req.params.id,
        req.body || {}
      );
      res.json({ success: true, data: role, message: 'Role updated' });
    } catch (error) {
      next(error);
    }
  };

  deleteCustom = async (req, res, next) => {
    try {
      await roleService.deleteCustomRole(req.organizationId, req.params.id);
      res.json({ success: true, message: 'Role deleted' });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Fetch a role by primary key (used by the UI's permission-editor modal).
   */
  getById = async (req, res, next) => {
    try {
      const role = await roleService.getRoleById(req.params.id, req.organizationId);
      if (!role) return res.status(404).json({ success: false, error: { message: 'Role not found' } });
      res.json({ success: true, data: role });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = new RoleController();

