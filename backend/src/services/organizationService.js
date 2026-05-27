const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { Organization, OrganizationSettings, User } = require('../models');
const { AppError, NotFoundError, ConflictError } = require('../utils/errorTypes');
const { Op } = require('sequelize');
const { encrypt } = require('../utils/encryption');
const { sendWelcomeOrganizationEmail } = require('../config/email');
const logger = require('../utils/logger');
const authService = require('./authService');

// Generate a friendly random password (alphanum + symbol) for the auto-created admin.
function generateInitialPassword() {
  const charset = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const symbols = '!@#$%^&*';
  let pw = '';
  for (let i = 0; i < 10; i++) pw += charset[Math.floor(Math.random() * charset.length)];
  pw += symbols[Math.floor(Math.random() * symbols.length)];
  return pw;
}

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
   * Create organization (only super admin).
   *
   * Side effects beyond inserting the org row:
   *   1. Creates an organization_settings row with a freshly-generated SSO secret
   *      (encrypted at rest with the app-wide ENCRYPTION_KEY).
   *   2. Auto-creates an admin user using the provided contact email + a random
   *      initial password marked must-change-on-first-login.
   *   3. Sends a welcome email to the contact email with login URL + slug + the
   *      initial password. Email failures are logged but do NOT roll back
   *      creation — the org is still usable, the admin can use forgot-password.
   */
  async create(createdBy, data) {
    const { name, industry, plan, status, maxUsers, maxMessagesPerMonth, slug, email, phone, website } = data;

    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      throw new AppError('A valid contact email is required to create an organization (welcome email will be sent here).', 400);
    }

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
      email,
      phone,
      website,
    });

    // Generate SSO secret (64 hex chars = 256 bits) and provision settings row.
    // Stored encrypted with the app-wide ENCRYPTION_KEY so a DB dump alone is
    // not enough to forge SSO tokens.
    const ssoSecretPlain = crypto.randomBytes(32).toString('hex');
    const ssoSecretEncrypted = encrypt(ssoSecretPlain);
    await OrganizationSettings.create({
      organizationId: organization.id,
      ssoEnabled: false,
      ssoSecretEncrypted,
      ssoDefaultRole: 'operator',
    });

    // Seed the 5 system roles for this brand-new org so the first admin user
    // (created below) and any future users can be assigned a roleId without
    // waiting for the migration script to be re-run.
    try {
      const roleService = require('./roleService');
      await roleService.seedSystemRolesForOrg(organization.id);
    } catch (e) {
      // Non-fatal: the migration's seed step will eventually catch this up.
      console.warn('seedSystemRolesForOrg failed for new org:', e.message);
    }

    // Auto-create admin user. Initial password is generated; user is forced to
    // change it on first login via the existing must-change-password flow.
    const initialPassword = generateInitialPassword();
    const passwordHash = await bcrypt.hash(initialPassword, 10);
    const adminPermissions = authService.getDefaultPermissions('admin');

    // Look up the seeded "admin" system Role row for this org and link the
    // new user via roleId. Cheap — the seed runs above. If for any reason it
    // failed, the legacy enum field still keeps the user working.
    let adminRoleId = null;
    try {
      const roleService = require('./roleService');
      const adminRole = await roleService.findSystemRoleByKey(organization.id, 'admin');
      adminRoleId = adminRole ? adminRole.id : null;
    } catch (_) { /* non-fatal */ }

    let adminUser;
    try {
      adminUser = await User.create({
        organizationId: organization.id,
        email,
        passwordHash,
        firstName: 'Admin',
        lastName: name.split(/\s+/)[0] || 'User',
        role: 'admin',
        roleId: adminRoleId,
        status: 'active',
        emailVerified: false,
        mustChangePassword: true,
        permissions: adminPermissions,
        authProvider: 'local',
      });
    } catch (e) {
      // Could fail if the email is already a user in another org with a unique constraint;
      // we don't fail the org creation but log it loudly.
      logger.error('Org created but admin user creation failed', { orgId: organization.id, error: e.message });
    }

    // Send welcome email (best-effort — never block org creation on SMTP).
    sendWelcomeOrganizationEmail({
      to: email,
      organizationName: name,
      organizationSlug: orgSlug,
      adminEmail: email,
      adminPassword: adminUser ? initialPassword : null,
      loginUrl: process.env.FRONTEND_URL?.split(',')[0],
    }).catch((err) => {
      logger.warn('Welcome email failed to send', { orgId: organization.id, error: err.message });
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

