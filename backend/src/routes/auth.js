const express = require('express');
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { authValidation } = require('../validations/authValidation');
// Rate limiting disabled for development
// const { authRateLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Public routes (rate limiting disabled)
router.post('/register',
  // authRateLimiter, // DISABLED
  validate(authValidation.register),
  authController.register
);

router.post('/login',
  // authRateLimiter, // DISABLED
  validate(authValidation.login),
  authController.login
);

router.post('/refresh',
  validate(authValidation.refreshToken),
  authController.refreshToken
);

router.post('/verify-email',
  validate(authValidation.verifyEmail),
  authController.verifyEmail
);

router.post('/forgot-password',
  // authRateLimiter, // DISABLED
  validate(authValidation.forgotPassword),
  authController.forgotPassword
);

router.post('/reset-password',
  validate(authValidation.resetPassword),
  authController.resetPassword
);

router.post('/logout',
  validate(authValidation.logout),
  authController.logout
);

// Protected routes
router.get('/me',
  authenticate,
  authController.getCurrentUser
);

router.post('/change-password',
  authenticate,
  validate(authValidation.changePassword),
  authController.changePasswordOnFirstLogin
);

router.post('/impersonate',
  authenticate,
  authController.impersonate
);

// Development only: Reset rate limits
router.post('/reset-rate-limits',
  authController.resetRateLimits
);

module.exports = router;


