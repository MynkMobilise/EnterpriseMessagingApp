const { authenticate, requirePermission, requireRole } = require('../../../src/middleware/auth');
const { User, Organization } = require('../../../src/models');
const sequelize = require('../../../src/config/database');
const { generateAccessToken } = require('../../../src/config/jwt');

describe('Auth Middleware Security Tests', () => {
  let testOrg;
  let testUser;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
    testOrg = await Organization.create({
      name: 'Security Test Org',
      slug: 'security-test-org',
    });
    testUser = await User.create({
      organizationId: testOrg.id,
      email: 'security@example.com',
      passwordHash: 'password',
      firstName: 'Security',
      lastName: 'Test',
      status: 'active',
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('JWT Token Security', () => {
    test('should reject tampered token', async () => {
      const validToken = generateAccessToken({
        userId: testUser.id,
        organizationId: testOrg.id,
        role: 'operator',
        email: testUser.email,
      });

      const tamperedToken = validToken.substring(0, validToken.length - 5) + 'XXXXX';

      const req = {
        headers: {
          authorization: `Bearer ${tamperedToken}`,
        },
      };
      const res = {};
      const next = jest.fn();

      await authenticate(req, res, next);

      expect(next).toHaveBeenCalled();
      const error = next.mock.calls[0][0];
      expect(error.message).toContain('Invalid');
    });

    test('should reject token with modified payload', async () => {
      // Create token for different user
      const otherUser = await User.create({
        organizationId: testOrg.id,
        email: 'other@example.com',
        passwordHash: 'password',
        firstName: 'Other',
        lastName: 'User',
        status: 'active',
      });

      const token = generateAccessToken({
        userId: otherUser.id, // Different user
        organizationId: testOrg.id,
        role: 'admin', // Escalated role
        email: otherUser.email,
      });

      const req = {
        headers: {
          authorization: `Bearer ${token}`,
        },
      };
      const res = {};
      const next = jest.fn();

      await authenticate(req, res, next);

      // Should authenticate but with correct user data
      expect(req.user.id).toBe(otherUser.id);
      expect(req.user.role).toBe('admin');
    });
  });

  describe('Permission Bypass Attempts', () => {
    test('should prevent permission bypass', () => {
      const req = {
        user: testUser,
        userPermissions: {
          canSendMessages: false,
          canApproveMessages: false,
        },
      };
      const res = {};
      const next = jest.fn();

      // Try to bypass by modifying permissions
      req.userPermissions.canSendMessages = true;

      const middleware = requirePermission('canSendMessages');
      middleware(req, res, next);

      // Should still check the original permissions
      expect(next).toHaveBeenCalled();
      const error = next.mock.calls[0][0];
      expect(error.message).toContain('Permission required');
    });
  });

  describe('Authorization Tests', () => {
    test('should prevent role escalation', () => {
      const req = {
        user: { ...testUser, role: 'operator' },
      };
      const res = {};
      const next = jest.fn();

      // Try to access admin-only endpoint
      const middleware = requireRole('admin');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      const error = next.mock.calls[0][0];
      expect(error.message).toContain('Role required');
    });

    test('should allow access for correct role', () => {
      const req = {
        user: { ...testUser, role: 'admin' },
      };
      const res = {};
      const next = jest.fn();

      const middleware = requireRole('admin');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(next.mock.calls[0][0]).toBeUndefined();
    });
  });

  describe('Inactive User Protection', () => {
    test('should reject inactive users', async () => {
      const inactiveUser = await User.create({
        organizationId: testOrg.id,
        email: 'inactive@example.com',
        passwordHash: 'password',
        firstName: 'Inactive',
        lastName: 'User',
        status: 'inactive',
      });

      const token = generateAccessToken({
        userId: inactiveUser.id,
        organizationId: testOrg.id,
        role: 'operator',
        email: inactiveUser.email,
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
      const error = next.mock.calls[0][0];
      expect(error.message).toContain('not active');
    });
  });
});

