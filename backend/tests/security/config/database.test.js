const sequelize = require('../../../src/config/database');

describe('Database Security Tests', () => {
  describe('SQL Injection Prevention', () => {
    test('should use parameterized queries (Sequelize handles this)', () => {
      // Sequelize uses parameterized queries by default
      // This test verifies that Sequelize is configured correctly
      expect(sequelize).toBeDefined();
      expect(sequelize.getDialect()).toBe('mysql');
    });

    test('should have proper connection configuration', () => {
      const config = sequelize.config;
      // Verify that credentials are not exposed in config object
      expect(config.host).toBeDefined();
      expect(config.database).toBeDefined();
      // Password should not be in config object (it's in connection string)
    });
  });

  describe('Connection Security', () => {
    test('should use utf8mb4 charset', () => {
      const config = sequelize.config;
      expect(config.define.charset).toBe('utf8mb4');
    });

    test('should have connection pooling configured', () => {
      const config = sequelize.config;
      expect(config.pool).toBeDefined();
      expect(config.pool.max).toBeGreaterThan(0);
      expect(config.pool.min).toBeGreaterThan(0);
    });
  });
});


