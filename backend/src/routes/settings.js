const express = require('express');
const settingsController = require('../controllers/settingsController');
const { authenticate, requirePermission } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { settingsValidation } = require('../validations/settingsValidation');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Organization settings (require manage settings permission)
router.get('/organization',
  requirePermission('canManageSettings'),
  settingsController.getOrganizationSettings
);

router.put('/organization',
  requirePermission('canManageSettings'),
  validate(settingsValidation.updateOrganizationSettings),
  settingsController.updateOrganizationSettings
);

// User preferences
router.get('/user',
  settingsController.getUserPreferences
);

router.put('/user',
  validate(settingsValidation.updateUserPreferences),
  settingsController.updateUserPreferences
);

// Get available SMS providers
router.get('/sms-providers',
  settingsController.getAvailableSmsProviders
);

// Get decrypted SMS API key (Auth Token)
router.get('/sms-api-key',
  requirePermission('canManageSettings'),
  settingsController.getDecryptedSmsApiKey
);

// Get decrypted Custom SMS Provider API Key
router.get('/custom-sms-api-key',
  requirePermission('canManageSettings'),
  settingsController.getDecryptedCustomSmsApiKey
);

// Test WhatsApp connection
router.post('/test-whatsapp-connection',
  requirePermission('canManageSettings'),
  settingsController.testWhatsAppConnection
);

// ─── SSO Integration ──────────────────────────────────────────────────
// Returns the SSO config: enabled flag, default role, and the *plain-text*
// secret. Always behind canManageSettings since the secret allows full user
// impersonation within the org.
router.get('/sso',
  requirePermission('canManageSettings'),
  settingsController.getSsoConfig
);

router.put('/sso',
  requirePermission('canManageSettings'),
  settingsController.updateSsoConfig
);

router.post('/sso/rotate',
  requirePermission('canManageSettings'),
  settingsController.rotateSsoSecret
);

module.exports = router;


