const { errorHandler, notFoundHandler } = require('../../../src/middleware/errorHandler');
const { AppError, ValidationError } = require('../../../src/utils/errorTypes');

describe('Error Handler Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      originalUrl: '/test',
      method: 'GET',
      ip: '127.0.0.1',
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  describe('errorHandler', () => {
    test('should handle AppError', () => {
      const error = new AppError('Test error', 400, 'TEST_ERROR');
      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'TEST_ERROR',
          message: 'Test error',
        },
      });
    });

    test('should handle ValidationError', () => {
      const error = new ValidationError('Validation failed', { field: 'email' });
      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(422);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: { field: 'email' },
        },
      });
    });

    test('should handle generic errors', () => {
      const error = new Error('Generic error');
      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Generic error',
        },
      });
    });

    test('should hide stack trace in production', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Internal error');
      errorHandler(error, req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
      });
      process.env.NODE_ENV = 'test';
    });
  });

  describe('notFoundHandler', () => {
    test('should return 404 for unknown routes', () => {
      notFoundHandler(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Route GET /test not found',
        },
      });
    });
  });
});


