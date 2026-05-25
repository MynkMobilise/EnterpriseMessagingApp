const { User, Organization, OrganizationRolePermissions } = require('../models');
const { AppError, AuthenticationError, AuthorizationError } = require('../utils/errorTypes');
const { verifyAccessToken } = require('../config/jwt');
const authService = require('../services/authService');

/**
 * Authenticate user via JWT token
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('No token provided');
    }

    const token = authHeader.substring(7);

    // Verify token
    const decoded = verifyAccessToken(token);

    // Get user from database
    const user = await User.findByPk(decoded.userId, {
      include: [
        {
          model: Organization,
          as: 'organization',
        },
      ],
    });

    if (!user) {
      throw new AuthenticationError('User not found');
    }

    if (user.status !== 'active') {
      throw new AppError('User account is not active', 403);
    }

    // Three-layer permission merge (most general → most specific):
    //   1. code defaults for the role (authService.getDefaultPermissions)
    //   2. per-org overrides for the role (organization_role_permissions)
    //   3. per-user overrides (user.permissions)
    // Each later layer wins, so admins can re-shape what an "operator" can
    // do in their org without touching code, and individual users can be
    // tuned beyond that. Failure to look up the org-override row is non-fatal
    // (treat as "no override") so a missing table on a fresh deploy doesn't
    // break login.
    const roleDefaults = authService.getDefaultPermissions(user.role);
    let orgRoleOverrides = {};
    try {
      if (OrganizationRolePermissions) {
        const row = await OrganizationRolePermissions.findOne({
          where: { organizationId: user.organizationId, role: user.role },
          attributes: ['permissions'],
        });
        if (row && row.permissions && typeof row.permissions === 'object') {
          orgRoleOverrides = row.permissions;
        }
      }
    } catch (_) {
      // Table may not exist yet (migration not run) — fall through.
    }
    const permissions = {
      ...roleDefaults,
      ...orgRoleOverrides,
      ...(user.permissions || {}),
    };

    // Store original user organization ID for reference
    const userOrganizationId = user.organizationId;

    // Check for X-Organization-Id header for organization switching.
    //
    // After the UUID→INT migration, user.organizationId is a number while
    // HTTP headers are always strings. Compare loosely AND normalize the
    // resolved value to a number so downstream Sequelize queries don't get
    // string-vs-int confusion in WHERE clauses.
    const headerOrgIdRaw = req.headers['x-organization-id'] || req.headers['X-Organization-Id'];
    const headerOrgId = headerOrgIdRaw ? Number(headerOrgIdRaw) : null;

    let resolvedOrganizationId = userOrganizationId;

    if (headerOrgId) {
      if (Number.isNaN(headerOrgId)) {
        return next(new AuthorizationError('Invalid organization id'));
      }
      // super_admin can switch to any organization
      if (user.role === 'super_admin') {
        resolvedOrganizationId = headerOrgId;
      } else {
        // Regular users can only access their own organization
        if (headerOrgId !== Number(userOrganizationId)) {
          return next(new AuthorizationError('Cannot access this organization'));
        }
        resolvedOrganizationId = headerOrgId;
      }
    }

    // Attach user to request
    req.user = user;
    req.organizationId = resolvedOrganizationId;
    req.userOrganizationId = userOrganizationId; // Store original for reference
    req.userPermissions = permissions;

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(new AuthenticationError('Invalid token'));
    }
    if (error.name === 'TokenExpiredError') {
      return next(new AuthenticationError('Token expired'));
    }
    next(error);
  }
};

/**
 * Require specific permission
 */
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AuthenticationError('Authentication required'));
    }

    const hasPermission = req.userPermissions && req.userPermissions[permission];

    if (!hasPermission) {
      return next(new AuthorizationError(`Permission required: ${permission}`));
    }

    next();
  };
};

/**
 * Require specific role(s)
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AuthenticationError('Authentication required'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AuthorizationError(`Role required: ${roles.join(' or ')}`));
    }

    next();
  };
};

/**
 * Optional authentication (doesn't fail if no token)
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = verifyAccessToken(token);
      const user = await User.findByPk(decoded.userId);

      if (user && user.status === 'active') {
        req.user = user;
        req.organizationId = user.organizationId;
      }
    }

    next();
  } catch (error) {
    // Ignore errors for optional auth
    next();
  }
};

module.exports = {
  authenticate,
  requirePermission,
  requireRole,
  optionalAuth,
};

