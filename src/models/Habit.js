const { query } = require('../config/database');

class Habit {
  constructor(habitData) {
    this.id = habitData.id;
    this.user_id = habitData.user_id;
    this.name = habitData.name;
    this.description = habitData.description;
    this.category_id = habitData.category_id;
    this.color = habitData.color;
    this.icon = habitData.icon;
    this.frequency_type = habitData.frequency_type;
    this.frequency_value = habitData.frequency_value;
    this.target_count = habitData.target_count;
    this.reminder_times = habitData.reminder_times;
    this.preferred_time_start = habitData.preferred_time_start;
    this.preferred_time_end = habitData.preferred_time_end;
    this.is_active = habitData.is_active;
    this.streak_count = habitData.streak_count;
    this.best_streak = habitData.best_streak;
    this.total_completions = habitData.total_completions;
    this.created_at = habitData.created_at;
    this.updated_at = habitData.updated_at;
    this.archived_at = habitData.archived_at;
    this.notes = habitData.notes;
    this.difficulty_level = habitData.difficulty_level;
    this.is_public = habitData.is_public;
  }

  // Create a new habit
  static async create(habitData, userId) {
    const {
      name,
      description,
      category_id,
      color = '#3B82F6',
      icon,
      frequency_type,
      frequency_value = 1,
      target_count = 1,
      reminder_times,
      preferred_time_start,
      preferred_time_end,
      notes,
      difficulty_level,
      is_public = false,
    } = habitData;

    const result = await query(
      `INSERT INTO habits (
        user_id, name, description, category_id, color, icon,
        frequency_type, frequency_value, target_count,
        reminder_times, preferred_time_start, preferred_time_end,
        notes, difficulty_level, is_public
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        userId, name, description, category_id, color, icon,
        frequency_type, frequency_value, target_count,
        reminder_times, preferred_time_start, preferred_time_end,
        notes, difficulty_level, is_public
      ]
    );

    return new Habit(result.rows[0]);
  }

  // Find habit by ID
  static async findById(id, userId = null) {
    const whereClause = userId
      ? 'WHERE id = $1 AND user_id = $2 AND is_active = true'
      : 'WHERE id = $1 AND is_active = true';

    const params = userId ? [id, userId] : [id];

    const result = await query(
      `SELECT * FROM habits ${whereClause}`,
      params
    );

    if (result.rows.length === 0) {
      return null;
    }

    return new Habit(result.rows[0]);
  }

  // Get all habits for a user
  static async findByUserId(userId, options = {}) {
    const {
      is_active = true,
      category_id,
      limit,
      offset = 0,
      order_by = 'created_at',
      order_direction = 'DESC'
    } = options;

    let whereConditions = ['user_id = $1'];
    let params = [userId];
    let paramCount = 2;

    if (is_active !== null) {
      whereConditions.push(`is_active = $${paramCount}`);
      params.push(is_active);
      paramCount++;
    }

    if (category_id) {
      whereConditions.push(`category_id = $${paramCount}`);
      params.push(category_id);
      paramCount++;
    }

    let queryText = `
      SELECT h.*, hc.name as category_name, hc.color as category_color
      FROM habits h
      LEFT JOIN habit_categories hc ON h.category_id = hc.id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY ${order_by} ${order_direction}
    `;

    if (limit) {
      queryText += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
      params.push(limit, offset);
    }

    const result = await query(queryText, params);
    return result.rows.map(row => new Habit(row));
  }

  // Update habit
  async update(updateData) {
    const allowedFields = [
      'name', 'description', 'category_id', 'color', 'icon',
      'frequency_type', 'frequency_value', 'target_count',
      'reminder_times', 'preferred_time_start', 'preferred_time_end',
      'notes', 'difficulty_level', 'is_public', 'is_active'
    ];

    const updates = [];
    const values = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key)) {
        updates.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    }

    if (updates.length === 0) {
      return this;
    }

    values.push(this.id);
    const result = await query(
      `UPDATE habits SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    if (result.rows.length > 0) {
      Object.assign(this, result.rows[0]);
    }

    return this;
  }

  // Archive habit (soft delete)
  async archive() {
    const result = await query(
      `UPDATE habits SET is_active = false, archived_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [this.id]
    );

    if (result.rows.length > 0) {
      Object.assign(this, result.rows[0]);
    }

    return this;
  }

  // Hard delete habit
  async delete() {
    await query('DELETE FROM habits WHERE id = $1', [this.id]);
  }

  // Get habit statistics
  async getStats(dateRange = {}) {
    const { start_date, end_date } = dateRange;

    let dateCondition = '';
    const params = [this.id];
    let paramCount = 2;

    if (start_date) {
      dateCondition += ` AND date >= $${paramCount}`;
      params.push(start_date);
      paramCount++;
    }

    if (end_date) {
      dateCondition += ` AND date <= $${paramCount}`;
      params.push(end_date);
      paramCount++;
    }

    const result = await query(
      `SELECT
        COUNT(*) as total_logs,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
        COUNT(CASE WHEN status = 'partial' THEN 1 END) as partial_count,
        COUNT(CASE WHEN status = 'skipped' THEN 1 END) as skipped_count,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count,
        AVG(CASE WHEN quality_rating IS NOT NULL THEN quality_rating END) as avg_quality,
        AVG(CASE WHEN mood_before IS NOT NULL THEN mood_before END) as avg_mood_before,
        AVG(CASE WHEN mood_after IS NOT NULL THEN mood_after END) as avg_mood_after,
        MIN(date) as first_log_date,
        MAX(date) as last_log_date
       FROM habit_logs
       WHERE habit_id = $1 ${dateCondition}`,
      params
    );

    const stats = result.rows[0];

    // Calculate completion rate
    const totalLogs = parseInt(stats.total_logs);
    const completedCount = parseInt(stats.completed_count);
    const completionRate = totalLogs > 0 ? (completedCount / totalLogs) * 100 : 0;

    return {
      ...stats,
      completion_rate: Math.round(completionRate * 100) / 100,
      current_streak: this.streak_count,
      best_streak: this.best_streak,
      total_completions: this.total_completions,
    };
  }

  // Calculate next due date based on frequency
  getNextDueDate(lastCompletionDate = null) {
    const baseDate = lastCompletionDate ? new Date(lastCompletionDate) : new Date();
    const nextDate = new Date(baseDate);

    switch (this.frequency_type) {
      case 'daily':
        nextDate.setDate(nextDate.getDate() + this.frequency_value);
        break;
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + (this.frequency_value * 7));
        break;
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + this.frequency_value);
        break;
      case 'custom':
        // For custom frequency, frequency_value represents days
        nextDate.setDate(nextDate.getDate() + this.frequency_value);
        break;
      default:
        // Default to daily
        nextDate.setDate(nextDate.getDate() + 1);
    }

    return nextDate;
  }

  // Check if habit is due today
  isDueToday(timezone = 'UTC') {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: timezone });
    const nextDue = this.getNextDueDate().toLocaleDateString('en-CA', { timeZone: timezone });
    return today >= nextDue;
  }

  // Update streak count
  async updateStreak(newStreakCount) {
    const bestStreak = Math.max(this.best_streak || 0, newStreakCount);

    await query(
      `UPDATE habits SET streak_count = $1, best_streak = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [newStreakCount, bestStreak, this.id]
    );

    this.streak_count = newStreakCount;
    this.best_streak = bestStreak;
  }

  // Increment total completions
  async incrementCompletions() {
    await query(
      `UPDATE habits SET total_completions = total_completions + 1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [this.id]
    );

    this.total_completions = (this.total_completions || 0) + 1;
  }

  // Get habit with recent logs
  async getWithRecentLogs(limit = 7) {
    const result = await query(
      `SELECT hl.*, h.name as habit_name
       FROM habit_logs hl
       JOIN habits h ON hl.habit_id = h.id
       WHERE hl.habit_id = $1
       ORDER BY hl.date DESC, hl.created_at DESC
       LIMIT $2`,
      [this.id, limit]
    );

    return {
      ...this.toJSON(),
      recent_logs: result.rows,
    };
  }

  // Convert to JSON (remove internal fields)
  toJSON() {
    return {
      id: this.id,
      user_id: this.user_id,
      name: this.name,
      description: this.description,
      category_id: this.category_id,
      color: this.color,
      icon: this.icon,
      frequency_type: this.frequency_type,
      frequency_value: this.frequency_value,
      target_count: this.target_count,
      reminder_times: this.reminder_times,
      preferred_time_start: this.preferred_time_start,
      preferred_time_end: this.preferred_time_end,
      is_active: this.is_active,
      streak_count: this.streak_count,
      best_streak: this.best_streak,
      total_completions: this.total_completions,
      created_at: this.created_at,
      updated_at: this.updated_at,
      notes: this.notes,
      difficulty_level: this.difficulty_level,
      is_public: this.is_public,
    };
  }
}

module.exports = Habit;