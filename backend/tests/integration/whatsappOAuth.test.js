const request = require('supertest');
const app = require('../../src/app');
const sequelize = require('../../src/config/database');
const { Organization, User, OrganizationSettings, Role, Permission } = require('../../src/models');
const { generateToken } = require('../../src/utils/jwt');
const whatsappOAuthService = require('../../src/services/whatsappOAuthService');

// Mock Meta Graph API service
jest.mock('../../src/services/metaGraphApiService', () => ({
  makeRequest: jest.fn(),
}));

const metaGraphApiService = require('../../src/services/metaGraphApiService');

describe('WhatsApp OAuth Integration Tests', () => {
  let testOrg;
  let testUser;
  let authToken;
  let testSettings;

  beforeAll(async () => {
    await sequelize.sync({ force: true });

    // Create test organization
    testOrg = await Organization.create({
      name: 'Test OAuth Org',
      slug: 'test-oauth-org',
    });

    // Create test role with permissions
    const testRole = await Role.create({
      organizationId: testOrg.id,
      name: 'Admin',
      description: 'Admin role',
    });

    // Create canManageSettings permission
    const manageSettingsPermission = await Permission.create({
      name: 'canManageSettings',
      description: 'Can manage settings',
    });

    await testRole.addPermission(manageSettingsPermission);

    // Create test user
    testUser = await User.create({
      organizationId: testOrg.id,
      email: 'oauth-test@example.com',
      password: 'hashed-password',
      firstName: 'OAuth',
      lastName: 'Test',
      roleId: testRole.id,
    });

    // Generate auth token
    authToken = generateToken({
      id: testUser.id,
      email: testUser.email,
      organizationId: testOrg.id,
    });

    // Create organization settings
    testSettings = await OrganizationSettings.create({
      organizationId: testOrg.id,
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/whatsapp/oauth/status', () => {
    test('should return OAuth status for authenticated user', async () => {
      const response = await request(app)
        .get('/api/v1/whatsapp/oauth/status')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Organization-Id', testOrg.id);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.linked).toBeDefined();
      expect(response.body.data.linkedVia).toBeDefined();
    });

    test('should return 401 for unauthenticated request', async () => {
      const response = await request(app)
        .get('/api/v1/whatsapp/oauth/status');

      expect(response.status).toBe(401);
    });

    test('should return 403 for user without permission', async () => {
      // Create user without canManageSettings permission
      const noPermissionRole = await Role.create({
        organizationId: testOrg.id,
        name: 'Viewer',
        description: 'Viewer role',
      });

      const viewerUser = await User.create({
        organizationId: testOrg.id,
        email: 'viewer@example.com',
        password: 'hashed-password',
        firstName: 'Viewer',
        lastName: 'User',
        roleId: noPermissionRole.id,
      });

      const viewerToken = generateToken({
        id: viewerUser.id,
        email: viewerUser.email,
        organizationId: testOrg.id,
      });

      const response = await request(app)
        .get('/api/v1/whatsapp/oauth/status')
        .set('Authorization', `Bearer ${viewerToken}`)
        .set('X-Organization-Id', testOrg.id);

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/v1/whatsapp/oauth/verify', () => {
    test('should verify connection successfully', async () => {
      // Setup mock settings with OAuth tokens
      await testSettings.update({
        metaOAuthAccessToken: 'encrypted-token',
        whatsappBusinessAccountId: '123456789012345',
        whatsappPhoneNumberId: '987654321098765',
        wabaLinkedVia: 'oauth',
      });

      // Mock Meta Graph API responses
      metaGraphApiService.makeRequest
        .mockResolvedValueOnce({ id: 'user-123', name: 'Test User' }) // Token verification
        .mockResolvedValueOnce({ id: '123456789012345', name: 'Test WABA' }) // WABA verification
        .mockResolvedValueOnce({ // Phone numbers
          data: [{ id: '987654321098765', verified_name: 'Test Business' }],
        });

      // Mock decrypt
      const { decrypt } = require('../../src/utils/encryption');
      jest.spyOn(require('../../src/utils/encryption'), 'decrypt').mockReturnValue('decrypted-token');

      const response = await request(app)
        .get('/api/v1/whatsapp/oauth/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Organization-Id', testOrg.id);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.verified).toBeDefined();
      expect(response.body.data.details).toBeDefined();
    });

    test('should return verification failure when no token', async () => {
      await testSettings.update({
        metaOAuthAccessToken: null,
        whatsappAccessToken: null,
      });

      const response = await request(app)
        .get('/api/v1/whatsapp/oauth/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Organization-Id', testOrg.id);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.verified).toBe(false);
      expect(response.body.data.error).toContain('No access token found');
    });

    test('should return 401 for unauthenticated request', async () => {
      const response = await request(app)
        .get('/api/v1/whatsapp/oauth/verify');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/v1/whatsapp/oauth/unlink', () => {
    test('should successfully unlink WABA with confirmation', async () => {
      // Setup linked WABA
      await testSettings.update({
        metaOAuthAccessToken: 'encrypted-token',
        whatsappBusinessAccountId: '123456789012345',
        whatsappPhoneNumberId: '987654321098765',
        wabaLinkedVia: 'oauth',
      });

      const response = await request(app)
        .post('/api/v1/whatsapp/oauth/unlink')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Organization-Id', testOrg.id)
        .send({ confirm: true });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('unlinked successfully');
      expect(response.body.correlationId).toBeDefined();

      // Verify settings were cleared
      await testSettings.reload();
      expect(testSettings.metaOAuthAccessToken).toBeNull();
      expect(testSettings.whatsappBusinessAccountId).toBeNull();
    });

    test('should return 400 when confirmation is missing', async () => {
      const response = await request(app)
        .post('/api/v1/whatsapp/oauth/unlink')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Organization-Id', testOrg.id)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Confirmation is required');
    });

    test('should return 400 when confirm is false', async () => {
      const response = await request(app)
        .post('/api/v1/whatsapp/oauth/unlink')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Organization-Id', testOrg.id)
        .send({ confirm: false });

      expect(response.status).toBe(400);
    });

    test('should return 401 for unauthenticated request', async () => {
      const response = await request(app)
        .post('/api/v1/whatsapp/oauth/unlink')
        .send({ confirm: true });

      expect(response.status).toBe(401);
    });

    test('should handle unlink when settings not found', async () => {
      // Create new org without settings
      const newOrg = await Organization.create({
        name: 'No Settings Org',
        slug: 'no-settings-org',
      });

      const newOrgToken = generateToken({
        id: testUser.id,
        email: testUser.email,
        organizationId: newOrg.id,
      });

      const response = await request(app)
        .post('/api/v1/whatsapp/oauth/unlink')
        .set('Authorization', `Bearer ${newOrgToken}`)
        .set('X-Organization-Id', newOrg.id)
        .send({ confirm: true });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Organization settings not found');
    });
  });

  describe('OAuth Status with Data Validation', () => {
    test('should include data validation results in status', async () => {
      // Setup with valid WABA and phone number
      await testSettings.update({
        whatsappBusinessAccountId: '123456789012345',
        whatsappPhoneNumberId: '987654321098765',
      });

      const response = await request(app)
        .get('/api/v1/whatsapp/oauth/status')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Organization-Id', testOrg.id);

      expect(response.status).toBe(200);
      expect(response.body.data.dataValid).toBeDefined();
      expect(response.body.data.dataValid.wabaValid).toBe(true);
      expect(response.body.data.dataValid.phoneNumberValid).toBe(true);
    });

    test('should flag invalid WABA ID in status', async () => {
      await testSettings.update({
        whatsappBusinessAccountId: 'CRUD_INVALID_WABA',
      });

      const response = await request(app)
        .get('/api/v1/whatsapp/oauth/status')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Organization-Id', testOrg.id);

      expect(response.status).toBe(200);
      expect(response.body.data.dataValid.wabaValid).toBe(false);
      expect(response.body.data.dataValid.wabaWarning).toContain('test data');
    });

    test('should flag invalid phone number ID in status', async () => {
      await testSettings.update({
        whatsappPhoneNumberId: 'TEST_INVALID_PHONE',
      });

      const response = await request(app)
        .get('/api/v1/whatsapp/oauth/status')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Organization-Id', testOrg.id);

      expect(response.status).toBe(200);
      expect(response.body.data.dataValid.phoneNumberValid).toBe(false);
      expect(response.body.data.dataValid.phoneNumberWarning).toContain('test data');
    });
  });
});

