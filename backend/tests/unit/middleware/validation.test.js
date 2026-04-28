const { validate, validateQuery, validateParams } = require('../../../src/middleware/validation');
const Joi = require('joi');

describe('Validation Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {},
      query: {},
      params: {},
    };
    res = {};
    next = jest.fn();
  });

  describe('validate', () => {
    test('should pass valid data', () => {
      const schema = Joi.object({
        email: Joi.string().email().required(),
        name: Joi.string().required(),
      });

      req.body = {
        email: 'test@example.com',
        name: 'Test User',
      };

      const middleware = validate(schema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(next.mock.calls[0][0]).toBeUndefined();
      expect(req.body.email).toBe('test@example.com');
    });

    test('should reject invalid data', () => {
      const schema = Joi.object({
        email: Joi.string().email().required(),
        name: Joi.string().required(),
      });

      req.body = {
        email: 'invalid-email',
        name: 'Test',
      };

      const middleware = validate(schema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      const error = next.mock.calls[0][0];
      expect(error.message).toContain('Validation failed');
    });

    test('should strip unknown fields', () => {
      const schema = Joi.object({
        email: Joi.string().email().required(),
      });

      req.body = {
        email: 'test@example.com',
        unknownField: 'should be removed',
      };

      const middleware = validate(schema);
      middleware(req, res, next);

      expect(req.body.unknownField).toBeUndefined();
      expect(req.body.email).toBe('test@example.com');
    });
  });

  describe('validateQuery', () => {
    test('should validate query parameters', () => {
      const schema = Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(20),
      });

      req.query = {
        page: '1',
        limit: '20',
      };

      const middleware = validateQuery(schema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.query.page).toBe(1);
      expect(req.query.limit).toBe(20);
    });
  });

  describe('validateParams', () => {
    test('should validate URL parameters', () => {
      const schema = Joi.object({
        id: Joi.string().uuid().required(),
      });

      req.params = {
        id: '550e8400-e29b-41d4-a716-446655440000',
      };

      const middleware = validateParams(schema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.params.id).toBe('550e8400-e29b-41d4-a716-446655440000');
    });
  });
});


