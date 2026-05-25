/**
 * Live Chat backend.
 *
 * Powers the operator-facing two-pane chat UI:
 *   - Conversation list grouped by customer phone (with last-message preview + unread counts)
 *   - Per-thread message history (cursor-paginated for infinite-scroll-up)
 *   - Reply via free text (within Meta's 24-hour customer-service window) or template
 *   - Mark-as-read when an operator opens a thread
 *
 * Inbound persistence happens elsewhere (whatsappService.handleInboundMessage,
 * fired from the webhook). This service is read-side only, plus the reply-write.
 */
const { Op, QueryTypes } = require('sequelize');
const { Message, Contact, Template, OrganizationSettings, WebhookEvent, sequelize } = require('../models');
const { AppError, NotFoundError } = require('../utils/errorTypes');
const { normalizePhone } = require('../utils/phoneNumber');

const META_REPLY_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * List the operator's WhatsApp conversations, one row per customer phone,
 * ordered by most-recent message. Includes unread counts and a snippet of
 * the last message so the left-pane list can render without N+1 fetches.
 */
async function listConversations(organizationId, { search = '', page = 1, limit = 30 } = {}) {
  const offset = Math.max(0, (Number(page) - 1) * Number(limit));
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 30));

  // Aggregate per phone, GROUPing on the digits-only canonical form so a
  // customer who was sent a message at "+91 99999..." and replied as
  // "9199999..." (Meta's webhook format) collapses to a single conversation.
  const rows = await sequelize.query(
    `
    SELECT
      REPLACE(REPLACE(REPLACE(REPLACE(m.recipient_phone, '+', ''), ' ', ''), '-', ''), '(', '') AS phone,
      MAX(m.created_at) AS lastAt,
      SUM(CASE WHEN m.direction = 'inbound' AND m.is_read = 0 THEN 1 ELSE 0 END) AS unreadCount
    FROM messages m
    WHERE m.organization_id = :orgId
      AND m.channel = 'whatsapp'
      AND m.recipient_phone IS NOT NULL
    GROUP BY phone
    ORDER BY lastAt DESC
    LIMIT :limit OFFSET :offset
    `,
    {
      replacements: { orgId: organizationId, limit: safeLimit, offset },
      type: QueryTypes.SELECT,
    }
  );

  if (rows.length === 0) return [];

  // For each canonical phone, fetch the latest message (snippet/direction)
  // and resolve the contact display name. We can't do a simple `IN` on
  // recipient_phone because the stored value may be in either format — match
  // against the same normalize-on-the-fly expression.
  const canonicalPhones = rows.map((r) => r.phone);

  const lastMessages = await sequelize.query(
    `
    SELECT m.* FROM messages m
    INNER JOIN (
      SELECT REPLACE(REPLACE(REPLACE(REPLACE(recipient_phone, '+', ''), ' ', ''), '-', ''), '(', '') AS canonical,
             MAX(created_at) AS max_created
      FROM messages
      WHERE organization_id = :orgId AND channel = 'whatsapp'
      GROUP BY canonical
    ) latest ON
      REPLACE(REPLACE(REPLACE(REPLACE(m.recipient_phone, '+', ''), ' ', ''), '-', ''), '(', '') = latest.canonical
      AND m.created_at = latest.max_created
    WHERE m.organization_id = :orgId AND m.channel = 'whatsapp'
    `,
    {
      replacements: { orgId: organizationId },
      type: QueryTypes.SELECT,
    }
  );
  const lastByCanonical = new Map();
  for (const m of lastMessages) {
    const canon = normalizePhone(m.recipient_phone);
    if (!lastByCanonical.has(canon)) lastByCanonical.set(canon, m);
  }

  // Contacts — match by normalized phone too, so a contact saved with '+'
  // matches an inbound message stored without it.
  const contacts = await Contact.findAll({
    where: { organizationId, deletedAt: null },
    attributes: ['id', 'phoneNumber', 'name'],
  });
  const contactByCanonical = new Map();
  for (const c of contacts) {
    const canon = normalizePhone(c.phoneNumber);
    if (canon && !contactByCanonical.has(canon)) contactByCanonical.set(canon, c);
  }

  let result = rows.map((r) => {
    const last = lastByCanonical.get(r.phone);
    const contact = contactByCanonical.get(r.phone);
    return {
      phone: r.phone,
      name: contact?.name || null,
      contactId: contact?.id || null,
      lastSnippet: (last?.content || '').slice(0, 120),
      lastDirection: last?.direction || 'outbound',
      lastAt: r.lastAt,
      unreadCount: Number(r.unreadCount) || 0,
    };
  });

  // Optional search filter — done in JS rather than the SQL above so we don't
  // have to join on contacts and complicate the GROUP BY. Query is bounded
  // by `limit` so this is cheap.
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    const qDigits = normalizePhone(q);
    result = result.filter((c) => {
      if ((c.name || '').toLowerCase().includes(q)) return true;
      // Only match phone if the search term has digits — otherwise a name
      // search like "Rishabh" normalizes to '' and would match every phone.
      return qDigits.length > 0 && c.phone.includes(qDigits);
    });
  }

  return result;
}

