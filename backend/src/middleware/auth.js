const { User, Organization, OrganizationRolePermissions, Role } = require('../models');
const { AppError, AuthenticationError, AuthorizationError } = require('../utils/errorTypes');
const { verifyAccessToken } = require('../config/jwt');
const authService = require('../services/authService');
const { effectiveFlags } = require('../utils/featureFlags');

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

    // Permission resolution order (most general → most specific):
    //   1. Code defaults for the legacy role enum (authService.getDefaultPermissions)
    //   2. Phase 2 Role row: user.roleId → roles.permissions. This is the
    //      primary source of truth after the migration. System rows seeded
    //      per-org carry the same defaults from (1); custom rows have
    //      whatever the tenant Admin saved.
    //   3. Legacy per-org override (organization_role_permissions) — kept as
    //      a fallback for users whose roleId hasn't been backfilled yet.
    //   4. Per-user overrides (user.permissions JSON).
    // Each later layer wins.
    const roleDefaults = authService.getDefaultPermissions(user.role);

    let rolePermissions = {};
    if (user.roleId) {
      try {
        const roleRow = await Role.findOne({
          where: { id: user.roleId },
          attributes: ['permissions', 'isSystem'],
        });
        if (roleRow && roleRow.permissions && typeof roleRow.permissions === 'object') {
          rolePermissions = roleRow.permissions;
        }
      } catch (_) { /* Roles table missing — fall through. */ }
    }

    // Legacy override table — applied only when no Role row was matched, so
    // we don't override a tenant's tuned Role.permissions with stale legacy
    // data after the migration has run.
    let orgRoleOverrides = {};
    if (!user.roleId || Object.keys(rolePermissions).length === 0) {
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
      } catch (_) { /* table missing on fresh deploy — fall through. */ }
    }

    const permissions = {
      ...roleDefaults,
      ...rolePermissions,
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

    // Resolve per-tenant feature flags (plan baseline merged with this org's
    // featureOverrides JSON). Routes can refuse via requireFeature('liveChat')
    // and downstream services / handlers can read req.featureFlags directly.
    // For super_admin requests that switched orgs via the X-Organization-Id
    // header, fetch the target org so flags reflect the SWITCHED org, not
    // the super_admin's own org row.
    let flagSourceOrg = user.organization;
    if (
      resolvedOrganizationId
      && Number(resolvedOrganizationId) !== Number(userOrganizationId)
    ) {
      try {
        flagSourceOrg = await Organization.findByPk(resolvedOrganizationId);
      } catch (_) {
        // Fall back to the user's own org — better than crashing.
      }
    }
    req.organization = flagSourceOrg;
    req.featureFlags = effectiveFlags(flagSourceOrg);

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
// `permission` can be a single permission key (string) — back-compat — or an
// array of keys with OR-semantics. Use the array form when an endpoint should
// be reachable by users from two different roles (e.g. POST /media is for
// template managers AND for senders who need to attach a runtime media file).
const requirePermission = (permission) => {
  const required = Array.isArray(permission) ? permission : [permission];
  return (req, res, next) => {
    if (!req.user) {
      return next(new AuthenticationError('Authentication required'));
    }

    const granted = req.userPermissions || {};
    const hasPermission = required.some((p) => granted[p]);

    if (!hasPermission) {
      return next(new AuthorizationError(`Permission required: ${required.join(' or ')}`));
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

