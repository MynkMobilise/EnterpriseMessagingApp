const express = require('express');
const messageController = require('../controllers/messageController');
const { authenticate, requirePermission } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { messageValidation } = require('../validations/messageValidation');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.post('/',
  requirePermission('canSendMessages'),
  validate(messageValidation.send),
  messageController.send
);

router.post('/bulk',
  requirePermission('canSendMessages'),
  validate(messageValidation.sendBulk),
  messageController.sendBulk
);

router.get('/',
  messageController.list
);

router.get('/export',
  requirePermission('canViewReports'),
  messageController.exportMessages
);

router.get('/pending-approvals',
  requirePermission('canApproveMessages'),
  messageController.listPendingApprovals
);

router.get('/:id',
  messageController.getById
);

router.post('/:id/approve',
  requirePermission('canApproveMessages'),
  messageController.approve
);

router.post('/:id/reject',
  requirePermission('canApproveMessages'),
  validate(messageValidation.reject),
  messageController.reject
);

router.post('/bulk-approve',
  requirePermission('canApproveMessages'),
  validate(messageValidation.bulkApprove),
  messageController.bulkApprove
);

module.exports = router;


