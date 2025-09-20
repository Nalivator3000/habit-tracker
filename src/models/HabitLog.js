const { query } = require('../config/database');

class HabitLog {
  constructor(logData) {
    this.id = logData.id;
    this.habit_id = logData.habit_id;
    this.user_id = logData.user_id;
    this.completed_at = logData.completed_at;
    this.date = logData.date;
    this.status = logData.status;
    this.completion_count = logData.completion_count;
    this.target_count = logData.target_count;
    this.quality_rating = logData.quality_rating;
    this.notes = logData.notes;
    this.mood_before = logData.mood_before;
    this.mood_after = logData.mood_after;
    this.created_at = logData.created_at;
    this.updated_at = logData.updated_at;
  }

  // Create a new habit log
  static async create(logData, habitId, userId) {
    const {
      status,
      date,
      completion_count = 1,
      target_count = 1,
      quality_rating,
      notes,
      mood_before,
      mood_after,
      completed_at = new Date(),
    } = logData;

    const result = await query(
      `INSERT INTO habit_logs (
        habit_id, user_id, status, date, completion_count, target_count,
        quality_rating, notes, mood_before, mood_after, completed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (habit_id, date)
      DO UPDATE SET
        status = EXCLUDED.status,
        completion_count = EXCLUDED.completion_count,
        target_count = EXCLUDED.target_count,
        quality_rating = EXCLUDED.quality_rating,
        notes = EXCLUDED.notes,
        mood_before = EXCLUDED.mood_before,
        mood_after = EXCLUDED.mood_after,
        completed_at = EXCLUDED.completed_at,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *`,
      [
        habitId, userId, status, date, completion_count, target_count,
        quality_rating, notes, mood_before, mood_after, completed_at
      ]
    );

    return new HabitLog(result.rows[0]);
  }

  // Find log by ID
  static async findById(id, userId = null) {
    const whereClause = userId
      ? 'WHERE id = $1 AND user_id = $2'
      : 'WHERE id = $1';

    const params = userId ? [id, userId] : [id];

    const result = await query(
      `SELECT hl.*, h.name as habit_name
       FROM habit_logs hl
       JOIN habits h ON hl.habit_id = h.id
       ${whereClause}`,
      params
    );

    if (result.rows.length === 0) {
      return null;
    }

    return new HabitLog(result.rows[0]);
  }

  // Get logs for a specific habit
  static async findByHabitId(habitId, userId, options = {}) {
    const {
      start_date,
      end_date,
      status,
      limit,
      offset = 0,
      order_by = 'date',
      order_direction = 'DESC',
    } = options;

    let whereConditions = ['hl.habit_id = $1', 'hl.user_id = $2'];
    let params = [habitId, userId];
    let paramCount = 3;

    if (start_date) {
      whereConditions.push(`hl.date >= $${paramCount}`);
      params.push(start_date);
      paramCount++;
    }

    if (end_date) {
      whereConditions.push(`hl.date <= $${paramCount}`);
      params.push(end_date);
      paramCount++;
    }

    if (status) {
      whereConditions.push(`hl.status = $${paramCount}`);
      params.push(status);
      paramCount++;
    }

    let queryText = `
      SELECT hl.*, h.name as habit_name
      FROM habit_logs hl
      JOIN habits h ON hl.habit_id = h.id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY ${order_by} ${order_direction}
    `;

    if (limit) {
      queryText += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
      params.push(limit, offset);
    }

    const result = await query(queryText, params);
    return result.rows.map(row => new HabitLog(row));
  }

  // Get logs for all user habits
  static async findByUserId(userId, options = {}) {
    const {
      start_date,
      end_date,
      status,
      habit_ids,
      limit,
      offset = 0,
      order_by = 'date',
      order_direction = 'DESC',
    } = options;

    let whereConditions = ['hl.user_id = $1'];
    let params = [userId];
    let paramCount = 2;

    if (start_date) {
      whereConditions.push(`hl.date >= $${paramCount}`);
      params.push(start_date);
      paramCount++;
    }

    if (end_date) {
      whereConditions.push(`hl.date <= $${paramCount}`);
      params.push(end_date);
      paramCount++;
    }

    if (status) {
      whereConditions.push(`hl.status = $${paramCount}`);
      params.push(status);
      paramCount++;
    }

    if (habit_ids && habit_ids.length > 0) {
      whereConditions.push(`hl.habit_id = ANY($${paramCount})`);
      params.push(habit_ids);
      paramCount++;
    }

    let queryText = `
      SELECT hl.*, h.name as habit_name, h.color as habit_color
      FROM habit_logs hl
      JOIN habits h ON hl.habit_id = h.id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY ${order_by} ${order_direction}
    `;

    if (limit) {
      queryText += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
      params.push(limit, offset);
    }

    const result = await query(queryText, params);
    return result.rows.map(row => new HabitLog(row));
  }

