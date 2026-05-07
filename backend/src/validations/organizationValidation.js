const Joi = require('joi');

const organizationValidation = {
  createOrganization: {
    body: Joi.object({
      name: Joi.string().min(1).max(255).required(),
      slug: Joi.string().min(1).max(100).allow(null, ''),
      industry: Joi.string().max(100).allow(null, ''),
      // Welcome email + initial admin login go here. Required.
      email: Joi.string().email().required(),
      phone: Joi.string().max(50).allow(null, ''),
      website: Joi.string().uri().allow(null, ''),
      plan: Joi.string().valid('starter', 'professional', 'enterprise').default('starter'),
      status: Joi.string().valid('active', 'trial', 'suspended', 'cancelled').default('trial'),
      maxUsers: Joi.number().integer().min(1).default(5),
      maxMessagesPerMonth: Joi.number().integer().min(0).default(1000),
      // Allow legacy/UI fields without rejecting
      messageQuota: Joi.number().optional(),
      userCount: Joi.number().optional(),
    }),
  },

  updateOrganization: {
    body: Joi.object({
      name: Joi.string().min(1).max(255),
      slug: Joi.string().min(1).max(100),
      industry: Joi.string().max(100).allow(null, ''),
      plan: Joi.string().valid('starter', 'professional', 'enterprise'),
      status: Joi.string().valid('active', 'trial', 'suspended', 'cancelled'),
      maxUsers: Joi.number().integer().min(1),
      maxMessagesPerMonth: Joi.number().integer().min(0),
      email: Joi.string().email().allow(null, ''),
      phone: Joi.string().max(50).allow(null, ''),
      website: Joi.string().uri().allow(null, ''),
      address: Joi.string().allow(null, ''),
      description: Joi.string().allow(null, ''),
      settings: Joi.object({
        timezone: Joi.string().allow(null, ''),
        language: Joi.string().allow(null, ''),
        dateFormat: Joi.string().allow(null, ''),
        currency: Joi.string().allow(null, ''),
        messageLogRetention: Joi.string().allow(null, ''),
        mediaFileRetention: Joi.string().allow(null, ''),
      }).allow(null),
    }),
  },
};

module.exports = { organizationValidation };

