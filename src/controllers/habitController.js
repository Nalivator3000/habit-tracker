const Habit = require('../models/Habit');

// Create a new habit
const createHabit = async (req, res) => {
  try {
    const userId = req.user.id;
    const habitData = req.body;

    console.log('🎯 Creating habit for user:', userId);
    console.log('🎯 Habit data received:', habitData);

    // Create habit
    const habit = await Habit.create(habitData, userId);

    console.log('✅ Habit created successfully:', habit.id);

    res.status(201).json({
      success: true,
      message: 'Habit created successfully',
      habit: habit.toJSON(),
    });
  } catch (error) {
    console.error('❌ Create habit error:', error);
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    res.status(500).json({
      success: false,
      error: 'Failed to create habit',
      message: 'An error occurred while creating the habit',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get all user habits
const getHabits = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      is_active = 'true',
      category_id,
      limit,
      offset = '0',
      order_by = 'created_at',
      order_direction = 'DESC',
    } = req.query;

    const options = {
      is_active: is_active === 'true' ? true : is_active === 'false' ? false : null,
      category_id: category_id || null,
      limit: limit ? parseInt(limit) : null,
      offset: parseInt(offset),
      order_by,
      order_direction,
    };

    const habits = await Habit.findByUserId(userId, options);

    res.json({
      success: true,
      habits: habits.map(habit => habit.toJSON()),
      count: habits.length,
      ...(limit && { has_more: habits.length === parseInt(limit) }),
    });
  } catch (error) {
    console.error('Get habits error:', error);
    res.status(500).json({
      error: 'Failed to get habits',
      message: 'An error occurred while fetching habits',
    });
  }
};

// Get a specific habit
const getHabit = async (req, res) => {
  try {
    const userId = req.user.id;
    const habitId = req.params.id;
    const { include_logs = 'false' } = req.query;

    const habit = await Habit.findById(habitId, userId);
    if (!habit) {
      return res.status(404).json({
        error: 'Habit not found',
        message: 'The requested habit was not found or you do not have access to it',
      });
    }

    let habitData;
    if (include_logs === 'true') {
      habitData = await habit.getWithRecentLogs();
    } else {
      habitData = habit.toJSON();
    }

    res.json({
      habit: habitData,
    });
  } catch (error) {
    console.error('Get habit error:', error);
    res.status(500).json({
      error: 'Failed to get habit',
      message: 'An error occurred while fetching the habit',
    });
  }
};

// Update a habit
const updateHabit = async (req, res) => {
  try {
    const userId = req.user.id;
    const habitId = req.params.id;
    const updateData = req.body;

    const habit = await Habit.findById(habitId, userId);
    if (!habit) {
      return res.status(404).json({
        error: 'Habit not found',
        message: 'The requested habit was not found or you do not have access to it',
      });
    }

    // Update habit
    await habit.update(updateData);

    res.json({
      message: 'Habit updated successfully',
      habit: habit.toJSON(),
    });
  } catch (error) {
    console.error('Update habit error:', error);
    res.status(500).json({
      error: 'Failed to update habit',
      message: 'An error occurred while updating the habit',
    });
  }
};

// Delete a habit (archive)
const deleteHabit = async (req, res) => {
  try {
    const userId = req.user.id;
    const habitId = req.params.id;
    const { permanent = 'false' } = req.query;

    const habit = await Habit.findById(habitId, userId);
    if (!habit) {
      return res.status(404).json({
        error: 'Habit not found',
        message: 'The requested habit was not found or you do not have access to it',
      });
    }

    if (permanent === 'true') {
      // Hard delete (permanent)
      await habit.delete();
      res.json({
        message: 'Habit permanently deleted',
      });
    } else {
      // Soft delete (archive)
      await habit.archive();
      res.json({
        message: 'Habit archived successfully',
        habit: habit.toJSON(),
      });
    }
  } catch (error) {
    console.error('Delete habit error:', error);
    res.status(500).json({
      error: 'Failed to delete habit',
      message: 'An error occurred while deleting the habit',
    });
  }
};

// Get habit statistics
const getHabitStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const habitId = req.params.id;
    const { start_date, end_date } = req.query;

    const habit = await Habit.findById(habitId, userId);
    if (!habit) {
      return res.status(404).json({
        error: 'Habit not found',
        message: 'The requested habit was not found or you do not have access to it',
      });
    }

    const dateRange = {};
    if (start_date) dateRange.start_date = start_date;
    if (end_date) dateRange.end_date = end_date;

    const stats = await habit.getStats(dateRange);

    res.json({
      habit_id: habitId,
      stats,
      date_range: dateRange,
    });
  } catch (error) {
    console.error('Get habit stats error:', error);
    res.status(500).json({
      error: 'Failed to get habit statistics',
      message: 'An error occurred while fetching habit statistics',
    });
  }
};

// Get user's habit overview
const getHabitOverview = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get active habits
    const activeHabits = await Habit.findByUserId(userId, { is_active: true });

    // Calculate overview stats
    const totalActive = activeHabits.length;
    const totalStreaks = activeHabits.reduce((sum, habit) => sum + (habit.streak_count || 0), 0);
    const maxStreak = Math.max(...activeHabits.map(habit => habit.best_streak || 0), 0);
    const totalCompletions = activeHabits.reduce((sum, habit) => sum + (habit.total_completions || 0), 0);

    // Get habits due today
    const habitsToday = activeHabits.filter(habit => habit.isDueToday(req.user.timezone || 'UTC'));

    res.json({
      overview: {
        total_active_habits: totalActive,
        total_current_streaks: totalStreaks,
        best_streak: maxStreak,
        total_completions: totalCompletions,
        habits_due_today: habitsToday.length,
      },
      habits_due_today: habitsToday.map(habit => habit.toJSON()),
      recent_habits: activeHabits.slice(0, 5).map(habit => habit.toJSON()),
    });
  } catch (error) {
    console.error('Get habit overview error:', error);
    res.status(500).json({
      error: 'Failed to get habit overview',
      message: 'An error occurred while fetching habit overview',
    });
  }
};

// Restore archived habit
const restoreHabit = async (req, res) => {
  try {
    const userId = req.user.id;
    const habitId = req.params.id;

    const habit = await Habit.findById(habitId, userId);
    if (!habit) {
      return res.status(404).json({
        error: 'Habit not found',
        message: 'The requested habit was not found or you do not have access to it',
      });
    }

    await habit.update({ is_active: true, archived_at: null });

    res.json({
      message: 'Habit restored successfully',
      habit: habit.toJSON(),
    });
  } catch (error) {
    console.error('Restore habit error:', error);
    res.status(500).json({
      error: 'Failed to restore habit',
      message: 'An error occurred while restoring the habit',
    });
  }
};

module.exports = {
  createHabit,
  getHabits,
  getHabit,
  updateHabit,
  deleteHabit,
  getHabitStats,
  getHabitOverview,
  restoreHabit,
};