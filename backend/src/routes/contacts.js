const express = require('express');
const contactController = require('../controllers/contactController');
const contactImportController = require('../controllers/contactImportController');
const { authenticate, requirePermission } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { contactValidation } = require('../validations/contactValidation');
const { uploadContactImport } = require('../utils/fileUpload');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

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

