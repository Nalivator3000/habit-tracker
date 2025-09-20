const Habit = require('../models/Habit');
const HabitLog = require('../models/HabitLog');

// Log habit completion
const logHabitCompletion = async (req, res) => {
  try {
    const userId = req.user.id;
    const habitId = req.params.habitId;
    const logData = req.body;

    // Verify habit exists and belongs to user
    const habit = await Habit.findById(habitId, userId);
    if (!habit) {
      return res.status(404).json({
        error: 'Habit not found',
        message: 'The requested habit was not found or you do not have access to it',
      });
    }

    // Set default date to today if not provided
    if (!logData.date) {
      logData.date = new Date().toISOString().split('T')[0];
    }

    // Create or update log
    const log = await HabitLog.create(logData, habitId, userId);

    // Update habit streak and completion count if completed
    if (logData.status === 'completed' || logData.status === 'partial') {
      // Calculate new streak
      const newStreak = await HabitLog.calculateStreak(habitId, userId);
      await habit.updateStreak(newStreak);

      // Increment total completions if this is a new completion
      const existingLog = await HabitLog.getTodayLog(habitId, userId, req.user.timezone);
      if (!existingLog || existingLog.status !== 'completed') {
        await habit.incrementCompletions();
      }
    }

    res.status(201).json({
      message: 'Habit completion logged successfully',
      log: log.toJSON(),
      habit: {
        id: habit.id,
        streak_count: habit.streak_count,
        best_streak: habit.best_streak,
        total_completions: habit.total_completions,
      },
    });
  } catch (error) {
    console.error('Log habit completion error:', error);
    res.status(500).json({
      error: 'Failed to log habit completion',
      message: 'An error occurred while logging habit completion',
    });
  }
};

// Get habit logs
const getHabitLogs = async (req, res) => {
  try {
    const userId = req.user.id;
    const habitId = req.params.habitId;
    const {
      start_date,
      end_date,
      status,
      limit,
      offset = '0',
      order_by = 'date',
      order_direction = 'DESC',
    } = req.query;

    // Verify habit exists and belongs to user
    const habit = await Habit.findById(habitId, userId);
    if (!habit) {
      return res.status(404).json({
        error: 'Habit not found',
        message: 'The requested habit was not found or you do not have access to it',
      });
    }

    const options = {
      start_date,
      end_date,
      status,
      limit: limit ? parseInt(limit) : null,
      offset: parseInt(offset),
      order_by,
      order_direction,
    };

    const logs = await HabitLog.findByHabitId(habitId, userId, options);

    res.json({
      habit_id: habitId,
      logs: logs.map(log => log.toJSON()),
      count: logs.length,
      ...(limit && { has_more: logs.length === parseInt(limit) }),
    });
  } catch (error) {
    console.error('Get habit logs error:', error);
    res.status(500).json({
      error: 'Failed to get habit logs',
      message: 'An error occurred while fetching habit logs',
    });
  }
};

// Get specific habit log
const getHabitLog = async (req, res) => {
  try {
    const userId = req.user.id;
    const logId = req.params.logId;

    const log = await HabitLog.findById(logId, userId);
    if (!log) {
      return res.status(404).json({
        error: 'Log not found',
        message: 'The requested log was not found or you do not have access to it',
      });
    }

    res.json({
      log: log.toJSON(),
    });
  } catch (error) {
    console.error('Get habit log error:', error);
    res.status(500).json({
      error: 'Failed to get habit log',
      message: 'An error occurred while fetching the habit log',
    });
  }
};

// Update habit log
const updateHabitLog = async (req, res) => {
  try {
    const userId = req.user.id;
    const logId = req.params.logId;
    const updateData = req.body;

    const log = await HabitLog.findById(logId, userId);
    if (!log) {
      return res.status(404).json({
        error: 'Log not found',
        message: 'The requested log was not found or you do not have access to it',
      });
    }

    // Update log
    await log.update(updateData);

    // Recalculate habit streak if status changed
    if (updateData.status) {
      const habit = await Habit.findById(log.habit_id, userId);
      if (habit) {
        const newStreak = await HabitLog.calculateStreak(log.habit_id, userId);
        await habit.updateStreak(newStreak);
      }
    }

    res.json({
      message: 'Habit log updated successfully',
      log: log.toJSON(),
    });
  } catch (error) {
    console.error('Update habit log error:', error);
    res.status(500).json({
      error: 'Failed to update habit log',
      message: 'An error occurred while updating the habit log',
    });
  }
};

