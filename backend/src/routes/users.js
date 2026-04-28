const express = require('express');
const userController = require('../controllers/userController');
const { authenticate, requirePermission } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { userValidation } = require('../validations/userValidation');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// All routes require user management permission
router.use(requirePermission('canManageUsers'));

// Get user statistics
router.get('/stats', userController.getStats);

// List users
router.get('/', userController.list);

// Get user by ID
router.get('/:id', userController.getById);

// Create user
router.post(
  '/',
  validate(userValidation.createUser.body),
  userController.create
);

// Update user
router.put(
  '/:id',
  validate(userValidation.updateUser.body),
  userController.update
);

// Delete user
router.delete('/:id', userController.delete);

// Resend credentials
router.post('/:id/resend-credentials', userController.resendCredentials);

module.exports = router;

