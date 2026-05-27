const express = require('express');
const chatController = require('../controllers/chatController');
const { authenticate, requirePermission } = require('../middleware/auth');
const { requireFeature } = require('../utils/featureFlags');

const router = express.Router();

// All chat routes require an authenticated tenant user AND the Live Chat
// feature to be enabled for the tenant (per-plan baseline + super-admin
// per-tenant override). Disabling liveChat in the super-admin UI instantly
// 403s every endpoint here without a deploy.
router.use(authenticate);
router.use(requireFeature('liveChat'));

// Webhook readiness diagnostic for the Live Chat banner.
router.get(
  '/webhook-status',
  requirePermission('canViewLiveChat'),
  chatController.webhookStatus
);

// View conversation list / thread → canViewLiveChat
router.get(
  '/conversations',
  requirePermission('canViewLiveChat'),
  chatController.listConversations
);
router.get(
  '/conversations/:phone/messages',
  requirePermission('canViewLiveChat'),
  chatController.getThread
);

// Mark-read is part of the view experience.
router.post(
  '/conversations/:phone/read',
  requirePermission('canViewLiveChat'),
  chatController.markRead
);

// Sending a reply → canSendMessages
router.post(
  '/conversations/:phone/messages',
  requirePermission('canSendMessages'),
  chatController.sendReply
);

module.exports = router;
