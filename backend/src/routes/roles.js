const express = require('express');
const roleController = require('../controllers/roleController');
const { authenticate, requirePermission } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// List all roles (accessible to all authenticated users)
router.get('/', roleController.list);

// Get role statistics (accessible to all authenticated users)
router.get('/stats', roleController.getStats);

// Get role by name (accessible to all authenticated users)
router.get('/:name', roleController.getByName);

// Get users by role (requires user management permission)
router.get('/:name/users', requirePermission('canManageUsers'), roleController.getUsersByRole);

// Get role by name
router.get('/:name', roleController.getByName);

// Get users by role
router.get('/:name/users', roleController.getUsersByRole);

module.exports = router;

