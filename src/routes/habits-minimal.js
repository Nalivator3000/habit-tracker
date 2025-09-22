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

module.exports = router;