const express = require('express');
const contactGroupController = require('../controllers/contactGroupController');
const { authenticate, requirePermission } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { contactGroupValidation } = require('../validations/contactGroupValidation');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Filter helpers — must be declared BEFORE the parameterized `/:id` routes
// so Express doesn't mistake "filter-fields" for an id.
router.get('/filter-fields', contactGroupController.allowedFields);
router.get('/distinct/:field',
  requirePermission('canManageContacts'),
  contactGroupController.distinctValues,
);
router.post('/preview',
  requirePermission('canManageContacts'),
  contactGroupController.previewFilter,
);

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

// User assignments — admins map specific operators to specific groups so
// the operator only sees those groups in their UI. Restricted to people
// who can manage users (admins/managers).
router.get(
  '/:id/assigned-users',
  requirePermission('canManageContacts'),
  contactGroupController.listAssignedUsers
);

router.put(
  '/:id/assigned-users',
  requirePermission('canManageUsers'),
  contactGroupController.setAssignedUsers
);

// Bulk assignment across many groups × many users. POST so the body can
// carry arrays; not idempotent in 'add'/'remove' modes (only 'replace' is).
router.post(
  '/assignments/bulk',
  requirePermission('canManageUsers'),
  contactGroupController.bulkAssign
);

// Per-user assignment view: list/replace the groups one operator can see.
// Powers the "Update Assigned" workflow (pre-check the operator's current
// groups, admin toggles, then PUT replaces the whole set).
router.get(
  '/assigned-to/:userId',
  requirePermission('canManageContacts'),
  contactGroupController.listUserAssignedGroups
);
router.put(
  '/assigned-to/:userId',
  requirePermission('canManageUsers'),
  contactGroupController.setUserAssignedGroups
);

module.exports = router;

