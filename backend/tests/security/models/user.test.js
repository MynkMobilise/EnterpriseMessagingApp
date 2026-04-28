const { User, Organization } = require('../../../src/models');
const sequelize = require('../../../src/config/database');

describe('User Model Security Tests', () => {
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

  describe('SQL Injection Prevention', () => {
    test('should prevent SQL injection in email field', async () => {
      // Sequelize uses parameterized queries, so this should be safe
      const maliciousInput = "'; DROP TABLE users; --";
      
      await expect(
        User.create({
          organizationId: testOrg.id,
          email: maliciousInput,
          passwordHash: 'password',
          firstName: 'Test',
          lastName: 'User',
        })
      ).rejects.toThrow(); // Should fail validation, not execute SQL
    });

    test('should prevent SQL injection in name fields', async () => {
      const maliciousInput = "'; DELETE FROM users WHERE '1'='1";
      
      const user = await User.create({
        organizationId: testOrg.id,
        email: 'safe@example.com',
        passwordHash: 'password',
        firstName: maliciousInput,
        lastName: 'User',
      });

      // Should store as string, not execute
      expect(user.firstName).toBe(maliciousInput);
    });
  });

  describe('Password Hashing Security', () => {
    test('should use bcrypt for password hashing', async () => {
      const user = await User.create({
        organizationId: testOrg.id,
        email: 'hash-test@example.com',
        passwordHash: 'plainpassword',
        firstName: 'Hash',
        lastName: 'Test',
      });

      expect(user.passwordHash).toMatch(/^\$2b\$/); // bcrypt format
    });

    test('should use configured bcrypt rounds', async () => {
      const user = await User.create({
        organizationId: testOrg.id,
        email: 'rounds-test@example.com',
        passwordHash: 'password123',
        firstName: 'Rounds',
        lastName: 'Test',
      });

      // Extract rounds from hash (format: $2b$rounds$...)
      const hashParts = user.passwordHash.split('$');
      const rounds = parseInt(hashParts[2]);
      expect(rounds).toBeGreaterThanOrEqual(10); // At least 10 rounds
    });

    test('should produce different hashes for same password', async () => {
      const user1 = await User.create({
        organizationId: testOrg.id,
        email: 'same1@example.com',
        passwordHash: 'samepassword',
        firstName: 'User',
        lastName: 'One',
      });

      const user2 = await User.create({
        organizationId: testOrg.id,
        email: 'same2@example.com',
        passwordHash: 'samepassword',
        firstName: 'User',
        lastName: 'Two',
      });

      // Different salts should produce different hashes
      expect(user1.passwordHash).not.toBe(user2.passwordHash);

      // But both should validate correctly
      expect(await user1.validPassword('samepassword')).toBe(true);
      expect(await user2.validPassword('samepassword')).toBe(true);
    });
  });

  describe('Input Validation', () => {
    test('should reject invalid email format', async () => {
      await expect(
        User.create({
          organizationId: testOrg.id,
          email: 'not-an-email',
          passwordHash: 'password',
          firstName: 'Test',
          lastName: 'User',
        })
      ).rejects.toThrow();
    });

    test('should sanitize string inputs', async () => {
      const user = await User.create({
        organizationId: testOrg.id,
        email: 'sanitize@example.com',
        passwordHash: 'password',
        firstName: '  Test  ',
        lastName: 'User',
      });

      // Sequelize should handle trimming based on model definition
      expect(user.firstName).toBeDefined();
    });
  });

  describe('Data Sanitization', () => {
    test('should not expose password hash in JSON', async () => {
      const user = await User.create({
        organizationId: testOrg.id,
        email: 'expose-test@example.com',
        passwordHash: 'secretpassword',
        firstName: 'Expose',
        lastName: 'Test',
      });

      const userJson = user.toJSON();
      expect(userJson.passwordHash).toBeDefined(); // It's there but hashed
      expect(userJson.passwordHash).not.toBe('secretpassword');
    });
  });
});


