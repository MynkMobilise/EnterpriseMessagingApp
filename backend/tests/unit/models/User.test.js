const { User, Organization } = require('../../../src/models');
const sequelize = require('../../../src/config/database');

describe('User Model', () => {
  let testOrg;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
    testOrg = await Organization.create({
      name: 'Test Organization',
      slug: 'test-org-user',
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  test('should create user with required fields', async () => {
    const user = await User.create({
      organizationId: testOrg.id,
      email: 'test@example.com',
      passwordHash: 'password123',
      firstName: 'John',
      lastName: 'Doe',
    });

    expect(user.id).toBeDefined();
    expect(user.email).toBe('test@example.com');
    expect(user.firstName).toBe('John');
    expect(user.lastName).toBe('Doe');
    expect(user.passwordHash).toBeDefined();
    expect(user.passwordHash).not.toBe('password123'); // Should be hashed
  });

  test('should hash password before create', async () => {
    const user = await User.create({
      organizationId: testOrg.id,
      email: 'test2@example.com',
      passwordHash: 'plainpassword',
      firstName: 'Jane',
      lastName: 'Smith',
    });

    expect(user.passwordHash).toMatch(/^\$2b\$/); // bcrypt hash format
    expect(user.passwordHash).not.toBe('plainpassword');
  });

  test('should validate password correctly', async () => {
    const user = await User.create({
      organizationId: testOrg.id,
      email: 'test3@example.com',
      passwordHash: 'correctpassword',
      firstName: 'Test',
      lastName: 'User',
    });

    const isValid = await user.validPassword('correctpassword');
    expect(isValid).toBe(true);

    const isInvalid = await user.validPassword('wrongpassword');
    expect(isInvalid).toBe(false);
  });

  test('should have default values', async () => {
    const user = await User.create({
      organizationId: testOrg.id,
      email: 'test4@example.com',
      passwordHash: 'password',
      firstName: 'Default',
      lastName: 'User',
    });

    expect(user.role).toBe('operator');
    expect(user.status).toBe('pending');
    expect(user.emailVerified).toBe(false);
    expect(user.failedLoginAttempts).toBe(0);
  });

  test('should validate email format', async () => {
    await expect(
      User.create({
        organizationId: testOrg.id,
        email: 'invalid-email',
        passwordHash: 'password',
        firstName: 'Test',
        lastName: 'User',
      })
    ).rejects.toThrow();
  });

  test('should enforce unique email per organization', async () => {
    await User.create({
      organizationId: testOrg.id,
      email: 'unique@example.com',
      passwordHash: 'password',
      firstName: 'First',
      lastName: 'User',
    });

    await expect(
      User.create({
        organizationId: testOrg.id,
        email: 'unique@example.com',
        passwordHash: 'password',
        firstName: 'Second',
        lastName: 'User',
      })
    ).rejects.toThrow();
  });
});


