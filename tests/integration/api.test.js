const request = require('supertest');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const { testLogger } = require('../../src/utils/logger');

const testDbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: 'habit_tracker_test',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || ''
};

process.env.NODE_ENV = 'test';
process.env.DB_NAME = 'habit_tracker_test';

const app = require('../../server');

describe('API Integration Tests', () => {
  let pool;
  let testStartTime;
  let authToken;
  let userId;

  beforeAll(async () => {
    testStartTime = Date.now();
    testLogger.startTest('API Integration', 'Testing full API integration');
    pool = new Pool(testDbConfig);

    testLogger.testStep('API Integration Setup', 'Creating test user and auth token');

    const password = 'testPassword123';
    const hashedPassword = await bcrypt.hash(password, 12);

    const userResult = await pool.query(
      `INSERT INTO users (email, password_hash, name, timezone)
       VALUES ('api-test@example.com', $1, 'API Tester', 'UTC') RETURNING id`,
      [hashedPassword]
    );

    userId = userResult.rows[0].id;

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'api-test@example.com',
        password: password
      });

    authToken = loginResponse.body.token;
    testLogger.assertion('API Setup', 'Auth token obtained', !!authToken, true, !!authToken);
  });

  afterAll(async () => {
    const duration = Date.now() - testStartTime;
    testLogger.endTest('API Integration', 'pass', duration);
    await pool.end();
  });

  beforeEach(async () => {
    testLogger.testStep('API Test Cleanup', 'Cleaning test data between tests');
    await pool.query('DELETE FROM habit_logs WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM habits WHERE user_id = $1', [userId]);
  });

  describe('Authentication Flow', () => {
    it('should complete full registration and login flow', async () => {
      testLogger.testStep('Auth Flow Test', 'Testing complete authentication flow');

      const newUser = {
        email: 'newuser@example.com',
        password: 'newPassword123',
        name: 'New User'
      };

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(newUser);

      testLogger.assertion('Registration Test', 'Registration successful', registerResponse.status === 201, 201, registerResponse.status);

      expect(registerResponse.status).toBe(201);
      expect(registerResponse.body.success).toBe(true);
      expect(registerResponse.body.token).toBeDefined();

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: newUser.email,
          password: newUser.password
        });

      testLogger.assertion('Login Test', 'Login successful', loginResponse.status === 200, 200, loginResponse.status);

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.user.email).toBe(newUser.email);

      await pool.query('DELETE FROM users WHERE email = $1', [newUser.email]);
    });

    it('should access protected routes with valid token', async () => {
      testLogger.testStep('Protected Route Test', 'Testing protected route access');

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`);

      testLogger.assertion('Protected Route Test', 'Profile access successful', response.status === 200, 200, response.status);

      expect(response.status).toBe(200);
      expect(response.body.user.email).toBe('api-test@example.com');
    });

    it('should reject access without token', async () => {
      testLogger.testStep('Unauthorized Access Test', 'Testing unauthorized access');

      const response = await request(app)
        .get('/api/auth/profile');

      testLogger.assertion('Unauthorized Test', 'Access denied without token', response.status === 401, 401, response.status);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Habit Management Flow', () => {
    it('should complete full habit CRUD operations', async () => {
      testLogger.testStep('Habit CRUD Test', 'Testing complete habit CRUD flow');

      const habitData = {
        name: 'Integration Test Habit',
        description: 'A habit for testing integration',
        frequency_type: 'daily',
        frequency_value: 1,
        target_count: 1,
        difficulty_level: 3,
        category: 'test',
        color: '#3B82F6'
      };

      const createResponse = await request(app)
        .post('/api/habits')
        .set('Authorization', `Bearer ${authToken}`)
        .send(habitData);

      testLogger.assertion('Habit Creation Test', 'Habit created successfully', createResponse.status === 201, 201, createResponse.status);

      expect(createResponse.status).toBe(201);
      expect(createResponse.body.habit.name).toBe(habitData.name);

      const habitId = createResponse.body.habit.id;

      const getResponse = await request(app)
        .get('/api/habits')
        .set('Authorization', `Bearer ${authToken}`);

      testLogger.assertion('Get Habits Test', 'Habits retrieved successfully', getResponse.status === 200, 200, getResponse.status);

      expect(getResponse.status).toBe(200);
      expect(getResponse.body.habits).toHaveLength(1);
      expect(getResponse.body.habits[0].name).toBe(habitData.name);

      const updateData = {
        name: 'Updated Integration Test Habit',
        difficulty_level: 4
      };

      const updateResponse = await request(app)
        .put(`/api/habits/${habitId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      testLogger.assertion('Habit Update Test', 'Habit updated successfully', updateResponse.status === 200, 200, updateResponse.status);

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.habit.name).toBe(updateData.name);
      expect(updateResponse.body.habit.difficulty_level).toBe(4);

      const deleteResponse = await request(app)
        .delete(`/api/habits/${habitId}`)
        .set('Authorization', `Bearer ${authToken}`);

      testLogger.assertion('Habit Deletion Test', 'Habit deleted successfully', deleteResponse.status === 200, 200, deleteResponse.status);

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.success).toBe(true);
    });
  });

  describe('Habit Logging Flow', () => {
    let habitId;

    beforeEach(async () => {
      testLogger.testStep('Habit Logging Setup', 'Creating habit for logging tests');

      const createResponse = await request(app)
        .post('/api/habits')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Logging Test Habit',
          frequency_type: 'daily'
        });

      habitId = createResponse.body.habit.id;
    });

    it('should complete full habit logging flow', async () => {
      testLogger.testStep('Habit Logging Flow Test', 'Testing complete habit logging flow');

      const today = new Date().toISOString().split('T')[0];
      const logData = {
        date: today,
        status: 'completed',
        completion_count: 1,
        quality_rating: 8,
        mood_before: 6,
        mood_after: 8,
        notes: 'Integration test completion'
      };

      const logResponse = await request(app)
        .post(`/api/habits/${habitId}/log`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(logData);

      testLogger.assertion('Habit Log Creation Test', 'Log created successfully', logResponse.status === 201, 201, logResponse.status);

      expect(logResponse.status).toBe(201);
      expect(logResponse.body.log.quality_rating).toBe(8);
      expect(logResponse.body.log.notes).toBe('Integration test completion');

      const logsResponse = await request(app)
        .get(`/api/habits/${habitId}/logs`)
        .set('Authorization', `Bearer ${authToken}`);

      testLogger.assertion('Get Logs Test', 'Logs retrieved successfully', logsResponse.status === 200, 200, logsResponse.status);

      expect(logsResponse.status).toBe(200);
      expect(logsResponse.body.logs).toHaveLength(1);

      const todayLogsResponse = await request(app)
        .get('/api/habits/logs/today')
        .set('Authorization', `Bearer ${authToken}`);

      testLogger.assertion('Get Today Logs Test', 'Today logs retrieved successfully', todayLogsResponse.status === 200, 200, todayLogsResponse.status);

      expect(todayLogsResponse.status).toBe(200);
      expect(todayLogsResponse.body.logs.length).toBeGreaterThanOrEqual(1);
    });

    it('should prevent duplicate logs for same date', async () => {
      testLogger.testStep('Duplicate Log Prevention Test', 'Testing duplicate log prevention');

      const today = new Date().toISOString().split('T')[0];
      const logData = {
        date: today,
        status: 'completed'
      };

      const firstLogResponse = await request(app)
        .post(`/api/habits/${habitId}/log`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(logData);

      testLogger.assertion('First Log Test', 'First log successful', firstLogResponse.status === 201, 201, firstLogResponse.status);

      expect(firstLogResponse.status).toBe(201);

      const duplicateLogResponse = await request(app)
        .post(`/api/habits/${habitId}/log`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(logData);

      testLogger.assertion('Duplicate Log Test', 'Duplicate log rejected', duplicateLogResponse.status === 400, 400, duplicateLogResponse.status);

      expect(duplicateLogResponse.status).toBe(400);
      expect(duplicateLogResponse.body.success).toBe(false);
    });
  });

  describe('Data Integrity and Security', () => {
    it('should isolate user data properly', async () => {
      testLogger.testStep('Data Isolation Test', 'Testing user data isolation');

      const anotherUserResult = await pool.query(
        `INSERT INTO users (email, password_hash, name)
         VALUES ('another@example.com', 'hash', 'Another User') RETURNING id`
      );

      const anotherUserId = anotherUserResult.rows[0].id;

      await pool.query(
        `INSERT INTO habits (user_id, name, frequency_type)
         VALUES ($1, 'Another User Habit', 'daily')`,
        [anotherUserId]
      );

      const habitsResponse = await request(app)
        .get('/api/habits')
        .set('Authorization', `Bearer ${authToken}`);

      testLogger.assertion('Data Isolation Test', 'Only user habits returned', habitsResponse.body.habits.length === 0, 0, habitsResponse.body.habits.length);

      expect(habitsResponse.body.habits).toHaveLength(0);

      await pool.query('DELETE FROM users WHERE id = $1', [anotherUserId]);
    });

    it('should validate request data properly', async () => {
      testLogger.testStep('Request Validation Test', 'Testing request data validation');

      const invalidHabitData = {
        description: 'Missing required name field',
        frequency_type: 'invalid_frequency'
      };

      const response = await request(app)
        .post('/api/habits')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidHabitData);

      testLogger.assertion('Validation Test', 'Invalid data rejected', response.status === 400, 400, response.status);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle concurrent requests properly', async () => {
      testLogger.testStep('Concurrency Test', 'Testing concurrent request handling');

      const concurrentRequests = Array.from({ length: 5 }, (_, i) =>
        request(app)
          .post('/api/habits')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: `Concurrent Habit ${i + 1}`,
            frequency_type: 'daily'
          })
      );

      const startTime = Date.now();
      const responses = await Promise.all(concurrentRequests);
      const duration = Date.now() - startTime;

      testLogger.assertion('Concurrency Test', 'All requests successful', responses.every(r => r.status === 201), true, responses.every(r => r.status === 201));
      testLogger.assertion('Concurrency Performance Test', 'Completed in reasonable time', duration < 2000, '< 2000ms', `${duration}ms`);

      responses.forEach((response, index) => {
        expect(response.status).toBe(201);
        expect(response.body.habit.name).toBe(`Concurrent Habit ${index + 1}`);
      });

      expect(duration).toBeLessThan(2000);
    });

    it('should handle large datasets efficiently', async () => {
      testLogger.testStep('Large Dataset Test', 'Testing large dataset handling');

      const createResponse = await request(app)
        .post('/api/habits')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Performance Test Habit',
          frequency_type: 'daily'
        });

      const habitId = createResponse.body.habit.id;

      const logPromises = Array.from({ length: 30 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return pool.query(
          `INSERT INTO habit_logs (habit_id, user_id, date, status, quality_rating)
           VALUES ($1, $2, $3, 'completed', $4)`,
          [habitId, userId, date.toISOString().split('T')[0], Math.floor(Math.random() * 10) + 1]
        );
      });

      await Promise.all(logPromises);

      const startTime = Date.now();
      const logsResponse = await request(app)
        .get(`/api/habits/${habitId}/logs`)
        .set('Authorization', `Bearer ${authToken}`);
      const queryDuration = Date.now() - startTime;

      testLogger.assertion('Large Dataset Query Test', 'Query completed successfully', logsResponse.status === 200, 200, logsResponse.status);
      testLogger.assertion('Large Dataset Performance Test', 'Query completed quickly', queryDuration < 500, '< 500ms', `${queryDuration}ms`);

      expect(logsResponse.status).toBe(200);
      expect(logsResponse.body.logs).toHaveLength(30);
      expect(queryDuration).toBeLessThan(500);
    });
  });
});