// Delete habit log
const deleteHabitLog = async (req, res) => {
  try {
    const userId = req.user.id;
    const logId = req.params.logId;

    const log = await HabitLog.findById(logId, userId);
    if (!log) {
      return res.status(404).json({
        error: 'Log not found',
        message: 'The requested log was not found or you do not have access to it',
      });
    }

    const habitId = log.habit_id;

    // Delete log
    await log.delete();

    // Recalculate habit streak
    const habit = await Habit.findById(habitId, userId);
    if (habit) {
      const newStreak = await HabitLog.calculateStreak(habitId, userId);
      await habit.updateStreak(newStreak);
    }

    res.json({
      message: 'Habit log deleted successfully',
    });
  } catch (error) {
    console.error('Delete habit log error:', error);
    res.status(500).json({
      error: 'Failed to delete habit log',
      message: 'An error occurred while deleting the habit log',
    });
  }
};

// Get all user logs (across all habits)
const getAllUserLogs = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      start_date,
      end_date,
      status,
      habit_ids,
      limit,
      offset = '0',
      order_by = 'date',
      order_direction = 'DESC',
    } = req.query;

    const options = {
      start_date,
      end_date,
      status,
      habit_ids: habit_ids ? habit_ids.split(',') : null,
      limit: limit ? parseInt(limit) : null,
      offset: parseInt(offset),
      order_by,
      order_direction,
    };

    const logs = await HabitLog.findByUserId(userId, options);

    res.json({
      logs: logs.map(log => log.toJSON()),
      count: logs.length,
      ...(limit && { has_more: logs.length === parseInt(limit) }),
    });
  } catch (error) {
    console.error('Get all user logs error:', error);
    res.status(500).json({
      error: 'Failed to get logs',
      message: 'An error occurred while fetching logs',
    });
  }
};

// Get today's logs for all habits
const getTodayLogs = async (req, res) => {
  try {
    const userId = req.user.id;
    const timezone = req.user.timezone || 'UTC';
    const today = new Date().toLocaleDateString('en-CA', { timeZone: timezone });

    const logs = await HabitLog.findByUserId(userId, {
      start_date: today,
      end_date: today,
    });

    // Get active habits to check which ones haven't been logged today
    const activeHabits = await Habit.findByUserId(userId, { is_active: true });
    const loggedHabitIds = logs.map(log => log.habit_id);
    const unloggedHabits = activeHabits.filter(habit => !loggedHabitIds.includes(habit.id));

    res.json({
      date: today,
      logged_habits: logs.map(log => log.toJSON()),
      unlogged_habits: unloggedHabits.map(habit => habit.toJSON()),
      total_habits: activeHabits.length,
      logged_count: logs.length,
      completion_rate: activeHabits.length > 0 ? (logs.length / activeHabits.length) * 100 : 0,
    });
  } catch (error) {
    console.error('Get today logs error:', error);
    res.status(500).json({
      error: 'Failed to get today\'s logs',
      message: 'An error occurred while fetching today\'s logs',
    });
  }
};

// Get weekly summary
const getWeeklySummary = async (req, res) => {
  try {
    const userId = req.user.id;
    const { start_date, end_date } = req.query;

    // Default to current week if no dates provided
    const startDate = start_date || (() => {
      const date = new Date();
      const day = date.getDay();
      const diff = date.getDate() - day;
      return new Date(date.setDate(diff)).toISOString().split('T')[0];
    })();

    const endDate = end_date || (() => {
      const date = new Date(startDate);
      date.setDate(date.getDate() + 6);
      return date.toISOString().split('T')[0];
    })();

    const summary = await HabitLog.getWeeklySummary(userId, startDate, endDate);

    res.json({
      start_date: startDate,
      end_date: endDate,
      daily_summaries: summary,
    });
  } catch (error) {
    console.error('Get weekly summary error:', error);
    res.status(500).json({
      error: 'Failed to get weekly summary',
      message: 'An error occurred while fetching weekly summary',
    });
  }
};

module.exports = {
  logHabitCompletion,
  getHabitLogs,
  getHabitLog,
  updateHabitLog,
  deleteHabitLog,
  getAllUserLogs,
  getTodayLogs,
  getWeeklySummary,
};