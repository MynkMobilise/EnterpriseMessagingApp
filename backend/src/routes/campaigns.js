const express = require('express');
const campaignController = require('../controllers/campaignController');
const { authenticate, requirePermission } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

// All endpoints are gated by canViewReports — same permission that controls
// access to MIS Reports and the Leadership Dashboard. Operators who can send
// don't automatically see analytics.
router.use(requirePermission('canViewReports'));

// GET  /api/v1/campaigns                       — paginated list with live rollups
// GET  /api/v1/campaigns/:id                   — single campaign + breakdown
// GET  /api/v1/campaigns/:id/messages          — paginated message list
// GET  /api/v1/campaigns/:id/export.csv        — CSV of every message
router.get('/', campaignController.list);
router.get('/:id', campaignController.getById);
router.get('/:id/messages', campaignController.listMessages);
router.get('/:id/export.csv', campaignController.exportCsv);

module.exports = router;
