const express = require('express');
const smsConfigurationController = require('../controllers/smsConfigurationController');
const { authenticate, requirePermission } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// All routes require manage settings permission
router.use(requirePermission('canManageSettings'));

// List configurations
router.get('/', smsConfigurationController.list);

// Get default configuration
router.get('/default', smsConfigurationController.getDefault);

// Get fallback configuration
router.get('/fallback', smsConfigurationController.getFallback);

// Get configuration by ID
router.get('/:id', smsConfigurationController.getById);

// Create configuration
router.post('/', smsConfigurationController.create);

// Update configuration
router.put('/:id', smsConfigurationController.update);

// Delete configuration
router.delete('/:id', smsConfigurationController.delete);

module.exports = router;

