const { Pool } = require('pg');
const { testLogger } = require('../../src/utils/logger');

const testDbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: 'habit_tracker_test',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || ''
};

describe('Database Integration Tests', () => {
  let pool;
  let testStartTime;

  beforeAll(async () => {
    testStartTime = Date.now();
    testLogger.startTest('Database Integration', 'Testing database operations');
    pool = new Pool(testDbConfig);
  });

  afterAll(async () => {
    const duration = Date.now() - testStartTime;
    testLogger.endTest('Database Integration', 'pass', duration);
    await pool.end();
  });

  beforeEach(async () => {
    testLogger.testStep('Database Integration', 'Cleaning test data');
    await pool.query('DELETE FROM habit_logs');
    await pool.query('DELETE FROM habits');
    await pool.query('DELETE FROM users');
  });

  describe('User Operations', () => {
    it('should create and retrieve a user', async () => {
      testLogger.testStep('User CRUD Test', 'Testing user creation and retrieval');

      const userData = {
        email: 'test@example.com',
        password_hash: 'hashedPassword123',
        name: 'Test User',
        timezone: 'UTC'
      };

      const insertResult = await pool.query(
        `INSERT INTO users (email, password_hash, name, timezone)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [userData.email, userData.password_hash, userData.name, userData.timezone]
      );

      testLogger.assertion('User Creation Test', 'User created successfully', insertResult.rows.length === 1, 1, insertResult.rows.length);

      const user = insertResult.rows[0];
      expect(user.email).toBe(userData.email);
      expect(user.name).toBe(userData.name);
      expect(user.id).toBeDefined();

      const selectResult = await pool.query('SELECT * FROM users WHERE id = $1', [user.id]);

      testLogger.assertion('User Retrieval Test', 'User retrieved successfully', selectResult.rows.length === 1, 1, selectResult.rows.length);

      const retrievedUser = selectResult.rows[0];
      expect(retrievedUser.email).toBe(userData.email);
      expect(retrievedUser.name).toBe(userData.name);
    });

    it('should enforce unique email constraint', async () => {
      testLogger.testStep('Email Uniqueness Test', 'Testing unique email constraint');

      const userData = {
        email: 'duplicate@example.com',
        password_hash: 'hashedPassword123',
        name: 'Test User'
      };

      await pool.query(
        `INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3)`,
        [userData.email, userData.password_hash, userData.name]
      );

      try {
        await pool.query(
          `INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3)`,
          [userData.email, userData.password_hash, 'Another User']
        );
        testLogger.assertion('Email Uniqueness Test', 'Should throw duplicate error', false, 'Error thrown', 'No error');
        fail('Should have thrown a duplicate key error');
      } catch (error) {
        testLogger.assertion('Email Uniqueness Test', 'Duplicate key error thrown', error.code === '23505', '23505', error.code);
        expect(error.code).toBe('23505');
      }
    });
  });

  describe('Habit Operations', () => {
    let userId;

    beforeEach(async () => {
      testLogger.testStep('Habit Setup', 'Creating test user for habits');
      const userResult = await pool.query(
        `INSERT INTO users (email, password_hash, name)
         VALUES ('habit-test@example.com', 'hash', 'Habit Tester') RETURNING id`
      );
      userId = userResult.rows[0].id;
    });

    it('should create and manage habits', async () => {
      testLogger.testStep('Habit Management Test', 'Testing habit CRUD operations');

      const habitData = {
        user_id: userId,
        name: 'Morning Exercise',
        description: 'Daily morning workout',
        frequency_type: 'daily',
        frequency_value: 1,
        target_count: 1,
        difficulty_level: 3,
        category: 'health',
        color: '#10B981'
      };

      const insertResult = await pool.query(
        `INSERT INTO habits (user_id, name, description, frequency_type, frequency_value,
                           target_count, difficulty_level, category, color)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [habitData.user_id, habitData.name, habitData.description, habitData.frequency_type,
         habitData.frequency_value, habitData.target_count, habitData.difficulty_level,
         habitData.category, habitData.color]
      );

      testLogger.assertion('Habit Creation Test', 'Habit created successfully', insertResult.rows.length === 1, 1, insertResult.rows.length);

      const habit = insertResult.rows[0];
      expect(habit.name).toBe(habitData.name);
      expect(habit.user_id).toBe(userId);
      expect(habit.streak_count).toBe(0);
      expect(habit.is_archived).toBe(false);

      const updateResult = await pool.query(
        'UPDATE habits SET streak_count = 5, best_streak = 7 WHERE id = $1 RETURNING *',
        [habit.id]
      );

      testLogger.assertion('Habit Update Test', 'Habit updated successfully', updateResult.rows[0].streak_count === 5, 5, updateResult.rows[0].streak_count);

      expect(updateResult.rows[0].streak_count).toBe(5);
      expect(updateResult.rows[0].best_streak).toBe(7);
    });

    it('should enforce foreign key constraint with users', async () => {
      testLogger.testStep('Foreign Key Test', 'Testing foreign key constraint');

      try {
        await pool.query(
          `INSERT INTO habits (user_id, name, frequency_type) VALUES (99999, 'Invalid Habit', 'daily')`
        );
        testLogger.assertion('Foreign Key Test', 'Should throw foreign key error', false, 'Error thrown', 'No error');
        fail('Should have thrown a foreign key constraint error');
      } catch (error) {
        testLogger.assertion('Foreign Key Test', 'Foreign key error thrown', error.code === '23503', '23503', error.code);
        expect(error.code).toBe('23503');
      }
    });
  });

  describe('Habit Log Operations', () => {
    let userId, habitId;

    beforeEach(async () => {
      testLogger.testStep('Habit Log Setup', 'Creating test data for habit logs');

      const userResult = await pool.query(
        `INSERT INTO users (email, password_hash, name)
         VALUES ('log-test@example.com', 'hash', 'Log Tester') RETURNING id`
      );
      userId = userResult.rows[0].id;

      const habitResult = await pool.query(
        `INSERT INTO habits (user_id, name, frequency_type)
         VALUES ($1, 'Test Habit', 'daily') RETURNING id`,
        [userId]
      );
      habitId = habitResult.rows[0].id;
    });

    it('should create and track habit logs', async () => {
      testLogger.testStep('Habit Log Test', 'Testing habit log creation and tracking');

      const logData = {
        habit_id: habitId,
        user_id: userId,
        date: '2024-01-15',
        status: 'completed',
        completion_count: 1,
        quality_rating: 8,
        mood_before: 6,
        mood_after: 8,
        notes: 'Great workout session'
      };

      const insertResult = await pool.query(
        `INSERT INTO habit_logs (habit_id, user_id, date, status, completion_count,
                               quality_rating, mood_before, mood_after, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [logData.habit_id, logData.user_id, logData.date, logData.status,
         logData.completion_count, logData.quality_rating, logData.mood_before,
         logData.mood_after, logData.notes]
      );

      testLogger.assertion('Habit Log Creation Test', 'Log created successfully', insertResult.rows.length === 1, 1, insertResult.rows.length);

      const log = insertResult.rows[0];
      expect(log.habit_id).toBe(habitId);
      expect(log.quality_rating).toBe(8);
      expect(log.notes).toBe('Great workout session');

      const selectResult = await pool.query(
        `SELECT hl.*, h.name as habit_name
         FROM habit_logs hl
         JOIN habits h ON hl.habit_id = h.id
         WHERE hl.user_id = $1`,
        [userId]
      );

      testLogger.assertion('Habit Log Query Test', 'Log retrieved with habit name', selectResult.rows.length === 1, 1, selectResult.rows.length);

      expect(selectResult.rows[0].habit_name).toBe('Test Habit');
    });

    it('should enforce unique constraint on habit_id and date', async () => {
      testLogger.testStep('Unique Constraint Test', 'Testing unique constraint on habit logs');

      const logData = {
        habit_id: habitId,
        user_id: userId,
        date: '2024-01-15',
        status: 'completed'
      };

      await pool.query(
        `INSERT INTO habit_logs (habit_id, user_id, date, status)
         VALUES ($1, $2, $3, $4)`,
        [logData.habit_id, logData.user_id, logData.date, logData.status]
      );

      try {
        await pool.query(
          `INSERT INTO habit_logs (habit_id, user_id, date, status)
           VALUES ($1, $2, $3, $4)`,
          [logData.habit_id, logData.user_id, logData.date, 'skipped']
        );
        testLogger.assertion('Unique Constraint Test', 'Should throw unique constraint error', false, 'Error thrown', 'No error');
        fail('Should have thrown a unique constraint error');
      } catch (error) {
        testLogger.assertion('Unique Constraint Test', 'Unique constraint error thrown', error.code === '23505', '23505', error.code);
        expect(error.code).toBe('23505');
      }
    });
  });

  describe('Complex Queries', () => {
    let userId;

    beforeEach(async () => {
      testLogger.testStep('Complex Query Setup', 'Setting up data for complex queries');

      const userResult = await pool.query(
        `INSERT INTO users (email, password_hash, name)
         VALUES ('complex-test@example.com', 'hash', 'Complex Tester') RETURNING id`
      );
      userId = userResult.rows[0].id;

      const habit1Result = await pool.query(
        `INSERT INTO habits (user_id, name, frequency_type, streak_count)
         VALUES ($1, 'Exercise', 'daily', 5) RETURNING id`,
        [userId]
      );

      const habit2Result = await pool.query(
        `INSERT INTO habits (user_id, name, frequency_type, streak_count)
         VALUES ($1, 'Reading', 'daily', 3) RETURNING id`,
        [userId]
      );

      const habit1Id = habit1Result.rows[0].id;
      const habit2Id = habit2Result.rows[0].id;

      await pool.query(
        `INSERT INTO habit_logs (habit_id, user_id, date, status, quality_rating)
         VALUES
         ($1, $2, '2024-01-15', 'completed', 8),
         ($1, $2, '2024-01-14', 'completed', 7),
         ($3, $2, '2024-01-15', 'completed', 9)`,
        [habit1Id, userId, habit2Id]
      );
    });

    it('should perform complex analytics queries', async () => {
      testLogger.testStep('Analytics Query Test', 'Testing complex analytics queries');

      const analyticsQuery = `
        SELECT
          h.name,
          h.streak_count,
          COUNT(hl.id) as total_logs,
          AVG(hl.quality_rating) as avg_quality,
          MAX(hl.quality_rating) as best_quality
        FROM habits h
        LEFT JOIN habit_logs hl ON h.id = hl.habit_id
        WHERE h.user_id = $1 AND h.is_archived = false
        GROUP BY h.id, h.name, h.streak_count
        ORDER BY h.streak_count DESC
      `;

      const result = await pool.query(analyticsQuery, [userId]);

      testLogger.assertion('Analytics Query Test', 'Query returned results', result.rows.length === 2, 2, result.rows.length);

      expect(result.rows).toHaveLength(2);
      expect(result.rows[0].name).toBe('Exercise');
      expect(result.rows[0].streak_count).toBe(5);
      expect(parseFloat(result.rows[0].avg_quality)).toBeCloseTo(7.5);
    });

    it('should handle date-based queries efficiently', async () => {
      testLogger.testStep('Date Query Test', 'Testing date-based queries');

      const dateQuery = `
        SELECT
          h.name,
          hl.date,
          hl.status,
          hl.quality_rating
        FROM habit_logs hl
        JOIN habits h ON hl.habit_id = h.id
        WHERE hl.user_id = $1
        AND hl.date >= $2
        AND hl.date <= $3
        ORDER BY hl.date DESC, h.name
      `;

      const startTime = Date.now();
      const result = await pool.query(dateQuery, [userId, '2024-01-14', '2024-01-15']);
      const queryDuration = Date.now() - startTime;

      testLogger.assertion('Date Query Performance Test', 'Query completed quickly', queryDuration < 100, '< 100ms', `${queryDuration}ms`);
      testLogger.assertion('Date Query Test', 'Query returned correct results', result.rows.length === 3, 3, result.rows.length);

      expect(result.rows).toHaveLength(3);
      expect(queryDuration).toBeLessThan(100);
    });
  });
});