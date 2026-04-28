const logger = require('../../../src/utils/logger');

describe('Logger Utility', () => {
  test('should create logger instance', () => {
    expect(logger).toBeDefined();
    expect(logger.info).toBeDefined();
    expect(logger.error).toBeDefined();
    expect(logger.warn).toBeDefined();
  });

  test('should log info message', () => {
    expect(() => {
      logger.info('Test info message');
    }).not.toThrow();
  });

  test('should log error message', () => {
    expect(() => {
      logger.error('Test error message');
    }).not.toThrow();
  });

  test('should log warning message', () => {
    expect(() => {
      logger.warn('Test warning message');
    }).not.toThrow();
  });

  test('should log error with stack trace', () => {
    const error = new Error('Test error');
    expect(() => {
      logger.error('Error occurred', { error });
    }).not.toThrow();
  });
});


