const Joi = require('joi');

const templateValidation = {
  create: Joi.object({
    name: Joi.string().required(),
    channel: Joi.string().valid('whatsapp', 'sms', 'email', 'fcm', 'both').required(),
    category: Joi.string().valid('marketing', 'transactional', 'utility', 'authentication').required(),
    body: Joi.string().when('channel', {
      is: Joi.string().valid('email', 'fcm'),
      then: Joi.optional(),
      otherwise: Joi.required(),
    }),
    htmlBody: Joi.string().when('channel', {
      is: 'email',
      then: Joi.optional(),
      otherwise: Joi.optional(),
    }),
    plainTextBody: Joi.string().when('channel', {
      is: 'email',
      then: Joi.optional(),
      otherwise: Joi.optional(),
    }),
    subject: Joi.string().when('channel', {
      is: Joi.string().valid('email', 'fcm'),
      then: Joi.optional(),
      otherwise: Joi.optional(),
    }),
    footer: Joi.string().optional(),
    headerType: Joi.string().valid('text', 'image', 'video', 'document', 'location').optional(),
    headerContent: Joi.string().optional(),
    variables: Joi.array().items(Joi.string()).optional(),
    buttons: Joi.array().optional(),
    language: Joi.string().optional(),
    description: Joi.string().optional(),
    tags: Joi.array().items(Joi.string()).optional(),
    smsTemplateId: Joi.string().allow(null, '').optional(),
    whatsappTemplateId: Joi.string().allow(null, '').optional(),
  }),

  update: Joi.object({
    name: Joi.string().optional(),
    body: Joi.string().optional(),
    htmlBody: Joi.string().optional(),
    plainTextBody: Joi.string().optional(),
    subject: Joi.string().optional(),
    footer: Joi.string().optional(),
    variables: Joi.array().items(Joi.string()).optional(),
    buttons: Joi.array().optional(),
    description: Joi.string().optional(),
    tags: Joi.array().items(Joi.string()).optional(),
    smsTemplateId: Joi.string().allow(null, '').optional(),
    whatsappTemplateId: Joi.string().allow(null, '').optional(),
    headerType: Joi.string().valid('text', 'image', 'video', 'document', 'location').optional(),
    headerContent: Joi.string().allow(null, '').optional(),
    category: Joi.string().valid('marketing', 'transactional', 'utility', 'authentication').optional(),
    language: Joi.string().optional(),
  }),

  reject: Joi.object({
    reason: Joi.string().required(),
  }),
};

module.exports = { templateValidation };


