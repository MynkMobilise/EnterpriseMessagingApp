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
    const data = await chatService.getWebhookStatus(req.user.organizationId);
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
