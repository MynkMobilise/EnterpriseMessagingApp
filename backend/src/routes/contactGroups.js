const express = require('express');
const contactGroupController = require('../controllers/contactGroupController');
const { authenticate, requirePermission } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { contactGroupValidation } = require('../validations/contactGroupValidation');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.get('/', contactGroupController.list);
router.get('/:id', contactGroupController.getById);
router.get('/:id/contacts', contactGroupController.getContacts);

router.post(
  '/',
  requirePermission('canManageContacts'),
  validate(contactGroupValidation.create),
  contactGroupController.create
);

router.put(
  '/:id',
  requirePermission('canManageContacts'),
  validate(contactGroupValidation.update),
  contactGroupController.update
);

router.delete(
  '/:id',
  requirePermission('canManageContacts'),
  contactGroupController.delete
);

router.post(
  '/:id/contacts',
  requirePermission('canManageContacts'),
  validate(contactGroupValidation.addContacts),
  contactGroupController.addContacts
);

router.delete(
  '/:id/contacts',
  requirePermission('canManageContacts'),
  validate(contactGroupValidation.removeContacts),
  contactGroupController.removeContacts
);

module.exports = router;

