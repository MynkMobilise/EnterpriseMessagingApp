const authService = require('../../../src/services/authService');
const { User, Organization } = require('../../../src/models');
const sequelize = require('../../../src/config/database');

// Mock email service
jest.mock('../../../src/config/email', () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue({ success: true }),
  sendPasswordResetEmail: jest.fn().mockResolvedValue({ success: true }),
}));

describe('Auth Service Security Tests', () => {
  let testOrg;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
    testOrg = await Organization.create({
      name: 'Security Test Org',
      slug: 'security-test-org',
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('Password Strength', () => {
    test('should accept valid passwords', async () => {
      const result = await authService.register({
        organizationSlug: 'security-test-org',
        email: 'valid@example.com',
        password: 'SecurePass123!',
        firstName: 'Valid',
        lastName: 'User',
      });

      expect(result.user).toBeDefined();
    });
  });

  describe('Brute Force Protection', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await User.create({
        organizationId: testOrg.id,
        email: 'brute@example.com',
        passwordHash: 'correctpassword',
        firstName: 'Brute',
        lastName: 'Test',
        status: 'active',
      });
    });

    test('should lock account after multiple failed attempts', async () => {
      // Attempt 5 failed logins
      for (let i = 0; i < 5; i++) {
        try {
          await authService.login(
            {
              email: 'brute@example.com',
              password: 'wrongpassword',
              organizationSlug: 'security-test-org',
            },
            '127.0.0.1',
            'Mozilla/5.0'
            );
        } catch (error) {
          // Expected to fail
        }
      }

      // Check if account is locked
      const user = await User.findByPk(testUser.id);
      expect(user.lockedUntil).not.toBeNull();
      expect(user.failedLoginAttempts).toBeGreaterThanOrEqual(5);
    });
  });

  describe('Account Lockout', () => {
    test('should prevent login when account is locked', async () => {
      const lockedUser = await User.create({
        organizationId: testOrg.id,
        email: 'locked@example.com',
        passwordHash: 'password',
        firstName: 'Locked',
        lastName: 'User',
        status: 'active',
        lockedUntil: new Date(Date.now() + 30 * 60 * 1000), // Locked for 30 minutes
      });

      await expect(
        authService.login(
          {
            email: 'locked@example.com',
            password: 'password',
            organizationSlug: 'security-test-org',
          },
          '127.0.0.1',
          'Mozilla/5.0'
        )
      ).rejects.toThrow('Account locked');
    });
  });

  describe('Token Security', () => {
    test('should generate different tokens for same user', async () => {
      const user = await User.create({
        organizationId: testOrg.id,
        email: 'token-security@example.com',
        passwordHash: 'password',
        firstName: 'Token',
        lastName: 'Security',
        status: 'active',
      });

      const tokens1 = await authService.generateTokens(user, '127.0.0.1', 'Mozilla/5.0');
      const tokens2 = await authService.generateTokens(user, '127.0.0.1', 'Mozilla/5.0');

      expect(tokens1.accessToken).not.toBe(tokens2.accessToken);
      expect(tokens1.refreshToken).not.toBe(tokens2.refreshToken);
    });
  });

  describe('Input Validation', () => {
    test('should handle SQL injection attempts in email', async () => {
      // Should fail validation, not execute SQL
      await expect(
        authService.register({
          organizationSlug: 'security-test-org',
          email: "'; DROP TABLE users; --",
          password: 'password',
          firstName: 'SQL',
          lastName: 'Injection',
        })
      ).rejects.toThrow();
    });

    test('should handle XSS attempts in name fields', async () => {
      const result = await authService.register({
        organizationSlug: 'security-test-org',
        email: 'xss@example.com',
        password: 'password',
        firstName: '<script>alert("xss")</script>',
        lastName: 'Test',
      });

      // Should store as-is (sanitization happens at display layer)
      expect(result.user.firstName).toBeDefined();
    });
  });

  describe('Email Verification Security', () => {
    test('should reject expired verification tokens', async () => {
      const user = await User.create({
        organizationId: testOrg.id,
        email: 'expired@example.com',
        passwordHash: 'password',
        firstName: 'Expired',
        lastName: 'Token',
        emailVerificationToken: 'expired-token',
        emailVerificationExpiresAt: new Date(Date.now() - 1000), // Expired
      });

      await expect(
        authService.verifyEmail('expired-token')
      ).rejects.toThrow();
    });
  });
});

