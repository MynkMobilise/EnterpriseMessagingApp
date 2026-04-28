const apiKeyService = require('../../../src/services/apiKeyService');
const { ApiKey, Organization, User } = require('../../../src/models');
const sequelize = require('../../../src/config/database');

describe('API Key Service', () => {
  let testOrg;
  let testUser;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
    testOrg = await Organization.create({
      name: 'API Key Test Org',
      slug: 'api-key-test-org',
    });
    testUser = await User.create({
      organizationId: testOrg.id,
      email: 'apikey@example.com',
      passwordHash: 'password',
      firstName: 'API',
      lastName: 'Key',
      status: 'active',
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('create', () => {
    test('should create API key', async () => {
      const result = await apiKeyService.create(testOrg.id, testUser.id, {
        name: 'Test API Key',
        environment: 'development',
      });

      expect(result.apiKey).toBeDefined();
      expect(result.key).toBeDefined();
      expect(result.key).toContain('sk_test_');
    });
  });

  describe('validateApiKey', () => {
    test('should validate correct API key', async () => {
      const { key } = await apiKeyService.create(testOrg.id, testUser.id, {
        name: 'Validation Test Key',
        environment: 'development',
      });

      const validated = await apiKeyService.validateApiKey(key);
      expect(validated).toBeDefined();
      expect(validated.status).toBe('active');
    });

    test('should reject invalid API key', async () => {
      await expect(
        apiKeyService.validateApiKey('invalid-key')
      ).rejects.toThrow();
    });
  });

  describe('list', () => {
    test('should list API keys', async () => {
      await apiKeyService.create(testOrg.id, testUser.id, {
        name: 'List Test Key',
        environment: 'production',
      });

      const keys = await apiKeyService.list(testOrg.id);
      expect(keys.length).toBeGreaterThan(0);
    });
  });
});

