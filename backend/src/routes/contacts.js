const express = require('express');
const contactController = require('../controllers/contactController');
const contactImportController = require('../controllers/contactImportController');
const hrmsController = require('../controllers/hrmsController');
const { authenticate, requirePermission } = require('../middleware/auth');
const { requireFeature } = require('../utils/featureFlags');
const { validate } = require('../middleware/validation');
const { contactValidation } = require('../validations/contactValidation');
const { uploadContactImport } = require('../utils/fileUpload');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// ---- HRMS routes (must come BEFORE /:id so they aren't swallowed) -------
// Each HRMS route is gated by the hrmsSync feature flag — super admin can
// disable HRMS per tenant via Organization.featureOverrides and the four
// endpoints below start returning 403 immediately.
router.get('/hrms/config',
  requireFeature('hrmsSync'),
  requirePermission('canManageContacts'),
  hrmsController.getConfig
);
router.put('/hrms/config',
  requireFeature('hrmsSync'),
  requirePermission('canManageContacts'),
  hrmsController.updateConfig
);
router.post('/hrms/sync',
  requireFeature('hrmsSync'),
  requirePermission('canManageContacts'),
  hrmsController.syncNow
);
router.get('/hrms/template.csv',
  requireFeature('hrmsSync'),
  requirePermission('canManageContacts'),
  hrmsController.downloadTemplate
);

router.post('/',
  requirePermission('canManageContacts'),
  validate(contactValidation.create),
  contactController.create
);

router.get('/',
  contactController.list
);

router.get('/export',
  requirePermission('canManageContacts'),
  contactController.exportContacts
);

router.get('/:id',
  contactController.getById
);

router.put('/:id',
  requirePermission('canManageContacts'),
  validate(contactValidation.update),
  contactController.update
);

router.delete('/:id',
  requirePermission('canManageContacts'),
  contactController.delete
);

router.post('/bulk',
  requirePermission('canManageContacts'),
  validate(contactValidation.bulkOperation),
  contactController.bulkOperation
);

// Import routes
router.post('/import',
  requirePermission('canManageContacts'),
  uploadContactImport('file'),
  contactImportController.import
);

router.get('/import/history',
  requirePermission('canManageContacts'),
  contactImportController.getImportHistory
);

router.get('/import/template',
  requirePermission('canManageContacts'),
  contactImportController.downloadTemplate
);

module.exports = router;

