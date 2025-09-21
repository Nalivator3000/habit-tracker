const express = require('express');
const router = express.Router();

// API version info
router.get('/', (req, res) => {
  res.json({
    message: 'Habit Tracker API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      habits: '/api/habits',
      metrics: '/api/metrics',
      users: '/api/users',
    },
    documentation: 'https://github.com/Nalivator3000/habit-tracker',
  });
});

// Route modules
router.use('/auth', require('./auth'));
router.use('/habits', require('./habits'));
router.use('/admin', require('./admin'));
// router.use('/metrics', require('./metrics'));
// router.use('/users', require('./users'));

module.exports = router;