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

// Database testing endpoint
router.get('/db-test', async (req, res) => {
  try {
    console.log('🧪 DB-TEST: Starting comprehensive database test...');
    const { query } = require('../config/database');
    const results = [];

    // Test 1: Check habits table structure
    const habitsStructure = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'habits'
      ORDER BY ordinal_position
    `);
    results.push({
      test: 'Habits table structure',
      status: 'success',
      data: habitsStructure.rows
    });

    // Test 2: Check habit_logs table structure
    const logsStructure = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'habit_logs'
      ORDER BY ordinal_position
    `);
    results.push({
      test: 'Habit_logs table structure',
      status: 'success',
      data: logsStructure.rows
    });

    // Test 3: Count habits
    const habitsCount = await query('SELECT COUNT(*) as count FROM habits WHERE is_archived = false OR is_archived IS NULL');
    results.push({
      test: 'Active habits count',
      status: 'success',
      data: habitsCount.rows[0]
    });

    // Test 4: Count logs
    const logsCount = await query('SELECT COUNT(*) as count FROM habit_logs');
    results.push({
      test: 'Total logs count',
      status: 'success',
      data: logsCount.rows[0]
    });

    // Test 5: Check today's logs
    const today = new Date().toISOString().split('T')[0];
    const todayLogs = await query('SELECT COUNT(*) as count FROM habit_logs WHERE date = $1', [today]);
    results.push({
      test: 'Today logs count',
      status: 'success',
      data: { date: today, count: todayLogs.rows[0].count }
    });

    // Test 6: List all habits with details
    const allHabits = await query('SELECT id, name, is_archived, created_at FROM habits ORDER BY id');
    results.push({
      test: 'All habits list',
      status: 'success',
      data: allHabits.rows
    });

    // Test 7: List recent logs
    const recentLogs = await query(`
      SELECT hl.*, h.name as habit_name
      FROM habit_logs hl
      JOIN habits h ON hl.habit_id = h.id
      ORDER BY hl.created_at DESC
      LIMIT 10
    `);
    results.push({
      test: 'Recent logs (last 10)',
      status: 'success',
      data: recentLogs.rows
    });

    res.json({
      success: true,
      message: 'Database test completed',
      timestamp: new Date().toISOString(),
      results: results
    });

  } catch (error) {
    console.error('🧪 DB-TEST: ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Database test failed',
      message: error.message
    });
  }
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