/**
 * Fetch the conversation thread for one customer phone within an org.
 * Cursor pagination: pass `before` (ISO timestamp) to fetch older messages
 * for infinite-scroll-up.
 */
async function getThread(organizationId, phone, { before, limit = 50 } = {}) {
  const safeLimit = Math.min(200, Math.max(1, Number(limit) || 50));
  const canonical = normalizePhone(phone);
  // Match on the normalized form so messages stored as '+919...' and '919...'
  // both come through. We use a literal where clause + sequelize.literal
  // because Sequelize doesn't natively express function-of-column equality.
  const where = {
    organizationId,
    channel: 'whatsapp',
    [Op.and]: sequelize.literal(
      `REPLACE(REPLACE(REPLACE(REPLACE(recipient_phone, '+', ''), ' ', ''), '-', ''), '(', '') = ${sequelize.escape(canonical)}`
    ),
  };
  if (before) where.createdAt = { [Op.lt]: new Date(before) };

  const messages = await Message.findAll({
    where,
    order: [['createdAt', 'DESC']],
    limit: safeLimit,
    include: [
      {
        // Eager-load the linked template so the chat UI can render the
        // attached carousel cards / header media even though the message row
        // itself only holds the body text.
        model: Template,
        as: 'template',
        required: false,
        attributes: [
          'id', 'name', 'templateType', 'headerType', 'headerContent',
          'cards', 'buttons', 'footer', 'category',
        ],
      },
    ],
  });

  // The DB returned newest-first (so we can paginate older slices); reverse
  // for the UI which appends oldest-first to scrollable container.
  return messages.reverse().map((m) => m.toJSON());
}

/**
 * Send a reply from operator to customer.
 *
 * Two modes:
 *   - { text }                 — free-form text. Only allowed inside Meta's
 *                                24-hour customer-service window (i.e. the
 *                                customer messaged us in the last 24h).
 *   - { templateId, variables } — approved template, allowed any time.
 *
 * Returns the freshly-created Message row. The message worker (jobs/messageWorker.js,
 * 2s poll) picks it up from `queued` and dispatches via whatsappService.sendMessage.
 */
async function sendReply(organizationId, userId, phone, payload) {
  const { text, templateId, variables } = payload || {};
  if (!phone) throw new AppError('phone is required', 400);
  if (!text && !templateId) throw new AppError('Either text or templateId is required', 400);
  if (text && templateId) throw new AppError('Provide text OR templateId, not both', 400);

  const canonical = normalizePhone(phone);

  // Find or create contact by canonical phone (handle existing rows that may
  // have been saved with '+' or other formatting).
  const ContactModel = require('../models').Contact;
  const allOrgContacts = await ContactModel.findAll({
    where: { organizationId, deletedAt: null },
    attributes: ['id', 'phoneNumber', 'name'],
  });
  let contact = allOrgContacts.find((c) => normalizePhone(c.phoneNumber) === canonical) || null;
  if (!contact) {
    contact = await ContactModel.create({
      organizationId,
      createdBy: userId,
      phoneNumber: canonical,
      status: 'active',
      source: 'Live Chat',
      optInStatus: 'pending',
    });
  }

  if (text) {
    // Window check: must have an inbound from this phone within last 24h.
    const lastInbound = await Message.findOne({
      where: {
        organizationId,
        channel: 'whatsapp',
        direction: 'inbound',
        [Op.and]: sequelize.literal(
          `REPLACE(REPLACE(REPLACE(REPLACE(recipient_phone, '+', ''), ' ', ''), '-', ''), '(', '') = ${sequelize.escape(canonical)}`
        ),
      },
      order: [['createdAt', 'DESC']],
    });
    const within = lastInbound &&
      Date.now() - new Date(lastInbound.createdAt).getTime() < META_REPLY_WINDOW_MS;
    if (!within) {
      throw new AppError(
        'Outside the 24-hour customer-service window. Please use an approved template to reply.',
        422
      );
    }

    const message = await Message.create({
      organizationId,
      sentBy: userId,
      contactId: contact.id,
      channel: 'whatsapp',
      direction: 'outbound',
      messageType: 'text',
      recipientPhone: canonical,
      recipientName: contact.name || null,
      content: text,
      requiresApproval: false,
      approvalStatus: 'approved',
      deliveryStatus: 'queued',
      isRead: true,
    });
    return message;
  }

  // Template path
  const template = await Template.findOne({
    where: { id: templateId, organizationId, status: 'approved', channel: 'whatsapp' },
  });
  if (!template) throw new NotFoundError('Approved WhatsApp template');

  const message = await Message.create({
    organizationId,
    sentBy: userId,
    contactId: contact.id,
    channel: 'whatsapp',
    direction: 'outbound',
    messageType: 'template',
    templateId: template.id,
    recipientPhone: canonical,
    recipientName: contact.name || null,
    content: template.body || '',
    requiresApproval: false,
    approvalStatus: 'approved',
    deliveryStatus: 'queued',
    isRead: true,
    metadata: variables ? { variables } : null,
  });
  return message;
}

