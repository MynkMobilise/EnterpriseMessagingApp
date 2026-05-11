/**
 * Public/external integration endpoints.
 *
 * These let an external system (HRMS, CRM, ERP, ...) trigger messages
 * without going through the tenant UI. Auth is via API key only — no JWT.
 *
 *   curl -X POST https://suchna.onmobilise.com/api/v1/integrations/messages \
 *     -H "X-API-Key: sk_live_<your-key>" \
 *     -H "Content-Type: application/json" \
 *     -d '{
 *       "channel": "whatsapp",
 *       "to": "+919999999999",
 *       "templateName": "greetings",
 *       "variables": {"1": "Mayank"}
 *     }'
 *
 * Behavior:
 *   - skipApproval defaults to TRUE on this path. Approval workflows are a
 *     human-in-the-loop construct that doesn't fit the machine-to-machine use
 *     case. If an org wants approval gating for integration calls too, they
 *     can pass `requireApproval: true` in the body.
 *   - The Message row's `sentBy` is the user who created the API key.
 *   - The API key's per-minute / per-day rate limits are enforced upstream
 *     in the auth middleware.
 */
const express = require('express');
const Joi = require('joi');
const { authenticateApiKey } = require('../middleware/apiKeyAuth');
const { ValidationError } = require('../utils/errorTypes');
const messageService = require('../services/messageService');
const { Template } = require('../models');

const router = express.Router();

// All routes here are api-key authenticated.
router.use(authenticateApiKey);

/**
 * Compact payload that maps to the internal `messageService.send` shape.
 * External callers shouldn't need to know our internal field names — keep
 * this surface small and stable.
 */
const sendSchema = Joi.object({
  channel: Joi.string().valid('whatsapp', 'sms', 'email', 'fcm').default('whatsapp'),
  // Recipient — only one of these required, depending on channel.
  to: Joi.string(),                              // phone (whatsapp/sms) — alias for recipientPhone
  recipientPhone: Joi.string(),
  recipientEmail: Joi.string().email(),
  recipientFcmToken: Joi.string(),
  recipientName: Joi.string().allow(''),

  // Body — either templateName + variables, OR a free-text body. Templates
  // are looked up by name within the API key's organization.
  templateName: Joi.string(),
  templateId: Joi.alternatives().try(Joi.number().integer().positive(), Joi.string()),
  variables: Joi.object().pattern(Joi.string(), Joi.alternatives().try(Joi.string(), Joi.number())),

  // Free-text alternative — used when no template is specified.
  text: Joi.string(),
  body: Joi.string(),
  subject: Joi.string(),

  priority: Joi.string().valid('low', 'normal', 'high', 'urgent').default('normal'),
  scheduledFor: Joi.date(),
  // Default: machine-to-machine sends bypass approval. Caller can opt back in.
  requireApproval: Joi.boolean().default(false),
}).or('to', 'recipientPhone', 'recipientEmail', 'recipientFcmToken')
  .or('templateName', 'templateId', 'text', 'body');

/**
 * POST /integrations/messages
 *
 * Send a single message via an external API key.
 */
router.post('/messages', async (req, res, next) => {
  try {
    const { error, value } = sendSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      const details = error.details.reduce((acc, d) => {
        acc[d.path.join('.')] = d.message;
        return acc;
      }, {});
      throw new ValidationError('Validation failed', details);
    }

    // Resolve templateName → templateId (callers shouldn't have to know our
    // internal numeric IDs).
    let templateId = value.templateId ? Number(value.templateId) : undefined;
    if (!templateId && value.templateName) {
      const tpl = await Template.findOne({
        where: {
          organizationId: req.organizationId,
          name: value.templateName,
          channel: value.channel,
          status: 'approved',
        },
      });
      if (!tpl) {
        return res.status(404).json({
          success: false,
          error: { message: `Approved ${value.channel} template not found: ${value.templateName}` },
        });
      }
      templateId = tpl.id;
    }

    const sendData = {
      channel: value.channel,
      recipientPhone: value.to || value.recipientPhone,
      recipientEmail: value.recipientEmail,
      recipientFcmToken: value.recipientFcmToken,
      recipientName: value.recipientName,
      messageType: templateId ? 'template' : 'text',
      content: value.text || value.body,
      subject: value.subject,
      templateId,
      variables: value.variables,
      priority: value.priority,
      scheduledFor: value.scheduledFor,
      category: 'integration',
      skipApproval: !value.requireApproval,
    };

    // Attribute to the user who created the API key — Message.sentBy is a
    // real user id, used by audit trail and approval routing.
    const sentBy = req.apiKey?.createdBy || null;
    const message = await messageService.send(req.organizationId, sentBy, sendData);

    res.status(202).json({
      success: true,
      data: {
        messageId: message.id,
        deliveryStatus: message.deliveryStatus,
        approvalStatus: message.approvalStatus,
      },
      message:
        message.approvalStatus === 'pending'
          ? 'Submitted for approval'
          : 'Queued for sending',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /integrations/whoami — handy diagnostic the caller can hit to confirm
 * their API key is valid and which org it's bound to.
 */
router.get('/whoami', (req, res) => {
  res.json({
    success: true,
    data: {
      organizationId: req.organizationId,
      apiKeyId: req.apiKey.id,
      apiKeyName: req.apiKey.name,
      environment: req.apiKey.environment,
      scopes: req.apiKey.scopes || [],
      rateLimitPerMinute: req.apiKey.rateLimitPerMinute,
      rateLimitPerDay: req.apiKey.rateLimitPerDay,
    },
  });
});

module.exports = router;
