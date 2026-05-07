const Joi = require('joi');

// Carousel card shape: matches the frontend CarouselCard interface.
//   - `id` is a stable client-generated handle (timestamp+counter).
//   - `media.url` may be an empty string for cards whose image was wiped by
//     a Meta sync (Meta doesn't echo back our public URL). The frontend
//     normalizes empty-URL media to null before send, but the backend stays
//     lenient so a stale row in the DB doesn't lock the user out of saving.
//   - `content` may be empty during draft saves; the submit-to-Meta path
//     re-validates non-emptiness when actually submitting.
const carouselCardSchema = Joi.object({
  id: Joi.string().required(),
  media: Joi.object({
    type: Joi.string().valid('image', 'video').required(),
    url: Joi.string().allow('').required(),
  }).allow(null),
  content: Joi.string().allow('').required(),
  buttons: Joi.array()
    .items(Joi.object({
      id: Joi.string(),
      type: Joi.string().valid('url', 'phone', 'quick_reply'),
      text: Joi.string().allow(''),
      value: Joi.string().allow(''),
    }))
    .max(2)
    .default([]),
});

const templateValidation = {
  create: Joi.object({
    name: Joi.string().required(),
    channel: Joi.string().valid('whatsapp', 'sms', 'email', 'fcm', 'both').required(),
    category: Joi.string().valid('marketing', 'transactional', 'utility', 'authentication').required(),
    templateType: Joi.string().valid('standard', 'carousel', 'limited_time').default('standard'),
    cards: Joi.array().items(carouselCardSchema).max(10).optional(),
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
    templateType: Joi.string().valid('standard', 'carousel', 'limited_time').optional(),
    cards: Joi.array().items(carouselCardSchema).max(10).optional(),
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