/**
 * Mark every inbound message in this thread as read. Called when an operator
 * opens the conversation. Idempotent.
 */
async function markRead(organizationId, phone) {
  const canonical = normalizePhone(phone);
  const [count] = await Message.update(
    { isRead: true },
    {
      where: {
        organizationId,
        channel: 'whatsapp',
        direction: 'inbound',
        isRead: false,
        [Op.and]: sequelize.literal(
          `REPLACE(REPLACE(REPLACE(REPLACE(recipient_phone, '+', ''), ' ', ''), '-', ''), '(', '') = ${sequelize.escape(canonical)}`
        ),
      },
    }
  );
  return { updated: count };
}

/**
 * For the composer: tell the frontend whether the 24-hour window is currently
 * open and when it expires. Lets the UI swap text input for template picker
 * BEFORE the operator types and gets a 422.
 */
async function getReplyWindowStatus(organizationId, phone) {
  const canonical = normalizePhone(phone);
  const lastInbound = await Message.findOne({
    where: {
      organizationId,
      channel: 'whatsapp',
      direction: 'inbound',
      [Op.and]: sequelize.literal(
        `REPLACE(REPLACE(REPLACE(REPLACE(recipient_phone, '+', ''), ' ', ''), '-', ''), '(', '') = ${sequelize.escape(canonical)}`
      ),
    },
    order: [['createdAt', 'DESC']],
  });
  if (!lastInbound) {
    return { open: false, expiresAt: null, lastInboundAt: null };
  }
  const lastAt = new Date(lastInbound.createdAt);
  const expiresAt = new Date(lastAt.getTime() + META_REPLY_WINDOW_MS);
  return {
    open: expiresAt.getTime() > Date.now(),
    expiresAt,
    lastInboundAt: lastAt,
  };
}

/**
 * Diagnostic for the Live Chat UI: tells the operator whether their org's
 * webhook is configured well enough that Meta will deliver inbound messages.
 *
 * The most common failure mode (and the source of most "I texted but nothing
 * showed up" reports) is a missing whatsapp_webhook_verify_token — without it
 * Meta can't complete the subscription handshake, so no inbound webhooks
 * ever fire.
 */
