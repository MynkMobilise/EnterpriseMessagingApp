const sequelize = require('../../../src/config/database');

describe('Database Configuration', () => {
  test('should create Sequelize instance', () => {
    expect(sequelize).toBeDefined();
    expect(sequelize.authenticate).toBeDefined();
  });

  test('should have correct dialect', () => {
    expect(sequelize.getDialect()).toBe('mysql');
  });

  test('should have connection pool configuration', () => {
    const config = sequelize.config;
    expect(config.pool).toBeDefined();
    expect(config.pool.max).toBeGreaterThan(0);
    expect(config.pool.min).toBeGreaterThan(0);
  });
});


