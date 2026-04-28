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
}

module.exports = new OrganizationController();