// Get habits from database
router.get('/', async (req, res) => {
  console.log('✅ DB: Getting habits from database');

  try {
    const { query } = require('../config/database');
    const userId = 3; // Hardcoded user ID

    // Get habits from database (using is_archived instead of is_active)
    const result = await query(`
      SELECT * FROM habits
      WHERE user_id = $1 AND (is_archived = false OR is_archived IS NULL)
      ORDER BY created_at ASC
    `, [userId]);

    const habits = result.rows;
    console.log('✅ DB: Found', habits.length, 'habits in database');

    // If no habits exist, create them automatically
    if (habits.length === 0) {
      console.log('🔧 DB: No habits found, creating automatically...');

      const mockHabits = [
        { id: 1, name: 'Morning Exercise', description: 'Daily morning workout', color: '#10B981', frequency_type: 'daily', target_count: 1, difficulty_level: 3 },
        { id: 2, name: 'Read Books', description: 'Read for 30 minutes', color: '#3B82F6', frequency_type: 'daily', target_count: 1, difficulty_level: 2 },
        { id: 3, name: 'Drink Water', description: 'Stay hydrated throughout the day', color: '#F59E0B', frequency_type: 'daily', target_count: 8, difficulty_level: 1 }
      ];

      const createdHabits = [];

      for (const habit of mockHabits) {
        const result = await query(`
          INSERT INTO habits (id, user_id, name, description, color, frequency_type, target_count, difficulty_level, is_archived, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
          ON CONFLICT (id) DO NOTHING
          RETURNING *
        `, [habit.id, userId, habit.name, habit.description, habit.color, habit.frequency_type, habit.target_count, habit.difficulty_level, false]);

        if (result.rows.length > 0) {
          createdHabits.push(result.rows[0]);
          console.log('✅ Auto-created habit:', habit.name);
        }
      }

      // Return the created habits
      return res.json({
        success: true,
        habits: createdHabits.length > 0 ? createdHabits : mockHabits.map(h => ({ ...h, user_id: userId, is_archived: false, created_at: new Date(), updated_at: new Date() })),
        count: mockHabits.length,
        message: 'Auto-created habits in database'
      });
    }

    res.json({
      success: true,
      habits: habits,
      count: habits.length,
      message: 'Real database habits'
    });

  } catch (error) {
    console.error('❌ DB: Error getting habits from database:', error);
    res.status(500).json({
      success: false,
      error: 'Database error while fetching habits',
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

// RESET DATABASE - Clear all data and recreate fresh habits
router.post('/reset-database', async (req, res) => {
  try {
    console.log('🧹 RESET: Clearing all database data...');
    const { query } = require('../config/database');

    // Start transaction
    await query('BEGIN');

    try {
      // 1. Delete all habit logs
      const deletedLogs = await query('DELETE FROM habit_logs WHERE user_id = $1', [3]);
      console.log('🧹 RESET: Deleted', deletedLogs.rowCount, 'habit logs');

      // 2. Delete all habits
      const deletedHabits = await query('DELETE FROM habits WHERE user_id = $1', [3]);
      console.log('🧹 RESET: Deleted', deletedHabits.rowCount, 'habits');

      // 3. Create fresh habits
      const freshHabits = [
        {
          id: 1,
          name: 'Morning Exercise',
          description: 'Daily morning workout',
          color: '#10B981',
          frequency_type: 'daily',
          target_count: 1,
          difficulty_level: 3
        },
        {
          id: 2,
          name: 'Read Books',
          description: 'Read for 30 minutes',
          color: '#3B82F6',
          frequency_type: 'daily',
          target_count: 1,
          difficulty_level: 2
        },
        {
          id: 3,
          name: 'Drink Water',
          description: 'Stay hydrated throughout the day',
          color: '#F59E0B',
          frequency_type: 'daily',
          target_count: 8,
          difficulty_level: 1
        }
      ];

      const createdHabits = [];

      for (const habit of freshHabits) {
        const result = await query(`
          INSERT INTO habits (
            id, user_id, name, description, color, frequency_type,
            target_count, difficulty_level, is_archived, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
          RETURNING *
        `, [
          habit.id,
          3, // Hardcoded user ID
          habit.name,
          habit.description,
          habit.color,
          habit.frequency_type,
          habit.target_count,
          habit.difficulty_level,
          false
        ]);

        createdHabits.push(result.rows[0]);
        console.log('✅ RESET: Created fresh habit:', habit.name, 'with ID:', habit.id);
      }

      // Commit transaction
      await query('COMMIT');

      console.log('🧹 RESET: Database reset completed successfully');

      res.json({
        success: true,
        message: 'Database reset completed - all data cleared and fresh habits created',
        deleted: {
          logs: deletedLogs.rowCount,
          habits: deletedHabits.rowCount
        },
        created: {
          habits: createdHabits.length,
          habitsList: createdHabits
        }
      });

    } catch (transactionError) {
      await query('ROLLBACK');
      throw transactionError;
    }

  } catch (error) {
    console.error('❌ RESET: Error resetting database:', error);
    res.status(500).json({
      success: false,
      error: 'Database reset failed',
      message: error.message
    });
  }
});

// Create real habits in database to match mock data
router.post('/create-real-habits', async (req, res) => {
  try {
    console.log('🔧 CREATING: Real habits in database...');
    const { query } = require('../config/database');

    const mockHabits = [
      {
        id: 1,
        name: 'Morning Exercise',
        description: 'Daily morning workout',
        color: '#10B981',
        frequency_type: 'daily',
        target_count: 1,
        difficulty_level: 3
      },
      {
        id: 2,
        name: 'Read Books',
        description: 'Read for 30 minutes',
        color: '#3B82F6',
        frequency_type: 'daily',
        target_count: 1,
        difficulty_level: 2
      },
      {
        id: 3,
        name: 'Drink Water',
        description: 'Stay hydrated throughout the day',
        color: '#F59E0B',
        frequency_type: 'daily',
        target_count: 8,
        difficulty_level: 1
      }
    ];

    const results = [];

    for (const habit of mockHabits) {
      // Check if habit already exists
      const existingHabit = await query('SELECT id FROM habits WHERE id = $1', [habit.id]);

      if (existingHabit.rows.length === 0) {
        // Insert habit with specific ID
        const result = await query(`
          INSERT INTO habits (
            id, user_id, name, description, color, frequency_type,
            target_count, difficulty_level, is_archived, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
          RETURNING *
        `, [
          habit.id,
          3, // Hardcoded user ID
          habit.name,
          habit.description,
          habit.color,
          habit.frequency_type,
          habit.target_count,
          habit.difficulty_level,
          false
        ]);

        results.push(result.rows[0]);
        console.log('✅ Created habit:', habit.name, 'with ID:', habit.id);
      } else {
        console.log('ℹ️ Habit already exists:', habit.name, 'with ID:', habit.id);
        results.push({ id: habit.id, name: habit.name, status: 'already_exists' });
      }
    }

    res.json({
      success: true,
      message: 'Real habits created in database',
      habits: results,
      count: results.length
    });

  } catch (error) {
    console.error('❌ Create real habits error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create real habits',
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

    // UPSERT into habit_logs table (INSERT or UPDATE if exists)
    const result = await query(`
      INSERT INTO habit_logs (
        habit_id, user_id, date, status, completion_count, notes
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (habit_id, date)
      DO UPDATE SET
        status = EXCLUDED.status,
        completion_count = EXCLUDED.completion_count,
        notes = EXCLUDED.notes,
        created_at = CURRENT_TIMESTAMP
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

// Create new habit endpoint - POST /habits (without ID)
router.post('/', async (req, res) => {
  console.log('✅ DB: Create new habit endpoint hit');
  const { name, description, color, frequency_type, target_count, difficulty_level, category } = req.body;

  try {
    console.log('✅ DB: Creating new habit:', { name, frequency_type, target_count });
    const { query } = require('../config/database');

    // Insert new habit (let database generate ID)
    const result = await query(`
      INSERT INTO habits (
        user_id, name, description, color, frequency_type,
        target_count, difficulty_level, is_archived, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      RETURNING *
    `, [
      3, // Hardcoded user ID
      name,
      description || '',
      color || '#3B82F6',
      frequency_type || 'daily',
      target_count || 1,
      difficulty_level || 3,
      false
    ]);

    const newHabit = result.rows[0];
    console.log('✅ DB: New habit created with ID:', newHabit.id);

    res.status(201).json({
      success: true,
      message: 'Habit created successfully',
      habit: newHabit
    });

  } catch (error) {
    console.error('❌ DB: Error creating new habit:', error);
    res.status(500).json({
      success: false,
      error: 'Database error while creating habit',
      message: error.message
    });
  }
});

// Delete habit endpoint - DELETE /habits/:habitId
router.delete('/:habitId', async (req, res) => {
  console.log('✅ DB: Delete habit endpoint hit');
  const { habitId } = req.params;

  try {
    console.log('✅ DB: Deleting habit and today\'s logs:', habitId);
    const { query } = require('../config/database');
    const today = new Date().toISOString().split('T')[0];

    // Start transaction
    await query('BEGIN');

    try {
      // 1. Delete today's logs for this habit to fix statistics
      const deleteLogsResult = await query(`
        DELETE FROM habit_logs
        WHERE habit_id = $1 AND user_id = $2 AND date = $3
        RETURNING *
      `, [parseInt(habitId), 3, today]);

      console.log('✅ DB: Deleted', deleteLogsResult.rows.length, 'log entries for today');

      // 2. Soft delete habit - set is_archived = true
      const result = await query(`
        UPDATE habits
        SET is_archived = true, updated_at = NOW()
        WHERE id = $1 AND user_id = $2
        RETURNING *
      `, [parseInt(habitId), 3]); // Hardcoded user ID

      if (result.rows.length === 0) {
        await query('ROLLBACK');
        return res.status(404).json({
          success: false,
          error: 'Habit not found',
          message: 'Habit not found or already deleted'
        });
      }

      // Commit transaction
      await query('COMMIT');

      console.log('✅ DB: Habit archived successfully:', result.rows[0].name);
      console.log('✅ DB: Today\'s logs cleared to fix statistics');

      res.json({
        success: true,
        message: 'Habit deleted successfully (including today\'s progress)',
        habit: result.rows[0],
        deletedLogs: deleteLogsResult.rows.length
      });

    } catch (transactionError) {
      await query('ROLLBACK');
      throw transactionError;
    }

  } catch (error) {
    console.error('❌ DB: Error deleting habit:', error);
    res.status(500).json({
      success: false,
      error: 'Database error while deleting habit',
      message: error.message
    });
  }
});

// Undo habit completion endpoint - DELETE /habits/:habitId/log
router.delete('/:habitId/log', async (req, res) => {
  console.log('🔄 UNDO: Undo habit completion endpoint hit');
  const { habitId } = req.params;

  try {
    const today = new Date().toISOString().split('T')[0];
    console.log('🔄 UNDO: Removing log for habit', habitId, 'on date', today);

    const { query } = require('../config/database');

    // Delete today's log for this habit
    const result = await query(`
      DELETE FROM habit_logs
      WHERE habit_id = $1 AND user_id = $2 AND date = $3
      RETURNING *
    `, [parseInt(habitId), 3, today]); // Hardcoded user ID

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Log not found',
        message: 'No log found for this habit today'
      });
    }

    const deletedLog = result.rows[0];
    console.log('🔄 UNDO: Log deleted successfully:', deletedLog.id);

    res.json({
      success: true,
      message: 'Habit completion undone successfully',
      deletedLog: {
        id: deletedLog.id,
        habit_id: deletedLog.habit_id,
        date: deletedLog.date,
        status: deletedLog.status
      }
    });

  } catch (error) {
    console.error('❌ UNDO: Error undoing habit:', error);
    res.status(500).json({
      success: false,
      error: 'Database error while undoing habit',
      message: error.message
    });
  }
});

// Edit/Update habit endpoint - PUT /habits/:habitId
router.put('/:habitId', async (req, res) => {
  console.log('✅ DB: Update habit endpoint hit');
  const { habitId } = req.params;
  const { name, description, color, frequency_type, target_count, difficulty_level } = req.body;

  try {
    console.log('✅ DB: Updating habit:', habitId, 'with data:', req.body);
    const { query } = require('../config/database');

    // Update habit
    const result = await query(`
      UPDATE habits
      SET name = $1, description = $2, color = $3, frequency_type = $4,
          target_count = $5, difficulty_level = $6, updated_at = NOW()
      WHERE id = $7 AND user_id = $8
      RETURNING *
    `, [name, description, color, frequency_type, target_count, difficulty_level, parseInt(habitId), 3]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Habit not found',
        message: 'Habit not found or access denied'
      });
    }

    console.log('✅ DB: Habit updated successfully:', result.rows[0].name);

    res.json({
      success: true,
      message: 'Habit updated successfully',
      habit: result.rows[0]
    });

  } catch (error) {
    console.error('❌ DB: Error updating habit:', error);
    res.status(500).json({
      success: false,
      error: 'Database error while updating habit',
      message: error.message
    });
  }
});

module.exports = router;