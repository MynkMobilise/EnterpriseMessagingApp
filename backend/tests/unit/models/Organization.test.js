const { Organization } = require('../../../src/models');
const sequelize = require('../../../src/config/database');

describe('Organization Model', () => {
  beforeAll(async () => {
    // Sync database for tests
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  test('should create organization with required fields', async () => {
    const org = await Organization.create({
      name: 'Test Organization',
      slug: 'test-org',
      plan: 'starter',
      status: 'trial',
    });

    expect(org.id).toBeDefined();
    expect(org.name).toBe('Test Organization');
    expect(org.slug).toBe('test-org');
    expect(org.plan).toBe('starter');
    expect(org.status).toBe('trial');
  });

  test('should have default values', async () => {
    const org = await Organization.create({
      name: 'Test Org 2',
      slug: 'test-org-2',
    });

    expect(org.plan).toBe('starter');
    expect(org.status).toBe('trial');
    expect(org.maxUsers).toBe(5);
    expect(org.maxMessagesPerMonth).toBe(1000);
    expect(org.usedMessages).toBe(0);
  });

  test('should enforce unique slug', async () => {
    await Organization.create({
      name: 'Test Org 3',
      slug: 'unique-slug',
    });

    await expect(
      Organization.create({
        name: 'Test Org 4',
        slug: 'unique-slug',
      })
    ).rejects.toThrow();
  });

  test('should support soft delete', async () => {
    const org = await Organization.create({
      name: 'Test Org 5',
      slug: 'test-org-5',
    });

    await org.destroy();
    const found = await Organization.findByPk(org.id);
    expect(found).toBeNull();

    const foundWithParanoid = await Organization.findByPk(org.id, { paranoid: false });
    expect(foundWithParanoid).not.toBeNull();
    expect(foundWithParanoid.deletedAt).not.toBeNull();
  });
});


