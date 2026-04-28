const userService = require('../services/userService');

class UserController {
  /**
   * List users
   */
  list = async (req, res, next) => {
    try {
    const { role, status, search, limit, offset } = req.query;
    
      const users = await userService.list(req.organizationId, {
        role,
        status,
        search,
        limit: limit ? parseInt(limit) : undefined,
        offset: offset ? parseInt(offset) : undefined,
      });

      res.json({
        success: true,
        data: users,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get user by ID
   */
  getById = async (req, res, next) => {
    try {
      const user = await userService.getById(req.params.id, req.organizationId);

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Create user
   */
  create = async (req, res, next) => {
    try {
      const user = await userService.create(req.organizationId, req.user.id, req.body);

      res.status(201).json({
        success: true,
        data: user,
        message: 'User created successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update user
   */
  update = async (req, res, next) => {
    try {
      const user = await userService.update(req.params.id, req.organizationId, req.body);

      res.json({
        success: true,
        data: user,
        message: 'User updated successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete user
   */
  delete = async (req, res, next) => {
    try {
      await userService.delete(req.params.id, req.organizationId);

      res.json({
        success: true,
        message: 'User deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get user statistics
   */
  getStats = async (req, res, next) => {
    try {
      const stats = await userService.getStats(req.organizationId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Resend login credentials
   */
  resendCredentials = async (req, res, next) => {
    try {
      const result = await userService.resendCredentials(req.params.id, req.organizationId);

      res.json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = new UserController();

