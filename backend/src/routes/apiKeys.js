const express = require('express');
const apiKeyController = require('../controllers/apiKeyController');
const { authenticate, requirePermission } = require('../middleware/auth');
const { requireFeature } = require('../utils/featureFlags');
const { validate } = require('../middleware/validation');
const { apiKeyValidation } = require('../validations/apiKeyValidation');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Per-tenant feature gate — API-key-based external integrations are a paid
// feature; super admin can disable for Starter tenants. Applied before the
// permission check so a 403 reads "feature not enabled" rather than
// "missing canManageAPIKeys".
router.use(requireFeature('apiKeyIntegration'));

// All routes require API key management permission
router.use(requirePermission('canManageAPIKeys'));

router.post('/',
  validate(apiKeyValidation.create),
  apiKeyController.create
);

router.get('/',
  apiKeyController.list
);

router.get('/:id',
  apiKeyController.getById
);

router.get('/:id/usage',
  apiKeyController.getUsageStats
);

router.post('/:id/revoke',
  validate(apiKeyValidation.revoke),
  apiKeyController.revoke
);

module.exports = router;


