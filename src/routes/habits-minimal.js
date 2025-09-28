const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

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

// Update database schema for frequency system
router.post('/update-frequency-schema', async (req, res) => {
  try {
    console.log('🔧 SCHEMA: Updating database schema for frequency system...');
    const { query } = require('../config/database');

    // Start transaction
    await query('BEGIN');

    try {
      // Check current table structure
      const tableCheck = await query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'habits'
        ORDER BY ordinal_position
      `);

      console.log('📋 Current habits structure:', tableCheck.rows);

      // Add new columns if they don't exist
      const columns = tableCheck.rows.map(row => row.column_name);

      if (!columns.includes('frequency_value')) {
        await query('ALTER TABLE habits ADD COLUMN frequency_value INTEGER DEFAULT 1');
        console.log('✅ Added frequency_value column');
      }

      if (!columns.includes('schedule_dates')) {
        await query('ALTER TABLE habits ADD COLUMN schedule_dates JSONB DEFAULT \'[]\'');
        console.log('✅ Added schedule_dates column');
      }

      if (!columns.includes('next_due_date')) {
        await query('ALTER TABLE habits ADD COLUMN next_due_date DATE');
        console.log('✅ Added next_due_date column');
      }

      if (!columns.includes('last_reset_date')) {
        await query('ALTER TABLE habits ADD COLUMN last_reset_date DATE DEFAULT CURRENT_DATE');
        console.log('✅ Added last_reset_date column');
      }

      // Update existing habits to have proper frequency values
      await query(`
        UPDATE habits
        SET
          frequency_value = CASE
            WHEN frequency_type = 'daily' THEN COALESCE(target_count, 1)
            WHEN frequency_type = 'weekly' THEN 1
            WHEN frequency_type = 'monthly' THEN 1
            ELSE 1
          END,
          last_reset_date = CURRENT_DATE
        WHERE frequency_value IS NULL
      `);
      console.log('✅ Updated existing habits with frequency values');

      // Check final structure
      const finalCheck = await query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'habits'
        ORDER BY ordinal_position
      `);

      // Commit transaction
      await query('COMMIT');

      res.json({
        success: true,
        message: 'Frequency system schema updated successfully',
        before: tableCheck.rows,
        after: finalCheck.rows,
        newColumns: ['frequency_value', 'schedule_dates', 'next_due_date', 'last_reset_date']
      });

    } catch (transactionError) {
      await query('ROLLBACK');
      throw transactionError;
    }

  } catch (error) {
    console.error('❌ Schema update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update frequency system schema',
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
router.get('/', authenticateToken, async (req, res) => {
  console.log('✅ DB: Getting habits from database for user:', req.user.id);

  try {
    const { query } = require('../config/database');
    const userId = req.user.id; // Get user ID from authenticated token

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

// Monthly logs endpoint - get logs for a specific month
router.get('/logs/month/:year/:month', authenticateToken, async (req, res) => {
  console.log('📅 Monthly logs endpoint hit for user:', req.user.id);
  const { year, month } = req.params;

  try {
    const { query } = require('../config/database');
    const userId = req.user.id;

    // Validate year and month
    const yearInt = parseInt(year);
    const monthInt = parseInt(month);

    if (isNaN(yearInt) || isNaN(monthInt) || monthInt < 1 || monthInt > 12) {
      return res.status(400).json({
        success: false,
        error: 'Invalid year or month parameters'
      });
    }

    // Calculate date range for the month
    const startDate = new Date(yearInt, monthInt - 1, 1).toISOString().split('T')[0];
    const endDate = new Date(yearInt, monthInt, 0).toISOString().split('T')[0];

    console.log('📅 Fetching logs for date range:', startDate, 'to', endDate, 'user:', userId);

    // Get logs for the entire month
    const result = await query(`
      SELECT hl.*, h.name as habit_name, h.color as habit_color, h.target_count
      FROM habit_logs hl
      JOIN habits h ON hl.habit_id = h.id
      WHERE hl.user_id = $1
        AND hl.date >= $2
        AND hl.date <= $3
        AND h.is_archived = false
      ORDER BY hl.date ASC, h.name ASC
    `, [userId, startDate, endDate]);

    console.log('📅 Found', result.rows.length, 'log entries for the month');

    res.json({
      success: true,
      logs: result.rows,
      count: result.rows.length,
      period: {
        year: yearInt,
        month: monthInt,
        startDate,
        endDate
      },
      message: 'Monthly habit logs'
    });

  } catch (error) {
    console.error('📅 Error fetching monthly logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch monthly logs',
      message: error.message
    });
  }
});

// Today's habits endpoint - now reading from database
router.get('/logs/today', authenticateToken, async (req, res) => {
  console.log('✅ DB: Today\'s habits endpoint hit for user:', req.user.id);

  try {
    const { query } = require('../config/database');
    const today = new Date().toISOString().split('T')[0];
    const userId = req.user.id; // Get user ID from authenticated token

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
          req.user.id, // User ID from token
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
          req.user.id, // User ID from token
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
router.post('/:habitId/log', authenticateToken, async (req, res) => {
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
      req.user.id, // User ID from token
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
router.post('/', authenticateToken, async (req, res) => {
  console.log('✅ DB: Create new habit endpoint hit for user:', req.user.id);
  const {
    name, description, color, frequency_type, target_count, difficulty_level,
    category, frequency_value, schedule_dates
  } = req.body;

  try {
    // Validate required fields
    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Habit name is required'
      });
    }

    console.log('✅ DB: Creating new habit:', { name, frequency_type, target_count, frequency_value, schedule_dates });
    const { query } = require('../config/database');

    // Calculate next due date based on frequency type
    let nextDueDate = null;
    const today = new Date().toISOString().split('T')[0];

    switch (frequency_type) {
      case 'daily':
        nextDueDate = today;
        break;
      case 'weekly':
        nextDueDate = today;
        break;
      case 'every_n_days':
        nextDueDate = today;
        break;
      case 'monthly':
        const monthlyDay = parseInt(frequency_value) || 1;
        const currentDate = new Date();
        const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), monthlyDay);
        if (targetDate < currentDate) {
          targetDate.setMonth(targetDate.getMonth() + 1);
        }
        nextDueDate = targetDate.toISOString().split('T')[0];
        break;
      case 'schedule':
      case 'yearly':
        if (schedule_dates && schedule_dates.length > 0) {
          nextDueDate = schedule_dates[0];
        }
        break;
      default:
        nextDueDate = today;
    }

    // Insert new habit with frequency data
    const result = await query(`
      INSERT INTO habits (
        user_id, name, description, color, frequency_type, target_count,
        difficulty_level, frequency_value, schedule_dates, next_due_date,
        last_reset_date, is_archived, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
      RETURNING *
    `, [
      req.user.id, // User ID from token
      name.trim(),
      description || '',
      color || '#3B82F6',
      frequency_type || 'daily',
      parseInt(target_count) || 1,
      parseInt(difficulty_level) || 3,
      parseInt(frequency_value) || 1,
      JSON.stringify(schedule_dates || []),
      nextDueDate,
      today,
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

    // Check if it's a validation error
    if (error.message.includes('not-null constraint') || error.message.includes('violates')) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Missing required fields for habit creation'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Database error while creating habit',
        message: error.message
      });
    }
  }
});

// Delete habit endpoint - DELETE /habits/:habitId
router.delete('/:habitId', authenticateToken, async (req, res) => {
  console.log('✅ DB: Delete habit endpoint hit');
  const { habitId } = req.params;

  try {
    console.log('✅ DB: Deleting habit:', habitId, 'for user:', req.user.id);
    const { query } = require('../config/database');
    const today = new Date().toISOString().split('T')[0];

    // Start transaction
    await query('BEGIN');

    try {
      // First check if habit exists for this user
      const checkResult = await query(`
        SELECT id, name, user_id, is_archived
        FROM habits
        WHERE id = $1
      `, [parseInt(habitId)]);

      console.log('✅ DB: Habit check result:', checkResult.rows);

      if (checkResult.rows.length === 0) {
        await query('ROLLBACK');
        return res.status(404).json({
          success: false,
          error: 'Habit not found',
          message: 'Habit does not exist'
        });
      }

      const habit = checkResult.rows[0];
      if (habit.user_id !== req.user.id) {
        await query('ROLLBACK');
        return res.status(404).json({
          success: false,
          error: 'Habit not found',
          message: 'Habit does not belong to current user'
        });
      }

      if (habit.is_archived) {
        await query('ROLLBACK');
        return res.status(404).json({
          success: false,
          error: 'Habit already deleted',
          message: 'Habit is already archived'
        });
      }

      // 2. Delete today's logs for this habit to fix statistics
      const deleteLogsResult = await query(`
        DELETE FROM habit_logs
        WHERE habit_id = $1 AND user_id = $2 AND date = $3
        RETURNING *
      `, [parseInt(habitId), req.user.id, today]);

      console.log('✅ DB: Deleted', deleteLogsResult.rows.length, 'log entries for today');

      // 3. Soft delete habit - set is_archived = true
      const result = await query(`
        UPDATE habits
        SET is_archived = true, updated_at = NOW()
        WHERE id = $1 AND user_id = $2
        RETURNING *
      `, [parseInt(habitId), req.user.id]); // User ID from token

      console.log('✅ DB: Update result:', result.rows);

      if (result.rows.length === 0) {
        await query('ROLLBACK');
        return res.status(500).json({
          success: false,
          error: 'Update failed',
          message: 'Failed to archive habit'
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
router.delete('/:habitId/log', authenticateToken, async (req, res) => {
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
    `, [parseInt(habitId), req.user.id, today]);

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
router.put('/:habitId', authenticateToken, async (req, res) => {
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
    `, [name, description, color, frequency_type, target_count, difficulty_level, parseInt(habitId), req.user.id]);

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