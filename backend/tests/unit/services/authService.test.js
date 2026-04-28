const authService = require('../../../src/services/authService');
const { User, Organization, Session } = require('../../../src/models');
const sequelize = require('../../../src/config/database');

// Mock email service
jest.mock('../../../src/config/email', () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue({ success: true }),
  sendPasswordResetEmail: jest.fn().mockResolvedValue({ success: true }),
}));

describe('Auth Service', () => {
  let testOrg;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
    testOrg = await Organization.create({
      name: 'Test Organization',
      slug: 'test-org-auth',
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('register', () => {
    test('should register new user successfully', async () => {
      const result = await authService.register({
        organizationSlug: 'test-org-auth',
        email: 'newuser@example.com',
        password: 'SecurePass123!',
        firstName: 'New',
        lastName: 'User',
      });

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe('newuser@example.com');
      expect(result.message).toContain('Registration successful');
    });

    test('should throw error for duplicate email', async () => {
      await authService.register({
        organizationSlug: 'test-org-auth',
        email: 'duplicate@example.com',
        password: 'password',
        firstName: 'First',
        lastName: 'User',
      });

      await expect(
        authService.register({
          organizationSlug: 'test-org-auth',
          email: 'duplicate@example.com',
          password: 'password',
          firstName: 'Second',
          lastName: 'User',
        })
      ).rejects.toThrow('Email already registered');
    });

    test('should throw error for non-existent organization', async () => {
      await expect(
        authService.register({
          organizationSlug: 'non-existent',
          email: 'test@example.com',
          password: 'password',
          firstName: 'Test',
          lastName: 'User',
        })
      ).rejects.toThrow('Organization not found');
    });
  });

  describe('login', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await User.create({
        organizationId: testOrg.id,
        email: 'login@example.com',
        passwordHash: 'correctpassword',
        firstName: 'Login',
        lastName: 'User',
        status: 'active',
      });
    });

    test('should login with correct credentials', async () => {
      const result = await authService.login(
        {
          email: 'login@example.com',
          password: 'correctpassword',
          organizationSlug: 'test-org-auth',
        },
        '127.0.0.1',
        'Mozilla/5.0'
      );

      expect(result.user).toBeDefined();
      expect(result.tokens).toBeDefined();
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
    });

    test('should throw error for wrong password', async () => {
      await expect(
        authService.login(
          {
            email: 'login@example.com',
            password: 'wrongpassword',
            organizationSlug: 'test-org-auth',
          },
          '127.0.0.1',
          'Mozilla/5.0'
        )
      ).rejects.toThrow('Invalid credentials');
    });

    test('should throw error for inactive user', async () => {
      await testUser.update({ status: 'inactive' });

      await expect(
        authService.login(
          {
            email: 'login@example.com',
            password: 'correctpassword',
            organizationSlug: 'test-org-auth',
          },
          '127.0.0.1',
          'Mozilla/5.0'
        )
      ).rejects.toThrow('Account is not active');
    });
  });

  describe('generateTokens', () => {
    test('should generate access and refresh tokens', async () => {
      const user = await User.create({
        organizationId: testOrg.id,
        email: 'token@example.com',
        passwordHash: 'password',
        firstName: 'Token',
        lastName: 'User',
        status: 'active',
      });

      const tokens = await authService.generateTokens(user, '127.0.0.1', 'Mozilla/5.0');

      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
      expect(tokens.expiresIn).toBe(3600);
    });
  });

  describe('sanitizeUser', () => {
    test('should remove sensitive fields', () => {
      const user = {
        id: '123',
        email: 'test@example.com',
        passwordHash: 'hash',
        emailVerificationToken: 'token',
        passwordResetToken: 'reset',
        firstName: 'Test',
      };

      const sanitized = authService.sanitizeUser(user);
      expect(sanitized.passwordHash).toBeUndefined();
      expect(sanitized.emailVerificationToken).toBeUndefined();
      expect(sanitized.passwordResetToken).toBeUndefined();
      expect(sanitized.id).toBe('123');
      expect(sanitized.email).toBe('test@example.com');
    });
  });

  describe('getDefaultPermissions', () => {
    test('should return correct permissions for admin', () => {
      const permissions = authService.getDefaultPermissions('admin');
      expect(permissions.canManageUsers).toBe(true);
      expect(permissions.canAssignRoles).toBe(false);
    });

    test('should return correct permissions for operator', () => {
      const permissions = authService.getDefaultPermissions('operator');
      expect(permissions.canSendMessages).toBe(true);
      expect(permissions.canApproveMessages).toBe(false);
      expect(permissions.canManageUsers).toBe(false);
    });

    test('should return viewer permissions for unknown role', () => {
      const permissions = authService.getDefaultPermissions('unknown');
      expect(permissions.canSendMessages).toBe(false);
      expect(permissions.canViewReports).toBe(true);
    });
  });
});

