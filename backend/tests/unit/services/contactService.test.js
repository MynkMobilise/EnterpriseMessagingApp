const contactService = require('../../../src/services/contactService');
const { Contact, Organization, User } = require('../../../src/models');
const sequelize = require('../../../src/config/database');

describe('Contact Service', () => {
  let testOrg;
  let testUser;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
    testOrg = await Organization.create({
      name: 'Contact Test Org',
      slug: 'contact-test-org',
    });
    testUser = await User.create({
      organizationId: testOrg.id,
      email: 'contact@example.com',
      passwordHash: 'password',
      firstName: 'Contact',
      lastName: 'Test',
      status: 'active',
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('create', () => {
    test('should create contact', async () => {
      const contact = await contactService.create(testOrg.id, testUser.id, {
        phoneNumber: '+1234567890',
        name: 'Test Contact',
        email: 'test@example.com',
      });

      expect(contact).toBeDefined();
      expect(contact.phoneNumber).toBe('+1234567890');
      expect(contact.name).toBe('Test Contact');
    });

    test('should throw error for duplicate phone number', async () => {
      await contactService.create(testOrg.id, testUser.id, {
        phoneNumber: '+1234567891',
        name: 'First Contact',
      });

      await expect(
        contactService.create(testOrg.id, testUser.id, {
          phoneNumber: '+1234567891',
          name: 'Duplicate Contact',
        })
      ).rejects.toThrow('already exists');
    });
  });

  describe('list', () => {
    test('should list contacts with pagination', async () => {
      const result = await contactService.list(testOrg.id, {
        page: 1,
        limit: 10,
      });

      expect(result.contacts).toBeDefined();
      expect(result.pagination).toBeDefined();
      expect(result.pagination.page).toBe(1);
    });
  });

  describe('bulkOperation', () => {
    test('should perform bulk add tags', async () => {
      const contact1 = await contactService.create(testOrg.id, testUser.id, {
        phoneNumber: '+1234567892',
        name: 'Bulk Test 1',
      });

      const contact2 = await contactService.create(testOrg.id, testUser.id, {
        phoneNumber: '+1234567893',
        name: 'Bulk Test 2',
      });

      const result = await contactService.bulkOperation(
        testOrg.id,
        'add_tags',
        [contact1.id, contact2.id],
        { tags: ['vip', 'premium'] }
      );

      expect(result.updatedCount).toBe(2);
    });
  });
});