  // Update log
  async update(updateData) {
    const allowedFields = [
      'status', 'completion_count', 'target_count', 'quality_rating',
      'notes', 'mood_before', 'mood_after', 'completed_at'
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
      `UPDATE habit_logs SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    if (result.rows.length > 0) {
      Object.assign(this, result.rows[0]);
    }

    return this;
  }

  // Delete log
  async delete() {
    await query('DELETE FROM habit_logs WHERE id = $1', [this.id]);
  }

  // Get streak calculation for a habit
  static async calculateStreak(habitId, userId, endDate = new Date()) {
    const result = await query(
      `SELECT date, status
       FROM habit_logs
       WHERE habit_id = $1 AND user_id = $2 AND date <= $3
       ORDER BY date DESC`,
      [habitId, userId, endDate.toISOString().split('T')[0]]
    );

    const logs = result.rows;
    let streakCount = 0;
    let currentDate = new Date(endDate);

    for (const log of logs) {
      const logDate = new Date(log.date);
      const daysDiff = Math.floor((currentDate - logDate) / (1000 * 60 * 60 * 24));

      if (daysDiff === 0 && (log.status === 'completed' || log.status === 'partial')) {
        streakCount++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else if (daysDiff === 1 && (log.status === 'completed' || log.status === 'partial')) {
        streakCount++;
        currentDate = logDate;
      } else {
        break;
      }
    }

    return streakCount;
  }

  // Get completion percentage for a date range
  static async getCompletionRate(habitId, userId, startDate, endDate) {
    const result = await query(
      `SELECT
        COUNT(*) as total_days,
        COUNT(CASE WHEN status IN ('completed', 'partial') THEN 1 END) as completed_days
       FROM habit_logs
       WHERE habit_id = $1 AND user_id = $2 AND date BETWEEN $3 AND $4`,
      [habitId, userId, startDate, endDate]
    );

    const { total_days, completed_days } = result.rows[0];
    return total_days > 0 ? (completed_days / total_days) * 100 : 0;
  }

  // Get today's log for a habit
  static async getTodayLog(habitId, userId, timezone = 'UTC') {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: timezone });

    const result = await query(
      `SELECT * FROM habit_logs
       WHERE habit_id = $1 AND user_id = $2 AND date = $3`,
      [habitId, userId, today]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return new HabitLog(result.rows[0]);
  }

  // Get weekly summary
  static async getWeeklySummary(userId, startDate, endDate) {
    const result = await query(
      `SELECT
        hl.date,
        COUNT(*) as total_habits,
        COUNT(CASE WHEN hl.status IN ('completed', 'partial') THEN 1 END) as completed_habits,
        AVG(CASE WHEN hl.quality_rating IS NOT NULL THEN hl.quality_rating END) as avg_quality,
        AVG(CASE WHEN hl.mood_before IS NOT NULL THEN hl.mood_before END) as avg_mood_before,
        AVG(CASE WHEN hl.mood_after IS NOT NULL THEN hl.mood_after END) as avg_mood_after
       FROM habit_logs hl
       WHERE hl.user_id = $1 AND hl.date BETWEEN $2 AND $3
       GROUP BY hl.date
       ORDER BY hl.date`,
      [userId, startDate, endDate]
    );

    return result.rows;
  }

  // Convert to JSON
  toJSON() {
    return {
      id: this.id,
      habit_id: this.habit_id,
      user_id: this.user_id,
      completed_at: this.completed_at,
      date: this.date,
      status: this.status,
      completion_count: this.completion_count,
      target_count: this.target_count,
      quality_rating: this.quality_rating,
      notes: this.notes,
      mood_before: this.mood_before,
      mood_after: this.mood_after,
      created_at: this.created_at,
      updated_at: this.updated_at,
    };
  }
}

module.exports = HabitLog;