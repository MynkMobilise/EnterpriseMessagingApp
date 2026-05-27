const express = require('express');
const organizationController = require('../controllers/organizationController');
const { authenticate, requirePermission } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { organizationValidation } = require('../validations/organizationValidation');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// List organizations (accessible to all authenticated users)
router.get('/', organizationController.list);

// Get organization by ID
router.get('/:id', organizationController.getById);

// Create organization (requires manage organization permission or super admin)
// For now, allow all authenticated users to create organizations
router.post(
  '/',
  validate(organizationValidation.createOrganization.body),
  organizationController.create
);

// Update organization (requires manage organization permission)
// For now, allow users to update their own organization
router.put(
  '/:id',
  validate(organizationValidation.updateOrganization.body),
  organizationController.update
);

// Delete organization (only super admin)
router.delete('/:id', organizationController.delete);

// Super-admin: per-tenant feature flags. Returns plan baseline + overrides +
// effective for the UI; PUT body replaces the entire `featureOverrides` JSON.
// Controller enforces the super_admin role check.
router.get('/:id/features', organizationController.getFeatures);
router.put('/:id/features', organizationController.updateFeatures);

module.exports = router;