async function getWebhookStatus(organizationId, { publicBaseUrl } = {}) {
  const settings = await OrganizationSettings.findOne({ where: { organizationId } });
  const expectedCallbackUrl = publicBaseUrl
    ? `${publicBaseUrl.replace(/\/$/, '')}/api/v1/webhooks/whatsapp`
    : null;

  if (!settings) {
    return {
      ready: false,
      reason: 'WhatsApp not configured for this organization.',
      checks: {
        whatsappBusinessAccountId: false,
        whatsappPhoneNumberId: false,
        whatsappAccessToken: false,
        whatsappWebhookVerifyToken: false,
        directionColumn: true,
      },
      inboundMessageCount: 0,
      recentWebhookHits: 0,
      recentInboundHits: 0,
      recentErrorHits: 0,
      lastWebhookAt: null,
      lastWebhookError: null,
      expectedCallbackUrl,
    };
  }

  const checks = {
    whatsappBusinessAccountId: !!settings.whatsappBusinessAccountId,
    whatsappPhoneNumberId: !!settings.whatsappPhoneNumberId,
    whatsappAccessToken: !!settings.whatsappAccessToken,
    whatsappWebhookVerifyToken: !!settings.whatsappWebhookVerifyToken,
    // Schema check — on a fresh server, the migrate-add-message-direction
    // script may not have run yet. Without the direction column the inbound
    // handler will fail to insert. Probe INFORMATION_SCHEMA for clarity.
    directionColumn: await hasDirectionColumn(),
  };
  const baseReady =
    checks.whatsappBusinessAccountId &&
    checks.whatsappPhoneNumberId &&
    checks.whatsappAccessToken &&
    checks.whatsappWebhookVerifyToken;
  const ready = baseReady && checks.directionColumn;

  let reason = null;
  if (!ready) {
    if (!checks.directionColumn) {
      reason = 'Database migration not applied: messages.direction column missing. SSH to the server and run `node backend/scripts/migrate-all.js`.';
    } else if (!checks.whatsappWebhookVerifyToken) {
      reason = 'Webhook Verify Token is not set in Settings → WhatsApp → Manual Configuration. Without it Meta cannot subscribe inbound messages.';
    } else if (!checks.whatsappAccessToken) {
      reason = 'WhatsApp access token is missing.';
    } else if (!checks.whatsappPhoneNumberId) {
      reason = 'WhatsApp phone number ID is missing.';
    } else if (!checks.whatsappBusinessAccountId) {
      reason = 'WhatsApp Business Account ID is missing.';
    }
  }

  // Inbound message count — has Meta ever delivered anything?
  const inboundMessageCount = await Message.count({
    where: { organizationId, channel: 'whatsapp', direction: 'inbound' },
  });

  // Webhook-event activity in the last 24h. Distinguishes:
  //   - 0 recent hits → Meta isn't calling our URL (URL wrong / not subscribed
  //     / not publicly reachable)
  //   - hits exist but only 'status' direction → Meta calls but we never get
  //     inbound (WABA not subscribed to 'messages' field)
  //   - recent inbound hits but inboundMessageCount stayed flat → handler
  //     errored (see lastWebhookError)
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  let recentWebhookHits = 0;
  let recentInboundHits = 0;
  let recentErrorHits = 0;
  let lastWebhookAt = null;
  let lastWebhookError = null;
  if (WebhookEvent) {
    try {
      recentWebhookHits = await WebhookEvent.count({
        where: { organizationId, createdAt: { [Op.gte]: since } },
      });
      recentInboundHits = await WebhookEvent.count({
        where: { organizationId, direction: 'inbound', createdAt: { [Op.gte]: since } },
      });
      recentErrorHits = await WebhookEvent.count({
        where: { organizationId, status: 'error', createdAt: { [Op.gte]: since } },
      });
      const lastRow = await WebhookEvent.findOne({
        where: { organizationId },
        order: [['createdAt', 'DESC']],
        attributes: ['createdAt', 'errorMessage', 'status', 'direction'],
      });
      if (lastRow) {
        lastWebhookAt = lastRow.createdAt;
        if (lastRow.status === 'error') lastWebhookError = lastRow.errorMessage || null;
      }
    } catch (_) {
      // webhook_events table may not exist on very old deployments
    }
  }

  // Refine the reason based on hit data — config might be fine but Meta still
  // can't reach the URL, or the WABA isn't subscribed to messages.
  if (!reason && baseReady) {
    if (recentWebhookHits === 0) {
      reason = `Config looks good but Meta has not called the webhook in the last 24h. Verify the Callback URL in Meta App Dashboard → WhatsApp → Configuration → Webhooks matches: ${expectedCallbackUrl || '<your public URL>/api/v1/webhooks/whatsapp'}`;
    } else if (recentInboundHits === 0) {
      reason = 'Meta is calling the webhook (status updates) but never delivers inbound messages. Open Meta App Dashboard → WhatsApp → Configuration → Webhooks and subscribe to the "messages" field.';
    } else if (recentErrorHits > 0) {
      reason = `Webhook is firing but the handler is erroring. Last error: ${lastWebhookError || 'see Webhook Events page'}.`;
    }
  }

  return {
    ready,
    reason,
    checks,
    inboundMessageCount,
    recentWebhookHits,
    recentInboundHits,
    recentErrorHits,
    lastWebhookAt,
    lastWebhookError,
    phoneNumberId: settings.whatsappPhoneNumberId || null,
    expectedCallbackUrl,
  };
}

/**
 * Probe MySQL information_schema to confirm messages.direction exists.
 * Cached for 60s per process to avoid hammering the schema metadata on
 * every webhook-status request.
 */
let _directionCheck = { at: 0, value: null };
async function hasDirectionColumn() {
  const now = Date.now();
  if (_directionCheck.value !== null && now - _directionCheck.at < 60_000) {
    return _directionCheck.value;
  }
  try {
    const [rows] = await sequelize.query(`
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'messages'
        AND COLUMN_NAME = 'direction'
      LIMIT 1
    `);
    const ok = Array.isArray(rows) && rows.length > 0;
    _directionCheck = { at: now, value: ok };
    return ok;
  } catch (_) {
    return true; // fail-open: don't block on a schema probe failure
  }
}

module.exports = {
  listConversations,
  getThread,
  sendReply,
  markRead,
  getReplyWindowStatus,
  getWebhookStatus,
  normalizePhone,
};
