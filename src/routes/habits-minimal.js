const express = require('express');
const router = express.Router();

// Minimal test endpoint
router.get('/test', (req, res) => {
  console.log('✅ MINIMAL: Test endpoint hit');
  res.json({
    success: true,
    message: 'Minimal test endpoint works!',
    timestamp: new Date().toISOString()
  });
});

// Debug endpoint to check what frontend requests
router.get('/debug', (req, res) => {
  console.log('🔍 DEBUG: Headers:', req.headers);
  console.log('🔍 DEBUG: Query:', req.query);
  console.log('🔍 DEBUG: User agent:', req.get('User-Agent'));

  res.json({
    success: true,
    message: 'Debug endpoint',
    headers: req.headers,
    query: req.query,
    timestamp: new Date().toISOString()
  });
});

// Minimal mock data endpoint
router.get('/', (req, res) => {
  console.log('✅ MINIMAL: Returning hardcoded mock data');

  try {
    const mockHabits = [
      {
        id: 1,
        name: 'Morning Exercise',
        description: 'Daily morning workout',
        color: '#10B981',
        frequency_type: 'daily',
        target_count: 1,
        difficulty_level: 3,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 2,
        name: 'Read Books',
        description: 'Read for 30 minutes',
        color: '#3B82F6',
        frequency_type: 'daily',
        target_count: 1,
        difficulty_level: 2,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 3,
        name: 'Drink Water',
        description: 'Stay hydrated throughout the day',
        color: '#F59E0B',
        frequency_type: 'daily',
        target_count: 8,
        difficulty_level: 1,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    res.json({
      success: true,
      habits: mockHabits,
      count: mockHabits.length,
      message: 'Mock data - zero dependencies'
    });

  } catch (error) {
    console.error('❌ MINIMAL: Error in mock endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Minimal endpoint failed',
      message: error.message
    });
  }
});

// Today's habits endpoint - now reading from database
router.get('/logs/today', async (req, res) => {
  console.log('✅ DB: Today\'s habits endpoint hit');

  try {
    const { query } = require('../config/database');
    const today = new Date().toISOString().split('T')[0];
    const userId = 3; // Hardcoded user ID for demo

    console.log('✅ DB: Fetching logs for date:', today, 'user:', userId);

    // Get today's logs from database
    const result = await query(`
      SELECT
        hl.*,
        h.name as habit_name,
        h.target_count
      FROM habit_logs hl
      JOIN habits h ON hl.habit_id = h.id
      WHERE hl.user_id = $1 AND hl.date = $2
      ORDER BY hl.created_at DESC
    `, [userId, today]);

    const todayLogs = result.rows;
    console.log('✅ DB: Found', todayLogs.length, 'logs for today');

    res.json({
      success: true,
      logs: todayLogs,
      count: todayLogs.length,
      date: today,
      message: 'Real database logs'
    });

  } catch (error) {
    console.error('❌ DB: Error in today logs endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Database error while fetching today logs',
      message: error.message
    });
  }
});

// Habit logging endpoint - POST /habits/:habitId/log
router.post('/:habitId/log', async (req, res) => {
  console.log('✅ DB: Habit logging endpoint hit');
  const { habitId } = req.params;
  const { date, status, completion_count, notes } = req.body;

  try {
    console.log('✅ DB: Logging habit to database:', { habitId, date, status, completion_count, notes });

    const { query } = require('../config/database');

    // Insert into habit_logs table
    const result = await query(`
      INSERT INTO habit_logs (
        habit_id, user_id, date, status, completion_count, notes,
        completed_at, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW(), NOW())
      RETURNING *
    `, [
      parseInt(habitId),
      3, // Hardcoded user ID for demo
      date || new Date().toISOString().split('T')[0],
      status || 'completed',
      completion_count || 1,
      notes || ''
    ]);

    const savedLog = result.rows[0];
    console.log('✅ DB: Habit logged successfully:', savedLog.id);

    res.status(201).json({
      success: true,
      message: 'Habit logged successfully to database',
      log: {
        id: savedLog.id,
        habit_id: savedLog.habit_id,
        date: savedLog.date,
        status: savedLog.status,
        completion_count: savedLog.completion_count,
        notes: savedLog.notes,
        completed_at: savedLog.completed_at,
        created_at: savedLog.created_at
      }
    });

  } catch (error) {
    console.error('❌ DB: Error in habit logging:', error);
    res.status(500).json({
      success: false,
      error: 'Database error while logging habit',
      message: error.message
    });
  }
});

module.exports = router;