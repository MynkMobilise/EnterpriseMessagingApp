const Joi = require('joi');

const contactGroupValidation = {
  create: {
    body: Joi.object({
      name: Joi.string().required().max(255),
      description: Joi.string().allow(null, '').optional(),
      color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).optional(),
      contactIds: Joi.array().items(Joi.number().integer().positive()).optional(),
    }),
  },

  update: {
    body: Joi.object({
      name: Joi.string().max(255).optional(),
      description: Joi.string().allow(null, '').optional(),
      color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).optional(),
    }),
  },

  addContacts: {
    body: Joi.object({
      contactIds: Joi.array().items(Joi.number().integer().positive()).min(1).required(),
    }),
  },

  removeContacts: {
    body: Joi.object({
      contactIds: Joi.array().items(Joi.number().integer().positive()).min(1).required(),
    }),
  },
};

module.exports = { contactGroupValidation };

