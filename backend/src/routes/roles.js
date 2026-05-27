const express = require('express');
const roleController = require('../controllers/roleController');
const { authenticate, requirePermission } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// List all roles (system + custom) for the caller's org.
router.get('/', roleController.list);
router.get('/stats', roleController.getStats);

// Phase 2 — custom role CRUD. Cap enforcement (Organization.featureFlags.
// maxCustomRoles) happens inside the service.
router.post('/', requirePermission('canAssignRoles'), roleController.createCustom);

// Convenience: numeric id lookup before the :name route swallows everything.
router.get('/id/:id', roleController.getById);
router.put('/id/:id', requirePermission('canAssignRoles'), roleController.updateCustom);
router.delete('/id/:id', requirePermission('canAssignRoles'), roleController.deleteCustom);

// Legacy / back-compat: identifier-by-name (works for system roleKeys too).
router.get('/:name', roleController.getByName);
router.get('/:name/users', requirePermission('canManageUsers'), roleController.getUsersByRole);

// Tune / reset per-role permissions. Works for both system and custom rows,
// resolved by name or numeric id. Super-admin role is rejected inside the
// service.
router.put(
  '/:name/permissions',
  requirePermission('canAssignRoles'),
  roleController.updatePermissions
);
router.delete(
  '/:name/permissions',
  requirePermission('canAssignRoles'),
  roleController.resetPermissions
);

module.exports = router;

