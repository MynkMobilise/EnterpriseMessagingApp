const express = require('express');
const chatController = require('../controllers/chatController');
const { authenticate, requirePermission } = require('../middleware/auth');

const router = express.Router();

// All chat routes require an authenticated tenant user.
router.use(authenticate);

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
