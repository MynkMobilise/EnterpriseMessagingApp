/**
 * HTTP wrappers for Live Chat endpoints. Thin layer — all business logic
 * lives in chatService.
 */
const chatService = require('../services/chatService');

async function listConversations(req, res, next) {
  try {
    const { search, page, limit } = req.query;
    const data = await chatService.listConversations(req.user.organizationId, {
      search,
      page,
      limit,
    });
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

async function getThread(req, res, next) {
  try {
    const { phone } = req.params;
    const { before, limit } = req.query;
    const [data, windowStatus] = await Promise.all([
      chatService.getThread(req.user.organizationId, phone, { before, limit }),
      chatService.getReplyWindowStatus(req.user.organizationId, phone),
    ]);
    res.json({ success: true, data, windowStatus });
  } catch (e) {
    next(e);
  }
}

async function sendReply(req, res, next) {
  try {
    const { phone } = req.params;
    const { text, templateId, variables } = req.body || {};
    const message = await chatService.sendReply(
      req.user.organizationId,
      req.user.id,
      phone,
      { text, templateId, variables }
    );
    res.status(201).json({ success: true, data: message });
  } catch (e) {
    next(e);
  }
}

async function markRead(req, res, next) {
  try {
    const { phone } = req.params;
    const result = await chatService.markRead(req.user.organizationId, phone);
    res.json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
}

async function webhookStatus(req, res, next) {
  try {
    // Reconstruct the public base URL from the request so the diagnostic can
    // echo back the exact callback URL the operator should paste into Meta.
    // Honor X-Forwarded-* headers because we're behind nginx in production.
    const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'https').toString().split(',')[0].trim();
    const host = (req.headers['x-forwarded-host'] || req.headers.host || '').toString().split(',')[0].trim();
    const publicBaseUrl = host ? `${proto}://${host}` : null;
    const data = await chatService.getWebhookStatus(req.user.organizationId, { publicBaseUrl });
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

module.exports = {
  listConversations,
  getThread,
  sendReply,
  markRead,
  webhookStatus,
};
