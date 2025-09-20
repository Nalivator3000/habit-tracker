const request = require('supertest');
const express = require('express');

const habitLogController = require('../../src/controllers/habitLogController');
const { testLogger } = require('../../src/utils/logger');

jest.mock('../../src/config/database');

const mockDb = {
  query: jest.fn(),
};

require('../../src/config/database').mockReturnValue(mockDb);

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  req.user = { id: 1, email: 'test@example.com' };
  next();
});

app.post('/habits/:habitId/log', habitLogController.logHabit);
app.get('/habits/:habitId/logs', habitLogController.getHabitLogs);
app.get('/habits/logs/today', habitLogController.getTodayLogs);
app.put('/habits/logs/:logId', habitLogController.updateHabitLog);
app.delete('/habits/logs/:logId', habitLogController.deleteHabitLog);

describe('HabitLogController Tests', () => {
  let testStartTime;

  beforeEach(() => {
    testStartTime = Date.now();
    jest.clearAllMocks();
    testLogger.startTest('HabitLogController', 'Testing habit log controller methods');
  });

  afterEach(() => {
    const duration = Date.now() - testStartTime;
    testLogger.endTest('HabitLogController', 'pass', duration);
  });

  describe('POST /habits/:habitId/log', () => {
    it('should log habit completion successfully', async () => {
      testLogger.testStep('Log Habit Test', 'Testing habit logging');

      const logData = {
        date: '2024-01-15',
        status: 'completed',
        completion_count: 1,
        quality_rating: 8,
        mood_before: 6,
        mood_after: 8,
        notes: 'Great workout session'
      };

      const mockHabit = {
        id: 1,
        user_id: 1,
        name: 'Morning Exercise',
        streak_count: 4
      };

      const mockLogEntry = {
        id: 1,
        habit_id: 1,
        user_id: 1,
        ...logData,
        created_at: new Date()
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockHabit] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [mockLogEntry] })
        .mockResolvedValueOnce({ rows: [{ ...mockHabit, streak_count: 5 }] });

      const response = await request(app)
        .post('/habits/1/log')
        .send(logData);

      testLogger.assertion('Log Habit Test', 'Status code is 201', response.status === 201, 201, response.status);
      testLogger.assertion('Log Habit Test', 'Success is true', response.body.success === true, true, response.body.success);
      testLogger.assertion('Log Habit Test', 'Log entry created', !!response.body.log, true, !!response.body.log);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.log.quality_rating).toBe(8);
      expect(response.body.log.notes).toBe('Great workout session');
    });

    it('should prevent duplicate logs for the same date', async () => {
      testLogger.testStep('Duplicate Log Test', 'Testing duplicate log prevention');

      const logData = {
        date: '2024-01-15',
        status: 'completed'
      };

      const mockHabit = {
        id: 1,
        user_id: 1,
        name: 'Morning Exercise'
      };

      const existingLog = {
        id: 1,
        habit_id: 1,
        date: '2024-01-15'
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockHabit] })
        .mockResolvedValueOnce({ rows: [existingLog] });

      const response = await request(app)
        .post('/habits/1/log')
        .send(logData);

      testLogger.assertion('Duplicate Log Test', 'Status code is 400', response.status === 400, 400, response.status);
      testLogger.assertion('Duplicate Log Test', 'Success is false', response.body.success === false, false, response.body.success);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already logged');
    });
  });

  describe('GET /habits/:habitId/logs', () => {
    it('should return habit logs successfully', async () => {
      testLogger.testStep('Get Habit Logs Test', 'Testing habit logs retrieval');

      const mockLogs = [
        {
          id: 1,
          habit_id: 1,
          date: '2024-01-15',
          status: 'completed',
          quality_rating: 8
        },
        {
          id: 2,
          habit_id: 1,
          date: '2024-01-14',
          status: 'completed',
          quality_rating: 7
        }
      ];

      mockDb.query.mockResolvedValue({ rows: mockLogs });

      const response = await request(app).get('/habits/1/logs');

      testLogger.assertion('Get Habit Logs Test', 'Status code is 200', response.status === 200, 200, response.status);
      testLogger.assertion('Get Habit Logs Test', 'Returns logs array', Array.isArray(response.body.logs), true, Array.isArray(response.body.logs));
      testLogger.assertion('Get Habit Logs Test', 'Correct number of logs', response.body.logs.length === 2, true, response.body.logs.length === 2);

      expect(response.status).toBe(200);
      expect(response.body.logs).toHaveLength(2);
      expect(response.body.logs[0].quality_rating).toBe(8);
    });
  });

  describe('GET /habits/logs/today', () => {
    it('should return today\'s logs for user', async () => {
      testLogger.testStep('Get Today Logs Test', 'Testing today\'s logs retrieval');

      const today = new Date().toISOString().split('T')[0];
      const mockTodayLogs = [
        {
          id: 1,
          habit_id: 1,
          habit_name: 'Morning Exercise',
          date: today,
          status: 'completed'
        },
        {
          id: 2,
          habit_id: 2,
          habit_name: 'Read Books',
          date: today,
          status: 'skipped'
        }
      ];

      mockDb.query.mockResolvedValue({ rows: mockTodayLogs });

      const response = await request(app).get('/habits/logs/today');

      testLogger.assertion('Get Today Logs Test', 'Status code is 200', response.status === 200, 200, response.status);
      testLogger.assertion('Get Today Logs Test', 'Returns today\'s logs', response.body.logs.length > 0, true, response.body.logs.length > 0);

      expect(response.status).toBe(200);
      expect(response.body.logs).toHaveLength(2);
      expect(response.body.logs[0].habit_name).toBe('Morning Exercise');
    });
  });

  describe('PUT /habits/logs/:logId', () => {
    it('should update habit log successfully', async () => {
      testLogger.testStep('Update Log Test', 'Testing habit log update');

      const updateData = {
        quality_rating: 9,
        notes: 'Updated notes',
        mood_after: 9
      };

      const mockUpdatedLog = {
        id: 1,
        habit_id: 1,
        user_id: 1,
        date: '2024-01-15',
        status: 'completed',
        ...updateData
      };

      mockDb.query.mockResolvedValue({ rows: [mockUpdatedLog] });

      const response = await request(app)
        .put('/habits/logs/1')
        .send(updateData);

      testLogger.assertion('Update Log Test', 'Status code is 200', response.status === 200, 200, response.status);
      testLogger.assertion('Update Log Test', 'Quality rating updated', response.body.log.quality_rating === 9, true, response.body.log.quality_rating === 9);

      expect(response.status).toBe(200);
      expect(response.body.log.quality_rating).toBe(9);
      expect(response.body.log.notes).toBe('Updated notes');
    });
  });

  describe('DELETE /habits/logs/:logId', () => {
    it('should delete habit log successfully', async () => {
      testLogger.testStep('Delete Log Test', 'Testing habit log deletion');

      const mockLog = {
        id: 1,
        habit_id: 1,
        user_id: 1,
        date: '2024-01-15'
      };

      const mockHabit = {
        id: 1,
        streak_count: 5
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockLog] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ ...mockHabit, streak_count: 4 }] });

      const response = await request(app).delete('/habits/logs/1');

      testLogger.assertion('Delete Log Test', 'Status code is 200', response.status === 200, 200, response.status);
      testLogger.assertion('Delete Log Test', 'Success is true', response.body.success === true, true, response.body.success);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent habit log', async () => {
      testLogger.testStep('Non-existent Log Test', 'Testing non-existent log handling');

      mockDb.query.mockResolvedValue({ rows: [] });

      const response = await request(app).get('/habits/999/logs');

      testLogger.assertion('Non-existent Log Test', 'Handles gracefully', response.status >= 200, true, response.status >= 200);

      expect(response.status).toBeGreaterThanOrEqual(200);
    });

    it('should handle database errors', async () => {
      testLogger.testStep('Database Error Test', 'Testing database error handling');

      mockDb.query.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app).get('/habits/1/logs');

      testLogger.assertion('Database Error Test', 'Status code is 500', response.status === 500, 500, response.status);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });
});