const authService = require('../services/authService');
const ssoService = require('../services/ssoService');
const { AppError } = require('../utils/errorTypes');

class AuthController {
  /**
   * Register new user
   */
  async register(req, res, next) {
    try {
      const result = await authService.register(req.body);

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Login user
   */
  async login(req, res, next) {
    try {
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const result = await authService.login(req.body, ipAddress, userAgent);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        throw new AppError('Refresh token is required', 400);
      }

      const result = await authService.refreshToken(refreshToken);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify email
   */
  async verifyEmail(req, res, next) {
    try {
      const { token } = req.body;

      if (!token) {
        throw new AppError('Verification token is required', 400);
      }

      const result = await authService.verifyEmail(token);

      res.json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Forgot password
   */
  async forgotPassword(req, res, next) {
    try {
      const { email, organizationSlug } = req.body;

      await authService.forgotPassword(email, organizationSlug);

      res.json({
        success: true,
        message: 'If email exists, password reset link will be sent',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Change password on first login
   */
  async changePasswordOnFirstLogin(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        throw new AppError('Current password and new password are required', 400);
      }

      await authService.changePasswordOnFirstLogin(req.user.id, currentPassword, newPassword);

      res.json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reset password
   */
  async resetPassword(req, res, next) {
    try {
      const { token, newPassword } = req.body;

      await authService.resetPassword(token, newPassword);

      res.json({
        success: true,
        message: 'Password reset successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Logout
   */
  async logout(req, res, next) {
    try {
      const { refreshToken } = req.body;

      await authService.logout(refreshToken);

      res.json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get current user
   */
  async getCurrentUser(req, res, next) {
    try {
      const user = authService.sanitizeUser(req.user);
      // Include the organization (id, name, slug, plan) so the frontend chrome
      // can display the tenant name + role-gate UI without an extra fetch.
      const { Organization } = require('../models');
      const org = await Organization.findByPk(req.user.organizationId, {
        attributes: ['id', 'name', 'slug', 'plan', 'status', 'industry'],
      });

      res.json({
        success: true,
        data: { ...user, organization: org ? org.toJSON() : null },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Impersonate user (SuperAdmin only)
   * Allows SuperAdmin to login as another user for testing
   */
  async impersonate(req, res, next) {
    try {
      const { User, Organization } = require('../models');
      
      // Only SuperAdmin can impersonate
      if (req.user.role !== 'super_admin') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Only SuperAdmin can impersonate users',
          },
        });
      }

      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'User ID is required',
          },
        });
      }

      // Get the user to impersonate
      const targetUser = await User.findByPk(userId, {
        include: [
          {
            model: Organization,
            as: 'organization',
          },
        ],
      });

      if (!targetUser) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'User not found',
          },
        });
      }

      if (targetUser.status !== 'active') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Cannot impersonate inactive user',
          },
        });
      }

      // Generate tokens for the target user
      const { generateTokens } = require('../config/jwt');
      const tokens = generateTokens(targetUser);

      // Get permissions
      const permissions = targetUser.permissions || {};

      res.json({
        success: true,
        data: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          user: {
            id: targetUser.id,
            email: targetUser.email,
            firstName: targetUser.firstName,
            lastName: targetUser.lastName,
            role: targetUser.role,
            organizationId: targetUser.organizationId,
            organization: targetUser.organization,
            permissions,
            isImpersonated: true,
            originalUserId: req.user.id, // Track original SuperAdmin
          },
        },
        message: `Logged in as ${targetUser.email}`,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reset rate limits (Development only)
   * Clears all rate limit entries from memory
   */
  async resetRateLimits(req, res, next) {
    try {
      // Only allow in development
      if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Rate limit reset is not available in production',
          },
        });
      }

      const { resetRateLimits } = require('../middleware/rateLimiter');
      const result = resetRateLimits();

      res.json({
        success: true,
        data: result,
        message: 'Rate limits have been reset',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * SSO token exchange — partner portals POST a JWT signed with the org's
   * sso_secret; we verify it and return our own access + refresh tokens.
   */
  async ssoExchange(req, res, next) {
    try {
      const { orgSlug, organizationSlug, token } = req.body;
      const slug = orgSlug || organizationSlug;
      const result = await ssoService.exchange({
        orgSlug: slug,
        token,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
      });
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();


