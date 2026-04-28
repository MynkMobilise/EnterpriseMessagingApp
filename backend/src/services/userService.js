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
   */
  async create(organizationId, createdBy, data) {
    const { email, firstName, lastName, role, phoneNumber, department, jobTitle, password } = data;

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

    // Create user
    const user = await User.create({
      organizationId,
      email: email.toLowerCase(),
      passwordHash: userPassword, // Will be hashed by beforeCreate hook
      firstName,
      lastName,
      role: role || 'operator',
      status: 'pending',
      phoneNumber,
      department,
      jobTitle,
      permissions: authService.getDefaultPermissions(role || 'operator'),
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
   * Update user
   */
  async update(userId, organizationId, data) {
    const user = await this.getById(userId, organizationId);

    const { firstName, lastName, role, status, phoneNumber, department, jobTitle, permissions } = data;

    const updateData = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (role !== undefined) {
      updateData.role = role;
      // Update permissions when role changes
      updateData.permissions = authService.getDefaultPermissions(role);
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

