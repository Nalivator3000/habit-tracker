const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const {
  validateRegistration,
  validateLogin,
  validatePasswordResetRequest,
  validatePasswordReset,
} = require('../middleware/validation');

// Auth endpoints info
router.get('/', (req, res) => {
  res.json({
    message: 'Habit Tracker Authentication API',
    version: '1.0.0',
    endpoints: {
      register: 'POST /api/auth/register',
      login: 'POST /api/auth/login',
      refresh: 'POST /api/auth/refresh',
      profile: 'GET /api/auth/profile (requires auth)',
      updateProfile: 'PUT /api/auth/profile (requires auth)',
      requestReset: 'POST /api/auth/forgot-password',
      resetPassword: 'POST /api/auth/reset-password',
      linkTelegram: 'POST /api/auth/link-telegram (requires auth)',
    },
  });
});

// Public routes
router.post('/register', validateRegistration, authController.register);
router.post('/login', validateLogin, authController.login);
router.post('/refresh', authController.refreshToken);
router.post('/forgot-password', validatePasswordResetRequest, authController.requestPasswordReset);
router.post('/reset-password', validatePasswordReset, authController.resetPassword);

// Protected routes
router.get('/profile', authenticateToken, authController.getProfile);
router.put('/profile', authenticateToken, authController.updateProfile);
router.post('/link-telegram', authenticateToken, authController.linkTelegram);

module.exports = router;