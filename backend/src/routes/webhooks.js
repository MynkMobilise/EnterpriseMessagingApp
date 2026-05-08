const express = require('express');
const whatsappService = require('../services/whatsappService');
const { OrganizationSettings, WebhookEvent } = require('../models');
const { authenticate, requirePermission } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * WhatsApp webhook verification (Meta's subscription handshake).
 */
router.get('/whatsapp', async (req, res) => {
  try {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    // No query params at all → someone hit the URL in a browser to "see if
    // it works". Tell them what this endpoint is for instead of crashing.
    if (!mode && !token && !challenge) {
      return res.status(200).json({
        endpoint: 'WhatsApp webhook',
        method: 'POST for events, GET for Meta subscription handshake',
        usage: 'Meta App Dashboard → WhatsApp → Configuration → set Callback URL + Verify Token, then click "Verify and save".',
        expectedQueryParams: ['hub.mode=subscribe', 'hub.verify_token=<your-token>', 'hub.challenge=<echo-this>'],
      });
    }

    if (!token) {
      return res.status(400).send('Missing hub.verify_token');
    }

    const settings = await OrganizationSettings.findOne({
      where: { whatsappWebhookVerifyToken: token },
    });

    if (mode === 'subscribe' && settings) {
      logger.info('WhatsApp webhook verified', { organizationId: settings.organizationId });
      return res.status(200).send(challenge);
    }
    logger.warn('WhatsApp webhook verification failed', {
      mode,
      tokenMatches: !!settings,
    });
    return res.sendStatus(403);
  } catch (error) {
    logger.error('Webhook verification error:', error);
    res.sendStatus(500);
  }
});

/**
 * Look at the webhook payload and produce a tiny human-readable summary so
 * the operator can scan the Recent Webhooks list without expanding each row.
 */
function buildSummary(value, change) {
  if (Array.isArray(value?.messages) && value.messages.length > 0) {
    const m = value.messages[0];
    const body = m.text?.body ? `: "${String(m.text.body).slice(0, 60)}"` : '';
    return `inbound ${m.type || 'message'} from +${m.from || '?'}${body}`;
  }
  if (Array.isArray(value?.statuses) && value.statuses.length > 0) {
    const s = value.statuses[0];
    return `${s.status || 'status'} for wamid ${(s.id || '').slice(0, 32)}`;
  }
  if (change?.field === 'message_template_status_update') {
    return `template ${value?.event || 'update'}: ${value?.message_template_name || ''}`;
  }
  return change?.field || 'event';
}

/**
 * Webhook POST handler. Logs every hit to webhook_events so the UI can show
 * activity in real time, then delegates to whatsappService for actual
 * persistence + downstream effects.
 */
router.post('/whatsapp', async (req, res) => {
  // Always reply 200 fast so Meta doesn't retry. Logging + processing happen
  // synchronously below but errors are isolated per-change.
  res.sendStatus(200);

  try {
    const entry = req.body?.entry || [];
    for (const entryItem of entry) {
      const changes = entryItem?.changes || [];
      for (const change of changes) {
        await persistAndProcess(change, req.body);
      }
    }
  } catch (error) {
    logger.error('Webhook processing error:', error);
  }
});

async function persistAndProcess(change, fullPayload) {
  const value = change?.value || {};
  const phoneNumberId = value?.metadata?.phone_number_id;
  const summary = buildSummary(value, change);

  // Resolve org for visibility — if no match, still log so the operator can
  // see "this came in but didn't belong to any org".
  let organizationId = null;
  let resolvedReason = 'ok';
  if (phoneNumberId) {
    const settings = await OrganizationSettings.findOne({
      where: { whatsappPhoneNumberId: phoneNumberId },
      attributes: ['organizationId'],
    });
    if (settings) organizationId = settings.organizationId;
    else resolvedReason = 'unknown_org';
  } else if (change?.field === 'message_template_status_update') {
    // Template-status events don't carry phone_number_id; resolve by
    // template id later in the handler. Don't flag as unknown_org.
    resolvedReason = 'ok';
  }

  let direction = 'unknown';
  if (change?.field === 'messages') {
    direction = Array.isArray(value.messages) && value.messages.length > 0 ? 'inbound' : 'status';
  } else if (change?.field === 'message_template_status_update') {
    direction = 'template_status';
  }

  let status = resolvedReason === 'unknown_org' ? 'unknown_org' : 'ok';
  let errorMessage = null;

  // Run the actual handler. Capture failure to surface in the UI.
  try {
    await whatsappService.processWebhook({ entry: [{ changes: [change] }] });
  } catch (e) {
    status = 'error';
    errorMessage = e?.message || String(e);
    logger.error('Webhook handler failed', { error: errorMessage, field: change?.field });
  }

  // Persist the event row. Truncate payload aggressively to keep the table
  // tidy — full debug payloads should go to dedicated logs, not the DB.
  try {
    let payloadStr = '';
    try {
      payloadStr = JSON.stringify(fullPayload);
      if (payloadStr.length > 5000) payloadStr = payloadStr.slice(0, 5000) + '…';
    } catch (_) {
      payloadStr = '[unserializable]';
    }
    await WebhookEvent.create({
      organizationId,
      field: change?.field || null,
      direction,
      status,
      summary: summary ? summary.slice(0, 255) : null,
      payload: payloadStr,
      errorMessage,
    });
  } catch (e) {
    logger.warn('Failed to persist webhook_event row', { error: e.message });
  }
}

/**
 * GET /webhooks/recent — last N webhook events for the operator's org,
 * plus rows with organization_id NULL (delivery for "wrong" phone_number_id)
 * so they can debug "Meta is delivering but to nothing".
 */
router.get(
  '/recent',
  authenticate,
  requirePermission('canViewLiveChat'),
  async (req, res, next) => {
    try {
      const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
      const { Op } = require('sequelize');
      const rows = await WebhookEvent.findAll({
        where: {
          [Op.or]: [
            { organizationId: req.user.organizationId },
            { organizationId: null },
          ],
        },
        order: [['createdAt', 'DESC']],
        limit,
        attributes: [
          'id', 'organizationId', 'field', 'direction', 'status',
          'summary', 'errorMessage', 'createdAt',
        ],
      });
      res.json({ success: true, data: rows });
    } catch (e) {
      next(e);
    }
  }
);

module.exports = router;
