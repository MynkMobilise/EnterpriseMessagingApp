const Joi = require('joi');

const contactValidation = {
  create: Joi.object({
    phoneNumber: Joi.string().required(),
    name: Joi.string().optional(),
    email: Joi.string().email().allow('', null).optional(),
    company: Joi.string().allow('', null).optional(),
    jobTitle: Joi.string().allow('', null).optional(),
    country: Joi.string().allow('', null).optional(),
    city: Joi.string().allow('', null).optional(),
    tags: Joi.array().items(Joi.string()).optional(),
    productsInterest: Joi.array().items(Joi.string()).optional(),
    source: Joi.string().optional(),
    assignedTo: Joi.number().integer().positive().allow('', null).optional(),
    status: Joi.string().valid('active', 'inactive', 'blocked', 'unsubscribed').optional(),
    whatsappOptIn: Joi.boolean().optional(),
    smsOptIn: Joi.boolean().optional(),
    notes: Joi.string().allow('', null).optional(),
    customFields: Joi.object().optional(),
  }),

  update: Joi.object({
    name: Joi.string().optional(),
    phoneNumber: Joi.string().optional(),
    email: Joi.string().email().allow('', null).optional(),
    company: Joi.string().allow('', null).optional(),
    jobTitle: Joi.string().allow('', null).optional(),
    country: Joi.string().allow('', null).optional(),
    city: Joi.string().allow('', null).optional(),
    tags: Joi.array().items(Joi.string()).optional(),
    productsInterest: Joi.array().items(Joi.string()).optional(),
    source: Joi.string().optional(),
    assignedTo: Joi.number().integer().positive().allow('', null).optional(),
    status: Joi.string().valid('active', 'inactive', 'blocked', 'unsubscribed').optional(),
    whatsappOptIn: Joi.boolean().optional(),
    smsOptIn: Joi.boolean().optional(),
    notes: Joi.string().allow('', null).optional(),
    customFields: Joi.object().optional(),
  }),

  bulkOperation: Joi.object({
    action: Joi.string().valid('add_tags', 'remove_tags', 'update_status', 'delete').required(),
    contactIds: Joi.array().items(Joi.number().integer().positive()).min(1).required(),
    tags: Joi.array().items(Joi.string()).when('action', {
      is: Joi.string().valid('add_tags', 'remove_tags'),
      then: Joi.required(),
    }),
    status: Joi.string().valid('active', 'inactive', 'blocked', 'unsubscribed').when('action', {
      is: 'update_status',
      then: Joi.required(),
    }),
  }),
};

module.exports = { contactValidation };


