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

// Fix habit_logs table structure
router.post('/fix-logs-table', async (req, res) => {
  try {
    console.log('🔧 FIXING: habit_logs table structure...');
    const { query } = require('../config/database');

    // Check current table structure
    const tableCheck = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'habit_logs'
      ORDER BY ordinal_position
    `);

    console.log('📋 Current habit_logs structure:', tableCheck.rows);

    // Add missing columns if they don't exist
    const columns = tableCheck.rows.map(row => row.column_name);

    if (!columns.includes('completed_at')) {
      await query('ALTER TABLE habit_logs ADD COLUMN completed_at TIMESTAMP');
      console.log('✅ Added completed_at column');
    }

    if (!columns.includes('notes')) {
      await query('ALTER TABLE habit_logs ADD COLUMN notes TEXT');
      console.log('✅ Added notes column');
    }

    if (!columns.includes('completion_count')) {
      await query('ALTER TABLE habit_logs ADD COLUMN completion_count INTEGER DEFAULT 1');
      console.log('✅ Added completion_count column');
    }

    // Check final structure
    const finalCheck = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'habit_logs'
      ORDER BY ordinal_position
    `);

    res.json({
      success: true,
      message: 'habit_logs table structure fixed',
      before: tableCheck.rows,
      after: finalCheck.rows
    });

  } catch (error) {
    console.error('❌ Fix habit_logs table error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fix habit_logs table',
      message: error.message
    });
  }
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

    // Insert into habit_logs table (using existing schema)
    const result = await query(`
      INSERT INTO habit_logs (
        habit_id, user_id, date, status, completion_count, notes
      ) VALUES ($1, $2, $3, $4, $5, $6)
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