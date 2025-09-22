const express = require('express');
const router = express.Router();

const habitController = require('../controllers/habitController');
const habitLogController = require('../controllers/habitLogController');
const { authenticateToken } = require('../middleware/auth');
const { validateHabit, validateHabitLog } = require('../middleware/validation');

// All habit routes require authentication - TEMPORARILY DISABLED FOR TESTING
// router.use(authenticateToken);

// Test endpoint for debugging
router.get('/test', (req, res) => {
  console.log('🧪 TEST: Simple test endpoint hit');
  res.json({
    success: true,
    message: 'Test endpoint works!',
    timestamp: new Date().toISOString()
  });
});

// Habit endpoints info
router.get('/', (req, res) => {
  console.log('🧪 HABITS: Main habits endpoint hit');
  try {
    habitController.getHabits(req, res);
  } catch (error) {
    console.error('🧪 HABITS: Controller error:', error);
    res.status(500).json({
      error: 'Controller error',
      message: error.message,
      stack: error.stack
    });
  }
});

// Habit CRUD operations
router.post('/', validateHabit, habitController.createHabit);
router.get('/overview', habitController.getHabitOverview);
router.get('/:id', habitController.getHabit);
router.put('/:id', validateHabit, habitController.updateHabit);
router.delete('/:id', habitController.deleteHabit);

// Habit statistics
router.get('/:id/stats', habitController.getHabitStats);

// Restore archived habit
router.post('/:id/restore', habitController.restoreHabit);

// Habit logging routes
router.post('/:habitId/log', validateHabitLog, habitLogController.logHabitCompletion);
router.get('/:habitId/logs', habitLogController.getHabitLogs);

// Individual log operations
router.get('/logs/:logId', habitLogController.getHabitLog);
router.put('/logs/:logId', validateHabitLog, habitLogController.updateHabitLog);
router.delete('/logs/:logId', habitLogController.deleteHabitLog);

// User log summaries
router.get('/logs', habitLogController.getAllUserLogs);
router.get('/logs/today', habitLogController.getTodayLogs);
router.get('/logs/weekly', habitLogController.getWeeklySummary);

module.exports = router;