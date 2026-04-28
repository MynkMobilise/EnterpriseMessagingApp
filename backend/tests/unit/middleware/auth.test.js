const { authenticate, requirePermission, requireRole } = require('../../../src/middleware/auth');
const { User, Organization } = require('../../../src/models');
const sequelize = require('../../../src/config/database');
const { generateAccessToken } = require('../../../src/config/jwt');

describe('Auth Middleware', () => {
  let testOrg;
  let testUser;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
    testOrg = await Organization.create({
      name: 'Test Organization',
      slug: 'test-org-middleware',
    });
    testUser = await User.create({
      organizationId: testOrg.id,
      email: 'middleware@example.com',
      passwordHash: 'password',
      firstName: 'Middleware',
      lastName: 'Test',
      status: 'active',
      permissions: {
        canSendMessages: true,
        canApproveMessages: false,
      },
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('authenticate', () => {
    test('should authenticate valid token', async () => {
      const token = generateAccessToken({
        userId: testUser.id,
        organizationId: testOrg.id,
        role: 'operator',
        email: testUser.email,
      });

      const req = {
        headers: {
          authorization: `Bearer ${token}`,
        },
      };
      const res = {};
      const next = jest.fn();

      await authenticate(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeDefined();
      expect(req.user.id).toBe(testUser.id);
      expect(req.organizationId).toBe(testOrg.id);
    });

    test('should reject request without token', async () => {
      const req = {
        headers: {},
      };
      const res = {};
      const next = jest.fn();

      await authenticate(req, res, next);

      expect(next).toHaveBeenCalled();
      const error = next.mock.calls[0][0];
      expect(error.message).toContain('No token provided');
    });

    test('should reject invalid token', async () => {
      const req = {
        headers: {
          authorization: 'Bearer invalid-token',
        },
      };
      const res = {};
      const next = jest.fn();

      await authenticate(req, res, next);

      expect(next).toHaveBeenCalled();
      const error = next.mock.calls[0][0];
      expect(error.message).toContain('Invalid');
    });
  });

  describe('requirePermission', () => {
    test('should allow request with required permission', () => {
      const req = {
        user: testUser,
        userPermissions: {
          canSendMessages: true,
        },
      };
      const res = {};
      const next = jest.fn();

      const middleware = requirePermission('canSendMessages');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(next.mock.calls[0][0]).toBeUndefined();
    });

    test('should reject request without required permission', () => {
      const req = {
        user: testUser,
        userPermissions: {
          canSendMessages: true,
          canApproveMessages: false,
        },
      };
      const res = {};
      const next = jest.fn();

      const middleware = requirePermission('canApproveMessages');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      const error = next.mock.calls[0][0];
      expect(error.message).toContain('Permission required');
    });
  });

  describe('requireRole', () => {
    test('should allow request with required role', () => {
      const req = {
        user: { ...testUser, role: 'admin' },
      };
      const res = {};
      const next = jest.fn();

      const middleware = requireRole('admin', 'manager');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(next.mock.calls[0][0]).toBeUndefined();
    });

    test('should reject request without required role', () => {
      const req = {
        user: { ...testUser, role: 'operator' },
      };
      const res = {};
      const next = jest.fn();

      const middleware = requireRole('admin', 'manager');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      const error = next.mock.calls[0][0];
      expect(error.message).toContain('Role required');
    });
  });
});

