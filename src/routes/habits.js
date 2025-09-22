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
router.get('/', async (req, res) => {
  console.log('🧪 HABITS: Main habits endpoint hit');
  try {
    console.log('🧪 HABITS: About to call controller');

    // Test database connection first
    const { query } = require('../config/database');
    console.log('🧪 HABITS: Testing direct database query');
    const testResult = await query('SELECT COUNT(*) as count FROM habits WHERE user_id = $1', [3]);
    console.log('🧪 HABITS: Direct query result:', testResult.rows);

    // Try to import Habit model
    console.log('🧪 HABITS: Importing Habit model');
    const Habit = require('../models/Habit');
    console.log('🧪 HABITS: Habit model imported successfully');

    // Try simple model call
    console.log('🧪 HABITS: Calling Habit.findByUserId');
    const habits = await Habit.findByUserId(3);
    console.log('🧪 HABITS: Model call successful, habits count:', habits.length);

    res.json({
      success: true,
      habits: habits.map(h => h.toJSON ? h.toJSON() : h),
      count: habits.length,
      debugInfo: {
        directQueryCount: testResult.rows[0].count,
        modelResultCount: habits.length
      }
    });

  } catch (error) {
    console.error('🧪 HABITS: Detailed error:', error);
    res.status(500).json({
      error: 'Detailed controller error',
      message: error.message,
      stack: error.stack,
      code: error.code,
      name: error.name
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