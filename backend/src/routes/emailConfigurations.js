const express = require('express');
const emailConfigurationController = require('../controllers/emailConfigurationController');
const { authenticate, requirePermission } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// All routes require manage settings permission
router.use(requirePermission('canManageSettings'));

// List configurations
router.get('/', emailConfigurationController.list);

// Get default configuration
router.get('/default', emailConfigurationController.getDefault);

// Get fallback configuration
router.get('/fallback', emailConfigurationController.getFallback);

// Get configuration by ID
router.get('/:id', emailConfigurationController.getById);

// Create configuration
router.post('/', emailConfigurationController.create);

// Update configuration
router.put('/:id', emailConfigurationController.update);

// Delete configuration
router.delete('/:id', emailConfigurationController.delete);

// Test configuration
router.post('/:id/test', emailConfigurationController.test);

module.exports = router;

