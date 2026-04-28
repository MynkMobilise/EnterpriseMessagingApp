const settingsService = require('../../../src/services/settingsService');
const { OrganizationSettings, UserPreferences, Organization, User } = require('../../../src/models');
const sequelize = require('../../../src/config/database');

describe('Settings Service', () => {
  let testOrg;
  let testUser;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
    testOrg = await Organization.create({
      name: 'Settings Test Org',
      slug: 'settings-test-org',
    });
    testUser = await User.create({
      organizationId: testOrg.id,
      email: 'settings@example.com',
      passwordHash: 'password',
      firstName: 'Settings',
      lastName: 'Test',
      status: 'active',
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('getOrganizationSettings', () => {
    test('should get organization settings', async () => {
      const settings = await settingsService.getOrganizationSettings(testOrg.id);
      expect(settings).toBeDefined();
      expect(settings.organizationId).toBe(testOrg.id);
    });

    test('should create default settings if not exists', async () => {
      const newOrg = await Organization.create({
        name: 'New Org',
        slug: 'new-org-settings',
      });

      const settings = await settingsService.getOrganizationSettings(newOrg.id);
      expect(settings).toBeDefined();
      expect(settings.requireMessageApproval).toBe(true);
      expect(settings.defaultMessageExpiryHours).toBe(24);
    });
  });

  describe('updateOrganizationSettings', () => {
    test('should update organization settings', async () => {
      const updated = await settingsService.updateOrganizationSettings(testOrg.id, {
        requireMessageApproval: false,
        defaultMessageExpiryHours: 48,
      });

      expect(updated.requireMessageApproval).toBe(false);
      expect(updated.defaultMessageExpiryHours).toBe(48);
    });
  });

  describe('getUserPreferences', () => {
    test('should get user preferences', async () => {
      const preferences = await settingsService.getUserPreferences(testUser.id);
      expect(preferences).toBeDefined();
      expect(preferences.userId).toBe(testUser.id);
    });
  });

  describe('updateUserPreferences', () => {
    test('should update user preferences', async () => {
      const updated = await settingsService.updateUserPreferences(testUser.id, {
        theme: 'dark',
        language: 'es',
      });

      expect(updated.theme).toBe('dark');
      expect(updated.language).toBe('es');
    });
  });
});
