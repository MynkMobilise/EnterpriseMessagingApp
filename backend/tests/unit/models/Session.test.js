const { Session, User, Organization } = require('../../../src/models');
const sequelize = require('../../../src/config/database');

describe('Session Model', () => {
  let testOrg;
  let testUser;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
    testOrg = await Organization.create({
      name: 'Test Organization',
      slug: 'test-org-session',
    });
    testUser = await User.create({
      organizationId: testOrg.id,
      email: 'test@example.com',
      passwordHash: 'password',
      firstName: 'Test',
      lastName: 'User',
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  test('should create session with required fields', async () => {
    const session = await Session.create({
      userId: testUser.id,
      refreshToken: 'refresh-token-123',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0',
    });

    expect(session.id).toBeDefined();
    expect(session.userId).toBe(testUser.id);
    expect(session.refreshToken).toBe('refresh-token-123');
    expect(session.ipAddress).toBe('127.0.0.1');
  });

  test('should have association with user', async () => {
    const session = await Session.create({
      userId: testUser.id,
      refreshToken: 'refresh-token-456',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    const sessionWithUser = await Session.findByPk(session.id, {
      include: [{ model: User, as: 'user' }],
    });

    expect(sessionWithUser.user).toBeDefined();
    expect(sessionWithUser.user.id).toBe(testUser.id);
  });
});


