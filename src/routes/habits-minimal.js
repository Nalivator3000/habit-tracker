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

// Today's habits endpoint for frontend compatibility
router.get('/logs/today', (req, res) => {
  console.log('✅ MINIMAL: Today\'s habits endpoint hit');

  try {
    // Return mock today's logs - some completed, some pending
    const mockTodayLogs = [
      {
        id: 1,
        habit_id: 1,
        habit_name: 'Morning Exercise',
        status: 'completed',
        date: new Date().toISOString().split('T')[0],
        completed_at: new Date().toISOString(),
        notes: 'Great workout today!'
      },
      {
        id: 2,
        habit_id: 3,
        habit_name: 'Drink Water',
        status: 'partial',
        date: new Date().toISOString().split('T')[0],
        completed_count: 5,
        target_count: 8,
        completed_at: new Date().toISOString()
      }
    ];

    res.json({
      success: true,
      logs: mockTodayLogs,
      count: mockTodayLogs.length,
      date: new Date().toISOString().split('T')[0],
      message: 'Mock today logs - zero dependencies'
    });

  } catch (error) {
    console.error('❌ MINIMAL: Error in today logs endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Today logs endpoint failed',
      message: error.message
    });
  }
});

// Habit logging endpoint - POST /habits/:habitId/log
router.post('/:habitId/log', (req, res) => {
  console.log('✅ MINIMAL: Habit logging endpoint hit');
  const { habitId } = req.params;
  const { date, status, completion_count, notes } = req.body;

  try {
    console.log('✅ MINIMAL: Logging habit:', { habitId, date, status, completion_count, notes });

    // Return mock successful log response
    const mockLog = {
      id: Math.floor(Math.random() * 1000),
      habit_id: parseInt(habitId),
      habit_name: `Habit ${habitId}`,
      date: date || new Date().toISOString().split('T')[0],
      status: status || 'completed',
      completion_count: completion_count || 1,
      notes: notes || '',
      completed_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    };

    res.status(201).json({
      success: true,
      message: 'Habit logged successfully',
      log: mockLog
    });

  } catch (error) {
    console.error('❌ MINIMAL: Error in habit logging:', error);
    res.status(500).json({
      success: false,
      error: 'Habit logging failed',
      message: error.message
    });
  }
});

module.exports = router;