const { User, Organization } = require('../models');
const { AppError, NotFoundError, ConflictError } = require('../utils/errorTypes');
const authService = require('./authService');
const { sendLoginCredentialsEmail } = require('../config/email');

class UserService {
  /**
   * List users in organization
   */
  async list(organizationId, filters = {}) {
    const where = { organizationId };
    
    if (filters.role) {
      where.role = filters.role;
    }
    
    if (filters.status) {
      where.status = filters.status;
    }
    
    if (filters.search) {
      const { Op } = require('sequelize');
      where[Op.or] = [
        { firstName: { [Op.like]: `%${filters.search}%` } },
        { lastName: { [Op.like]: `%${filters.search}%` } },
        { email: { [Op.like]: `%${filters.search}%` } },
      ];
    }

    const users = await User.findAll({
      where,
      include: [
        {
          model: Organization,
          as: 'organization',
          attributes: ['id', 'name', 'slug'],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: filters.limit || 100,
      offset: filters.offset || 0,
    });

    return users;
  }

  /**
   * Get user by ID
   */
  async getById(userId, organizationId) {
    const user = await User.findOne({
      where: {
        id: userId,
        organizationId,
      },
      include: [
        {
          model: Organization,
          as: 'organization',
          attributes: ['id', 'name', 'slug'],
        },
      ],
    });

    if (!user) {
      throw new NotFoundError('User');
    }

    return user;
  }

  /**
   * Create user
   *
   * Accepts EITHER:
   *   - `roleId` (Phase 2 — points at a row in the `roles` table; this is
   *     the preferred way going forward), OR
   *   - `role` (legacy enum string — kept for backward-compatibility with
   *     existing API consumers and the SSO flow). When roleId is omitted but
   *     role is provided, we look up the seeded system Role row by its
   *     roleKey to derive a roleId, so every new user lands with both fields
   *     populated.
   */
  async create(organizationId, createdBy, data) {
    const { email, firstName, lastName, role, roleId, phoneNumber, department, jobTitle, password } = data;

    // Check if email already exists
    const existingUser = await User.findOne({
      where: {
        email: email.toLowerCase(),
        organizationId,
      },
    });

    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    // Check user limit
    const organization = await Organization.findByPk(organizationId);
    if (!organization) {
      throw new NotFoundError('Organization');
    }

    const userCount = await User.count({
      where: { organizationId },
    });

    if (userCount >= organization.maxUsers) {
      throw new AppError('Organization user limit reached', 429);
    }

    // Generate default password if not provided
    const userPassword = password || this.generateTemporaryPassword();
    const temporaryPassword = userPassword; // Store plain password for email

    // Resolve the Phase 2 Role row + the legacy enum string. Both columns
    // get populated so the legacy fallback paths keep working.
    const roleService = require('./roleService');
    let resolvedRoleRow = null;
    if (roleId) {
      resolvedRoleRow = await roleService.getRoleById(roleId, organizationId);
      if (!resolvedRoleRow) throw new AppError('Unknown roleId', 400);
    } else {
      const roleKey = role || 'operator';
      resolvedRoleRow = await roleService.findSystemRoleByKey(organizationId, roleKey);
      // For non-system role names (custom role), look up by name.
      if (!resolvedRoleRow) {
        const byName = await roleService.getRoleByName(roleKey, organizationId);
        if (byName) resolvedRoleRow = byName;
      }
    }
    // Effective legacy enum value: prefer the Role row's roleKey (set on
    // system rows). For custom roles, fall back to 'operator' so the enum
    // column stays satisfied even though it isn't authoritative anymore.
    const legacyRoleEnum = resolvedRoleRow?.roleKey || role || 'operator';
    const effectivePermissions = resolvedRoleRow?.permissions
      || authService.getDefaultPermissions(legacyRoleEnum);

    // Create user
    const user = await User.create({
      organizationId,
      email: email.toLowerCase(),
      passwordHash: userPassword, // Will be hashed by beforeCreate hook
      firstName,
      lastName,
      role: legacyRoleEnum,
      roleId: resolvedRoleRow?.id || null,
      status: 'pending',
      phoneNumber,
      department,
      jobTitle,
      permissions: effectivePermissions,
      mustChangePassword: true, // Require password change on first login
    });

    // Send welcome email with temporary password
    try {
      await sendLoginCredentialsEmail(
        email.toLowerCase(),
        email.toLowerCase(),
        temporaryPassword,
        organization.name,
        organization.slug
      );
    } catch (emailError) {
      console.error('Failed to send login credentials email:', emailError);
      // Don't fail user creation if email fails, but log the error
    }

    return user;
  }

  /**
   * Update user. Either `roleId` (Phase 2) or `role` (legacy enum) may be
   * provided to re-assign; we resolve to a Role row, set both columns, and
   * (when reassigning) reset the user's per-user permission overrides to
   * the new role's permissions so the change actually takes effect.
   */
  async update(userId, organizationId, data) {
    const user = await this.getById(userId, organizationId);

    const { firstName, lastName, role, roleId, status, phoneNumber, department, jobTitle, permissions } = data;

    const updateData = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;

    if (roleId !== undefined || role !== undefined) {
      const roleService = require('./roleService');
      let row = null;
      if (roleId !== undefined && roleId !== null) {
        row = await roleService.getRoleById(roleId, organizationId);
        if (!row) throw new AppError('Unknown roleId', 400);
      } else if (role !== undefined) {
        row = await roleService.findSystemRoleByKey(organizationId, role)
          || await roleService.getRoleByName(role, organizationId);
      }
      updateData.role = row?.roleKey || role || user.role;
      updateData.roleId = row?.id || null;
      // Reset per-user permission overrides so the assignment actually shifts
      // the effective permission set. If the caller also passed `permissions`
      // explicitly below, that wins.
      updateData.permissions = row?.permissions || authService.getDefaultPermissions(updateData.role);
    }

    if (status !== undefined) updateData.status = status;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
    if (department !== undefined) updateData.department = department;
    if (jobTitle !== undefined) updateData.jobTitle = jobTitle;
    if (permissions !== undefined) updateData.permissions = permissions;

    await user.update(updateData);

    return user;
  }

  /**
   * Delete user
   */
  async delete(userId, organizationId) {
    const user = await this.getById(userId, organizationId);
    await user.destroy();
    return { message: 'User deleted successfully' };
  }

  /**
   * Get user statistics
   */
  async getStats(organizationId) {
    const total = await User.count({ where: { organizationId } });
    const active = await User.count({ where: { organizationId, status: 'active' } });
    const inactive = await User.count({ where: { organizationId, status: 'inactive' } });
    const pending = await User.count({ where: { organizationId, status: 'pending' } });
    const suspended = await User.count({ where: { organizationId, status: 'suspended' } });
    
    const admins = await User.count({
      where: {
        organizationId,
        role: ['admin', 'super_admin'],
      },
    });

    return {
      total,
      active,
      inactive,
      pending,
      suspended,
      admins,
    };
  }

  /**
   * Generate temporary password
   */
  generateTemporaryPassword() {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  }

  /**
   * Resend login credentials to user
   */
  async resendCredentials(userId, organizationId) {
    const user = await this.getById(userId, organizationId);
    const organization = await Organization.findByPk(organizationId);

    if (!organization) {
      throw new NotFoundError('Organization');
    }

    // Generate new temporary password
    const temporaryPassword = this.generateTemporaryPassword();

    // Update user password and set mustChangePassword flag
    await user.update({
      passwordHash: temporaryPassword, // Will be hashed by beforeUpdate hook
      mustChangePassword: true,
    });

    // Send email with new credentials
    try {
      await sendLoginCredentialsEmail(
        user.email,
        user.email,
        temporaryPassword,
        organization.name,
        organization.slug
      );
    } catch (emailError) {
      console.error('Failed to send login credentials email:', emailError);
      throw new AppError('Failed to send email. Please try again later.', 500);
    }

    return { message: 'Login credentials sent successfully' };
  }
}

module.exports = new UserService();

