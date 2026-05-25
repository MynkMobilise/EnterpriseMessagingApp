const express = require('express');
const leadershipDashboardController = require('../controllers/leadershipDashboardController');
const { authenticate, requirePermission } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// Leadership dashboard — gated to people who can view reports. canManageOrganization
// is the truer "business-owner" gate but tying to canViewReports keeps the
// dashboard available to managers/admins who already see /reports.
router.get(
  '/leadership',
  requirePermission('canViewLeadership'),
  leadershipDashboardController.getDashboard
);

router.get(
  '/leadership/filters',
  requirePermission('canViewLeadership'),
  leadershipDashboardController.getFilterOptions
);

module.exports = router;
