const { Organization, User, Session } = require('../../../src/models');
const sequelize = require('../../../src/config/database');

describe('Model Relationships Integration Tests', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  test('should create organization with users', async () => {
    const org = await Organization.create({
      name: 'Integration Test Org',
      slug: 'integration-test-org',
    });

    const user1 = await User.create({
      organizationId: org.id,
      email: 'user1@example.com',
      passwordHash: 'password1',
      firstName: 'User',
      lastName: 'One',
    });

    const user2 = await User.create({
      organizationId: org.id,
      email: 'user2@example.com',
      passwordHash: 'password2',
      firstName: 'User',
      lastName: 'Two',
    });

    const orgWithUsers = await Organization.findByPk(org.id, {
      include: [{ model: User, as: 'users' }],
    });

    expect(orgWithUsers.users).toBeDefined();
    expect(orgWithUsers.users.length).toBe(2);
  });

  test('should create user with sessions', async () => {
    const org = await Organization.create({
      name: 'Session Test Org',
      slug: 'session-test-org',
    });

    const user = await User.create({
      organizationId: org.id,
      email: 'sessionuser@example.com',
      passwordHash: 'password',
      firstName: 'Session',
      lastName: 'User',
    });

    const session1 = await Session.create({
      userId: user.id,
      refreshToken: 'token1',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    const session2 = await Session.create({
      userId: user.id,
      refreshToken: 'token2',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    const userWithSessions = await User.findByPk(user.id, {
      include: [{ model: Session, as: 'sessions' }],
    });

    expect(userWithSessions.sessions).toBeDefined();
    expect(userWithSessions.sessions.length).toBe(2);
  });

  test('should cascade delete users when organization is deleted', async () => {
    const org = await Organization.create({
      name: 'Cascade Test Org',
      slug: 'cascade-test-org',
    });

    const user = await User.create({
      organizationId: org.id,
      email: 'cascade@example.com',
      passwordHash: 'password',
      firstName: 'Cascade',
      lastName: 'Test',
    });

    await org.destroy();

    const deletedUser = await User.findByPk(user.id);
    expect(deletedUser).toBeNull();
  });
});


