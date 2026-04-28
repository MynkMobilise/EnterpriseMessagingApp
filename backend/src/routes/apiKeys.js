const express = require('express');
const apiKeyController = require('../controllers/apiKeyController');
const { authenticate, requirePermission } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { apiKeyValidation } = require('../validations/apiKeyValidation');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

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


