const organizationService = require('../services/organizationService');

class OrganizationController {
  /**
   * List organizations
   */
  list = async (req, res, next) => {
    try {
      const { status, plan, search, limit, offset } = req.query;
      
      const organizations = await organizationService.list(
        req.user.id,
        req.user.role,
        req.organizationId,
        {
          status,
          plan,
          search,
          limit: limit ? parseInt(limit) : undefined,
          offset: offset ? parseInt(offset) : undefined,
        }
      );

      res.json({
        success: true,
        data: organizations,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get organization by ID
   */
  getById = async (req, res, next) => {
    try {
      const organization = await organizationService.getById(
        req.params.id,
        req.user.role,
        req.organizationId
      );

      res.json({
        success: true,
        data: organization,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Create organization
   */
  create = async (req, res, next) => {
    try {
      const organization = await organizationService.create(req.user.id, req.body);

      res.status(201).json({
        success: true,
        data: organization,
        message: 'Organization created successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update organization
   */
  update = async (req, res, next) => {
    try {
      const organization = await organizationService.update(
        req.params.id,
        req.user.role,
        req.organizationId,
        req.body
      );

      res.json({
        success: true,
        data: organization,
        message: 'Organization updated successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete organization
   */
  delete = async (req, res, next) => {
    try {
      await organizationService.delete(req.params.id, req.user.role);

      res.json({
        success: true,
        message: 'Organization deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Super-admin: get effective feature flags for an organization.
   * Returns the three layers so the UI can show "plan default ON, overridden
   * to OFF" — much clearer than just the merged result.
   */
  getFeatures = async (req, res, next) => {
    try {
      if (req.user.role !== 'super_admin') {
        return res.status(403).json({ success: false, error: { message: 'Super admin only' } });
      }
      const { Organization } = require('../models');
      const { PLAN_FEATURES, FEATURE_KEYS } = require('../config/planFeatures');
      const { effectiveFlags } = require('../utils/featureFlags');
      const org = await Organization.findByPk(req.params.id);
      if (!org) {
        return res.status(404).json({ success: false, error: { message: 'Organization not found' } });
      }
      const plan = org.plan || 'starter';
      res.json({
        success: true,
        data: {
          organizationId: org.id,
          plan,
          baseline: PLAN_FEATURES[plan] || PLAN_FEATURES.starter,
          overrides: org.featureOverrides || {},
          effective: effectiveFlags(org),
          keys: FEATURE_KEYS,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Super-admin: replace the feature_overrides JSON for an organization.
   * Pass an empty object {} to reset the tenant to plan defaults.
   */
  updateFeatures = async (req, res, next) => {
    try {
      if (req.user.role !== 'super_admin') {
        return res.status(403).json({ success: false, error: { message: 'Super admin only' } });
      }
      const { Organization } = require('../models');
      const { effectiveFlags } = require('../utils/featureFlags');
      const org = await Organization.findByPk(req.params.id);
      if (!org) {
        return res.status(404).json({ success: false, error: { message: 'Organization not found' } });
      }
      const overrides = req.body && typeof req.body === 'object' ? (req.body.overrides || req.body) : {};
      await org.update({ featureOverrides: overrides });
      res.json({
        success: true,
        data: {
          organizationId: org.id,
          overrides: org.featureOverrides || {},
          effective: effectiveFlags(org),
        },
        message: 'Feature overrides updated',
      });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = new OrganizationController();

