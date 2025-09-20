const db = require('../config/database');

class BotHabitService {
  // Get user's active habits
  async getUserHabits(userId, options = {}) {
    try {
      let query = `
        SELECT h.*, hc.name as category_name
        FROM habits h
        LEFT JOIN habit_categories hc ON h.category_id = hc.id
        WHERE h.user_id = $1
      `;
      const params = [userId];

      if (options.is_active !== undefined) {
        query += ` AND h.is_active = $${params.length + 1}`;
        params.push(options.is_active);
      }

      if (options.limit) {
        query += ` LIMIT $${params.length + 1}`;
        params.push(options.limit);
      }

      query += ' ORDER BY h.created_at DESC';

      const result = await db.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Error fetching user habits:', error);
      throw error;
    }
  }

  // Get today's progress
  async getTodayProgress(userId) {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Get all active habits
      const habitsResult = await db.query(`
        SELECT h.* FROM habits h
        WHERE h.user_id = $1 AND h.is_active = true
        ORDER BY h.name
      `, [userId]);

      const allHabits = habitsResult.rows;

      // Get today's logs
      const logsResult = await db.query(`
        SELECT hl.*, h.name as habit_name
        FROM habit_logs hl
        JOIN habits h ON hl.habit_id = h.id
        WHERE hl.user_id = $1 AND hl.date = $2
      `, [userId, today]);

      const todayLogs = logsResult.rows;
      const completedHabitIds = todayLogs
        .filter(log => log.status === 'completed')
        .map(log => log.habit_id);

      const pending_habits = allHabits.filter(habit =>
        !completedHabitIds.includes(habit.id)
      );

      const completed_habits = allHabits.filter(habit =>
        completedHabitIds.includes(habit.id)
      );

      const completion_rate = allHabits.length > 0
        ? (completed_habits.length / allHabits.length) * 100
        : 0;

      return {
        pending_habits,
        completed_habits,
        completion_rate,
        total_habits: allHabits.length,
        today_logs: todayLogs
      };
    } catch (error) {
      console.error('Error fetching today progress:', error);
      throw error;
    }
  }

  // Log habit completion
  async logHabitCompletion(habitId, userId, logData) {
    try {
      const { status, date, notes, quality_rating } = logData;

      // Get habit details
      const habitResult = await db.query(`
        SELECT * FROM habits WHERE id = $1 AND user_id = $2
      `, [habitId, userId]);

      if (habitResult.rows.length === 0) {
        throw new Error('Habit not found');
      }

      const habit = habitResult.rows[0];

      // Upsert habit log
      const logResult = await db.query(`
        INSERT INTO habit_logs (
          habit_id, user_id, date, status, target_count, notes, quality_rating
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (habit_id, date)
        DO UPDATE SET
          status = EXCLUDED.status,
          notes = EXCLUDED.notes,
          quality_rating = EXCLUDED.quality_rating,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `, [
        habitId,
        userId,
        date,
        status,
        habit.target_count || 1,
        notes,
        quality_rating
      ]);

      // Update habit streak if completed
      if (status === 'completed') {
        await this.updateHabitStreak(habitId);
      }

      return {
        log: logResult.rows[0],
        habit: habit
      };
    } catch (error) {
      console.error('Error logging habit completion:', error);
      throw error;
    }
  }

  // Update habit streak
  async updateHabitStreak(habitId) {
    try {
      // Calculate current streak
      const streakResult = await db.query(`
        WITH consecutive_days AS (
          SELECT
            date,
            LAG(date) OVER (ORDER BY date) as prev_date
          FROM habit_logs
          WHERE habit_id = $1 AND status = 'completed'
          ORDER BY date DESC
        ),
        streak_calculation AS (
          SELECT
            date,
            CASE
              WHEN prev_date IS NULL OR date - prev_date = 1 THEN 1
              ELSE 0
            END as is_consecutive
          FROM consecutive_days
        )
        SELECT COUNT(*) as current_streak
        FROM (
          SELECT date, is_consecutive,
            SUM(CASE WHEN is_consecutive = 0 THEN 1 ELSE 0 END) OVER (ORDER BY date DESC) as streak_group
          FROM streak_calculation
        ) grouped
        WHERE streak_group = 0
      `, [habitId]);

      const currentStreak = streakResult.rows[0]?.current_streak || 0;

      // Update habit with new streak
      await db.query(`
        UPDATE habits
        SET
          streak_count = $1,
          best_streak = GREATEST(best_streak, $1),
          total_completions = (
            SELECT COUNT(*)
            FROM habit_logs
            WHERE habit_id = $2 AND status = 'completed'
          ),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [currentStreak, habitId]);

      return currentStreak;
    } catch (error) {
      console.error('Error updating habit streak:', error);
      throw error;
    }
  }

  // Find habit by name
  async findHabitByName(userId, habitName) {
    try {
      const result = await db.query(`
        SELECT * FROM habits
        WHERE user_id = $1 AND LOWER(name) LIKE LOWER($2) AND is_active = true
        ORDER BY
          CASE WHEN LOWER(name) = LOWER($2) THEN 1 ELSE 2 END,
          name
        LIMIT 1
      `, [userId, `%${habitName}%`]);

      return result.rows[0] || null;
    } catch (error) {
      console.error('Error finding habit by name:', error);
      throw error;
    }
  }

  // Get user statistics
  async getUserStats(userId, days = 30) {
    try {
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = startDate.toISOString().split('T')[0];

      // Overall stats
      const overallResult = await db.query(`
        SELECT
          COUNT(DISTINCT h.id) as total_habits,
          COUNT(DISTINCT CASE WHEN h.is_active THEN h.id END) as active_habits,
          MAX(h.streak_count) as best_streak,
          SUM(h.total_completions) as total_completions
        FROM habits h
        WHERE h.user_id = $1
      `, [userId]);

      // Recent period stats
      const recentResult = await db.query(`
        SELECT
          COUNT(*) as recent_completions,
          COUNT(DISTINCT date) as active_days,
          COUNT(DISTINCT habit_id) as habits_logged
        FROM habit_logs
        WHERE user_id = $1
        AND date >= $2
        AND date <= $3
        AND status = 'completed'
      `, [userId, startDateStr, endDate]);

      // Completion rate for the period
      const rateResult = await db.query(`
        WITH daily_expected AS (
          SELECT
            generate_series($2::date, $3::date, '1 day')::date as date,
            COUNT(h.id) as expected_count
          FROM habits h
          WHERE h.user_id = $1 AND h.is_active = true
          GROUP BY date
        ),
        daily_actual AS (
          SELECT
            hl.date,
            COUNT(*) as actual_count
          FROM habit_logs hl
          WHERE hl.user_id = $1
          AND hl.date >= $2
          AND hl.date <= $3
          AND hl.status = 'completed'
          GROUP BY hl.date
        )
        SELECT
          COALESCE(AVG(
            CASE WHEN de.expected_count > 0
            THEN da.actual_count::float / de.expected_count * 100
            ELSE 0 END
          ), 0) as avg_completion_rate
        FROM daily_expected de
        LEFT JOIN daily_actual da ON de.date = da.date
      `, [userId, startDateStr, endDate]);

      const overall = overallResult.rows[0];
      const recent = recentResult.rows[0];
      const avgRate = rateResult.rows[0]?.avg_completion_rate || 0;

      return {
        total_habits: parseInt(overall.total_habits) || 0,
        active_habits: parseInt(overall.active_habits) || 0,
        best_streak: parseInt(overall.best_streak) || 0,
        total_completions: parseInt(overall.total_completions) || 0,
        recent_completions: parseInt(recent.recent_completions) || 0,
        active_days: parseInt(recent.active_days) || 0,
        habits_logged: parseInt(recent.habits_logged) || 0,
        avg_completion_rate: Math.round(avgRate),
        period_days: days
      };
    } catch (error) {
      console.error('Error getting user stats:', error);
      throw error;
    }
  }

  // Create new habit
  async createHabit(userId, habitData) {
    try {
      const {
        name,
        description = '',
        color = '#3B82F6',
        frequency_type = 'daily',
        frequency_value = 1,
        target_count = 1,
        difficulty_level = 1
      } = habitData;

      const result = await db.query(`
        INSERT INTO habits (
          user_id, name, description, color,
          frequency_type, frequency_value, target_count, difficulty_level
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        userId, name, description, color,
        frequency_type, frequency_value, target_count, difficulty_level
      ]);

      return result.rows[0];
    } catch (error) {
      console.error('Error creating habit:', error);
      throw error;
    }
  }

  // Link Telegram account
  async linkTelegramAccount(userId, telegramId) {
    try {
      const result = await db.query(`
        UPDATE users
        SET telegram_id = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `, [telegramId, userId]);

      return result.rows[0];
    } catch (error) {
      console.error('Error linking Telegram account:', error);
      throw error;
    }
  }

  // Find user by email
  async findUserByEmail(email) {
    try {
      const result = await db.query(`
        SELECT * FROM users WHERE LOWER(email) = LOWER($1)
      `, [email]);

      return result.rows[0] || null;
    } catch (error) {
      console.error('Error finding user by email:', error);
      throw error;
    }
  }
}

module.exports = new BotHabitService();