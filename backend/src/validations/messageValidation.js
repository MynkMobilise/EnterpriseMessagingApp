const Joi = require('joi');

const messageValidation = {
  send: Joi.object({
    channel: Joi.string().valid('whatsapp', 'sms', 'email', 'fcm').required(),
    recipientPhone: Joi.string().when('channel', {
      is: Joi.string().valid('whatsapp', 'sms'),
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),
    recipientEmail: Joi.string().email().when('channel', {
      is: 'email',
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),
    recipientFcmToken: Joi.string().when('channel', {
      is: 'fcm',
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),
    recipientName: Joi.string().optional(),
    messageType: Joi.string().valid('text', 'template', 'media', 'html').required(),
    content: Joi.string().when('messageType', {
      is: 'template',
      then: Joi.optional(),
      otherwise: Joi.required(),
    }),
    subject: Joi.string().when('channel', {
      is: Joi.string().valid('email', 'fcm'),
      then: Joi.optional(),
      otherwise: Joi.optional(),
    }),
    templateId: Joi.number().integer().positive().when('messageType', {
      is: 'template',
      then: Joi.required(),
    }),
    variables: Joi.object().when('messageType', {
      is: 'template',
      then: Joi.optional(),
    }),
    priority: Joi.string().valid('low', 'normal', 'high', 'urgent').optional(),
    scheduledFor: Joi.date().optional(),
    category: Joi.string().optional(),
    // Operators with canApproveMessages can opt to bypass the org's approval
    // gate ("Approve & Send"). The controller enforces the permission check —
    // the schema just allows the field through.
    skipApproval: Joi.boolean().optional(),
    // Optional per-send override for the template's media header. Must be a
    // local /uploads/... path produced by POST /api/v1/media.
    headerMediaUrl: Joi.string().allow('', null).optional(),
  }),

  sendBulk: Joi.object({
    name: Joi.string().optional(),
    channel: Joi.string().valid('whatsapp', 'sms', 'email', 'fcm').required(),
    templateId: Joi.number().integer().positive().required(),
    recipients: Joi.array().items(
      Joi.object({
        phone: Joi.string().when('..channel', {
          is: Joi.string().valid('whatsapp', 'sms'),
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
        email: Joi.string().email().when('..channel', {
          is: 'email',
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
        fcmToken: Joi.string().when('..channel', {
          is: 'fcm',
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
        name: Joi.string().optional(),
        variables: Joi.object().optional(),
        // Per-recipient override for the template's media header (wins over
        // the batch-wide headerMediaUrl below).
        headerMediaUrl: Joi.string().allow('', null).optional(),
      })
    ).min(1).max(1000).required(),
    priority: Joi.string().valid('low', 'normal', 'high', 'urgent').optional(),
    scheduledFor: Joi.date().optional(),
    skipApproval: Joi.boolean().optional(),
    // Batch-wide default for the dynamic media header.
    headerMediaUrl: Joi.string().allow('', null).optional(),
  }),

  reject: Joi.object({
    reason: Joi.string().required(),
  }),

  bulkApprove: Joi.object({
    messageIds: Joi.array().items(Joi.number().integer().positive()).optional(),
    approveAllPending: Joi.boolean().optional(),
  }),
};

module.exports = { messageValidation };


