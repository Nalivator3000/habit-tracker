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

// Ultra-simple habits endpoint for emergency testing
router.get('/', async (req, res) => {
  console.log('🚨 EMERGENCY: Ultra-simple endpoint hit');
  try {
    const { query } = require('../config/database');

    // Step 1: Test basic table access
    console.log('🚨 EMERGENCY: Testing basic table access');
    const basicTest = await query('SELECT COUNT(*) as count FROM habits');
    console.log('🚨 EMERGENCY: Basic count result:', basicTest.rows);

    // Step 2: Test specific user query
    console.log('🚨 EMERGENCY: Testing user-specific query');
    const userTest = await query('SELECT COUNT(*) as count FROM habits WHERE user_id = 3');
    console.log('🚨 EMERGENCY: User count result:', userTest.rows);

    // Step 3: Get actual data
    console.log('🚨 EMERGENCY: Getting actual data');
    const dataTest = await query('SELECT * FROM habits LIMIT 5');
    console.log('🚨 EMERGENCY: Sample data:', dataTest.rows);

    res.json({
      success: true,
      message: 'Emergency testing successful',
      results: {
        totalHabits: basicTest.rows[0].count,
        userHabits: userTest.rows[0].count,
        sampleData: dataTest.rows
      }
    });

  } catch (error) {
    console.error('🚨 EMERGENCY: Error:', error);
    res.status(500).json({
      success: false,
      error: 'Emergency test failed',
      message: error.message,
      stack: error.stack
    });
  }
});

// Simple working create habit endpoint without problematic model
router.post('/', async (req, res) => {
  console.log('🎯 CREATE: Create habit endpoint hit');
  try {
    const { name, description, frequency_type, target_count, difficulty_level, color, category } = req.body;
    const { query } = require('../config/database');

    console.log('🎯 CREATE: Creating habit:', { name, frequency_type, target_count });

    const result = await query(`
      INSERT INTO habits (
        user_id, name, description, color, frequency_type,
        target_count, difficulty_level, is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      RETURNING *
    `, [3, name, description, color || '#3B82F6', frequency_type || 'daily', target_count || 1, difficulty_level || 3, true]);

    const habit = result.rows[0];
    console.log('🎯 CREATE: Habit created with ID:', habit.id);

    res.status(201).json({
      success: true,
      message: 'Habit created successfully',
      habit: {
        id: habit.id,
        name: habit.name,
        description: habit.description,
        color: habit.color,
        frequency_type: habit.frequency_type,
        target_count: habit.target_count,
        difficulty_level: habit.difficulty_level,
        is_active: habit.is_active,
        created_at: habit.created_at,
        updated_at: habit.updated_at
      }
    });

  } catch (error) {
    console.error('🎯 CREATE: Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create habit',
      message: error.message
    });
  }
});

// OLD: Habit CRUD operations
// router.post('/', validateHabit, habitController.createHabit);
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