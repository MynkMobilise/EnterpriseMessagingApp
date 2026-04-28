const { Organization, User } = require('../models');
const { AppError, NotFoundError, ConflictError } = require('../utils/errorTypes');
const { Op } = require('sequelize');

class OrganizationService {
  /**
   * List organizations (for super admin or all orgs for current user)
   */
  async list(userId, userRole, userOrganizationId, filters = {}) {
    const where = {};
    
    // Regular users can only see their own organization
    // Super admins can see all organizations
    if (userRole !== 'super_admin') {
      where.id = userOrganizationId;
    }
    
    if (filters.status) {
      where.status = filters.status;
    }
    
    if (filters.plan) {
      where.plan = filters.plan;
    }
    
    if (filters.search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${filters.search}%` } },
        { industry: { [Op.like]: `%${filters.search}%` } },
        { slug: { [Op.like]: `%${filters.search}%` } },
      ];
    }

    const organizations = await Organization.findAll({
      where,
      attributes: {
        exclude: ['settings', 'metadata'],
      },
      order: [['createdAt', 'DESC']],
      limit: filters.limit || 100,
      offset: filters.offset || 0,
    });

    // Get user count for each organization
    const orgsWithUserCount = await Promise.all(
      organizations.map(async (org) => {
        const userCount = await User.count({
          where: { organizationId: org.id },
        });
        return {
          ...org.toJSON(),
          userCount,
        };
      })
    );

    return orgsWithUserCount;
  }

  /**
   * Get organization by ID
   */
  async getById(organizationId, userRole, userOrganizationId) {
    // Regular users can only access their own organization
    if (userRole !== 'super_admin' && organizationId !== userOrganizationId) {
      throw new AppError('Access denied', 403);
    }

    const organization = await Organization.findByPk(organizationId);

    if (!organization) {
      throw new NotFoundError('Organization');
    }

    const userCount = await User.count({
      where: { organizationId: organization.id },
    });

    return {
      ...organization.toJSON(),
      userCount,
    };
  }

  /**
   * Create organization (only super admin)
   */
  async create(createdBy, data) {
    const { name, industry, plan, status, maxUsers, maxMessagesPerMonth, slug } = data;

    // Generate slug from name if not provided
    let orgSlug = slug || this.generateSlug(name);

    // Ensure slug is unique by appending a number if needed
    let counter = 1;
    let uniqueSlug = orgSlug;
    while (true) {
      const existingOrg = await Organization.findOne({
        where: { slug: uniqueSlug },
      });

      if (!existingOrg) {
        orgSlug = uniqueSlug;
        break;
      }

      uniqueSlug = `${orgSlug}-${counter}`;
      counter++;
      
      // Safety check to prevent infinite loop
      if (counter > 1000) {
        // Fallback to timestamp-based slug
        orgSlug = `${orgSlug}-${Date.now()}`;
        break;
      }
    }

    // Create organization
    const organization = await Organization.create({
      name,
      slug: orgSlug,
      industry,
      plan: plan || 'starter',
      status: status || 'trial',
      maxUsers: maxUsers || 5,
      maxMessagesPerMonth: maxMessagesPerMonth || 1000,
      usedMessages: 0,
    });

    const userCount = await User.count({
      where: { organizationId: organization.id },
    });

    return {
      ...organization.toJSON(),
      userCount,
    };
  }

  /**
   * Update organization
   */
  async update(organizationId, userRole, userOrganizationId, data) {
    // Regular users can only update their own organization
    if (userRole !== 'super_admin' && organizationId !== userOrganizationId) {
      throw new AppError('Access denied', 403);
    }

    const organization = await Organization.findByPk(organizationId);

    if (!organization) {
      throw new NotFoundError('Organization');
    }

    const { name, industry, plan, status, maxUsers, maxMessagesPerMonth, slug, email, phone, website, address, description, settings } = data;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (industry !== undefined) updateData.industry = industry;
    if (plan !== undefined) updateData.plan = plan;
    if (status !== undefined) updateData.status = status;
    if (maxUsers !== undefined) updateData.maxUsers = maxUsers;
    if (maxMessagesPerMonth !== undefined) updateData.maxMessagesPerMonth = maxMessagesPerMonth;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (website !== undefined) updateData.website = website;
    if (address !== undefined) updateData.address = address;
    
    // Handle settings (timezone, language, dateFormat, currency, retention)
    if (description !== undefined || settings !== undefined) {
      const currentSettings = organization.settings || {};
      const newSettings = { ...currentSettings };
      
      if (description !== undefined) {
        newSettings.description = description;
      }
      
      if (settings !== undefined) {
        Object.assign(newSettings, settings);
      }
      
      updateData.settings = newSettings;
    }
    
    // If slug is being updated, check for conflicts
    if (slug !== undefined && slug !== organization.slug) {
      const existingOrg = await Organization.findOne({
        where: { slug },
      });
      if (existingOrg) {
        throw new ConflictError('Organization slug already exists');
      }
      updateData.slug = slug;
    }

    await organization.update(updateData);

    const userCount = await User.count({
      where: { organizationId: organization.id },
    });

    return {
      ...organization.toJSON(),
      userCount,
    };
  }

  /**
   * Delete organization (only super admin)
   */
  async delete(organizationId, userRole) {
    if (userRole !== 'super_admin') {
      throw new AppError('Only super admins can delete organizations', 403);
    }

    const organization = await Organization.findByPk(organizationId);

    if (!organization) {
      throw new NotFoundError('Organization');
    }

    // Check if organization has users
    const userCount = await User.count({
      where: { organizationId: organization.id },
    });

    if (userCount > 0) {
      throw new AppError('Cannot delete organization with existing users', 400);
    }

    await organization.destroy();

    return { message: 'Organization deleted successfully' };
  }

  /**
   * Generate slug from name
   */
  generateSlug(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}

module.exports = new OrganizationService();

