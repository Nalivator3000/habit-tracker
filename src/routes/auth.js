const express = require('express');
const router = express.Router();

// Placeholder auth routes - will be implemented in next phase
router.get('/', (req, res) => {
  res.json({
    message: 'Auth routes',
    availableEndpoints: [
      'POST /api/auth/register',
      'POST /api/auth/login',
      'POST /api/auth/refresh',
      'POST /api/auth/forgot-password',
      'POST /api/auth/reset-password',
    ],
  });
});

// Register route placeholder
router.post('/register', (req, res) => {
  res.status(501).json({
    message: 'Registration endpoint - coming soon',
    required: ['email', 'password', 'name'],
  });
});

// Login route placeholder
router.post('/login', (req, res) => {
  res.status(501).json({
    message: 'Login endpoint - coming soon',
    required: ['email', 'password'],
  });
});

module.exports = router;