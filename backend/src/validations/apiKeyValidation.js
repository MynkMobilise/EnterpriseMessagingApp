const Joi = require('joi');

const apiKeyValidation = {
  create: Joi.object({
    name: Joi.string().required(),
    environment: Joi.string().valid('production', 'development', 'staging').required(),
    scopes: Joi.array().items(Joi.string()).optional(),
    rateLimitPerMinute: Joi.number().integer().min(1).max(1000).optional(),
    rateLimitPerDay: Joi.number().integer().min(1).max(100000).optional(),
    expiresAt: Joi.date().optional(),
    description: Joi.string().optional(),
    allowedIps: Joi.array().items(Joi.string().ip()).optional(),
  }),

  revoke: Joi.object({
    reason: Joi.string().optional(),
  }),
};

module.exports = { apiKeyValidation };


