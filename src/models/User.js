const { query } = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  constructor(userData) {
    this.id = userData.id;
    this.email = userData.email;
    this.name = userData.name;
    this.telegram_id = userData.telegram_id;
    this.timezone = userData.timezone;
    this.preferences = userData.preferences;
    this.created_at = userData.created_at;
    this.updated_at = userData.updated_at;
    this.last_active = userData.last_active;
    this.is_active = userData.is_active;
    this.email_verified = userData.email_verified;
  }

  // Create a new user
  static async create(userData) {
    const { email, password, name, timezone = 'UTC', telegram_id } = userData;

    // Hash password
    const saltRounds = 12;
    const password_hash = await bcrypt.hash(password, saltRounds);

    const result = await query(
      `INSERT INTO users (email, password_hash, name, timezone, telegram_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, name, timezone, telegram_id, created_at, is_active, email_verified`,
      [email, password_hash, name, timezone, telegram_id]
    );

    return new User(result.rows[0]);
  }

  // Find user by email
  static async findByEmail(email) {
    const result = await query(
      'SELECT * FROM users WHERE email = $1 AND is_active = true',
      [email]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return new User(result.rows[0]);
  }

  // Find user by ID
  static async findById(id) {
    const result = await query(
      'SELECT * FROM users WHERE id = $1 AND is_active = true',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return new User(result.rows[0]);
  }

  // Find user by Telegram ID
  static async findByTelegramId(telegramId) {
    const result = await query(
      'SELECT * FROM users WHERE telegram_id = $1 AND is_active = true',
      [telegramId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return new User(result.rows[0]);
  }

  // Verify password
  async verifyPassword(password) {
    const result = await query(
      'SELECT password_hash FROM users WHERE id = $1',
      [this.id]
    );

    if (result.rows.length === 0) {
      return false;
    }

    return bcrypt.compare(password, result.rows[0].password_hash);
  }

  // Update user profile
  async update(updateData) {
    const allowedFields = ['name', 'timezone', 'preferences', 'telegram_id'];
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
      `UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    if (result.rows.length > 0) {
      Object.assign(this, result.rows[0]);
    }

    return this;
  }

  // Update last active timestamp
  async updateLastActive() {
    await query(
      'UPDATE users SET last_active = CURRENT_TIMESTAMP WHERE id = $1',
      [this.id]
    );
    this.last_active = new Date();
  }

  // Change password
  async changePassword(newPassword) {
    const saltRounds = 12;
    const password_hash = await bcrypt.hash(newPassword, saltRounds);

    await query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [password_hash, this.id]
    );
  }

  // Set password reset token
  async setPasswordResetToken(token, expiresAt) {
    await query(
      `UPDATE users SET password_reset_token = $1, password_reset_expires = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [token, expiresAt, this.id]
    );
  }

  // Clear password reset token
  async clearPasswordResetToken() {
    await query(
      `UPDATE users SET password_reset_token = NULL, password_reset_expires = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [this.id]
    );
  }

  // Verify email
  async verifyEmail() {
    await query(
      'UPDATE users SET email_verified = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [this.id]
    );
    this.email_verified = true;
  }

  // Deactivate user
  async deactivate() {
    await query(
      'UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [this.id]
    );
    this.is_active = false;
  }

  // Get user stats
  async getStats() {
    const result = await query(
      `SELECT
        COUNT(h.id) as total_habits,
        COUNT(CASE WHEN h.is_active = true THEN 1 END) as active_habits,
        COUNT(hl.id) as total_completions,
        MAX(h.best_streak) as longest_streak
       FROM habits h
       LEFT JOIN habit_logs hl ON h.id = hl.habit_id
       WHERE h.user_id = $1`,
      [this.id]
    );

    return result.rows[0] || {
      total_habits: 0,
      active_habits: 0,
      total_completions: 0,
      longest_streak: 0,
    };
  }

  // Sanitize user data for API responses (remove sensitive fields)
  toJSON() {
    const { password_hash, password_reset_token, password_reset_expires, ...safeUser } = this;
    return safeUser;
  }

  // Get public profile (for sharing)
  toPublicProfile() {
    return {
      id: this.id,
      name: this.name,
      created_at: this.created_at,
    };
  }
}

module.exports = User;