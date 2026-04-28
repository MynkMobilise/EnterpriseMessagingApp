const Joi = require('joi');

const mediaValidation = {
  upload: Joi.object({
    // File validation is handled by multer middleware
  }),

  list: Joi.object({
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    type: Joi.string().valid('image', 'video', 'document', 'audio').optional(),
    search: Joi.string().max(255).optional(),
  }),

  update: Joi.object({
    name: Joi.string().max(255).optional(),
    metadata: Joi.object().optional(),
  }),
};

module.exports = { mediaValidation };

