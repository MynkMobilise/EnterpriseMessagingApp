const express = require('express');
const templateController = require('../controllers/templateController');
const templateImportController = require('../controllers/templateImportController');
const { authenticate, requirePermission } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { templateValidation } = require('../validations/templateValidation');
const { uploadContactImport } = require('../utils/fileUpload');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.post('/',
  requirePermission('canManageTemplates'),
  validate(templateValidation.create),
  templateController.create
);

router.get('/',
  templateController.list
);

// Import routes (must come before /:id route)
router.post('/import',
  requirePermission('canManageTemplates'),
  uploadContactImport('file'),
  templateImportController.import
);

router.get('/import/template',
  requirePermission('canManageTemplates'),
  templateImportController.downloadTemplate
);

router.get('/import/history',
  requirePermission('canManageTemplates'),
  templateImportController.getImportHistory
);

// Export route (must come before /:id route)
router.get('/export',
  requirePermission('canManageTemplates'),
  templateController.exportTemplates
);

// Sync WhatsApp templates from Meta on demand
router.post('/sync-from-meta',
  requirePermission('canManageTemplates'),
  templateController.syncFromMeta
);

// Specific routes must come before parameterized routes
router.post('/:id/submit',
  requirePermission('canManageTemplates'),
  templateController.submitForApproval
);

router.post('/:id/approve',
  requirePermission('canApproveMessages'),
  templateController.approve
);

router.post('/:id/reject',
  requirePermission('canApproveMessages'),
  validate(templateValidation.reject),
  templateController.reject
);

router.get('/:id',
  templateController.getById
);

router.put('/:id',
  requirePermission('canManageTemplates'),
  validate(templateValidation.update),
  templateController.update
);

router.delete('/:id',
  requirePermission('canManageTemplates'),
  templateController.delete
);

module.exports = router;


