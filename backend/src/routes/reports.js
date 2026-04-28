const express = require('express');
const reportController = require('../controllers/reportController');
const exportController = require('../controllers/exportController');
const { authenticate, requirePermission } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// All routes require view reports permission
router.use(requirePermission('canViewReports'));

router.get('/messages',
  reportController.getMessageStats
);

router.get('/templates',
  reportController.getTemplateStats
);

router.get('/contacts',
  reportController.getContactStats
);

router.get('/dashboard',
  reportController.getDashboardSummary
);

// Dashboard charts
router.get('/dashboard/activity',
  reportController.getMessageActivity
);

router.get('/dashboard/template-usage',
  reportController.getTemplateUsage
);

router.get('/dashboard/failure-reasons',
  reportController.getFailureReasons
);

router.get('/dashboard/recent-activity',
  reportController.getRecentActivity
);

// MIS Reports
router.get('/message-volume',
  reportController.getMessageVolumeReport
);

router.get('/template-performance',
  reportController.getTemplatePerformanceReport
);

router.get('/delivery-success',
  reportController.getDeliverySuccessReport
);

router.get('/cost-analysis',
  reportController.getCostAnalysisReport
);

router.get('/user-activity',
  reportController.getUserActivityReport
);

router.get('/channel-comparison',
  reportController.getChannelComparisonReport
);

router.get('/all-messages',
  reportController.getAllMessagesReport
);

// Export route
router.get('/export',
  exportController.exportReport
);

module.exports = router;


