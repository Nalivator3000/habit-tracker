const request = require('supertest');
const express = require('express');

const habitController = require('../../src/controllers/habitController');
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

app.get('/habits', habitController.getHabits);
app.post('/habits', habitController.createHabit);
app.get('/habits/:id', habitController.getHabit);
app.put('/habits/:id', habitController.updateHabit);
app.delete('/habits/:id', habitController.deleteHabit);
app.get('/habits/overview', habitController.getHabitsOverview);

describe('HabitController Tests', () => {
  let testStartTime;

  beforeEach(() => {
    testStartTime = Date.now();
    jest.clearAllMocks();
    testLogger.startTest('HabitController', 'Testing habit controller methods');
  });

  afterEach(() => {
    const duration = Date.now() - testStartTime;
    testLogger.endTest('HabitController', 'pass', duration);
  });

  describe('GET /habits', () => {
    it('should return user habits successfully', async () => {
      testLogger.testStep('Get Habits Test', 'Testing habit retrieval');

      const mockHabits = [
        {
          id: 1,
          name: 'Morning Exercise',
          frequency_type: 'daily',
          streak_count: 5,
          is_archived: false
        },
        {
          id: 2,
          name: 'Read Books',
          frequency_type: 'weekly',
          streak_count: 2,
          is_archived: false
        }
      ];

      mockDb.query.mockResolvedValue({ rows: mockHabits });

      const response = await request(app).get('/habits');

      testLogger.assertion('Get Habits Test', 'Status code is 200', response.status === 200, 200, response.status);
      testLogger.assertion('Get Habits Test', 'Success is true', response.body.success === true, true, response.body.success);
      testLogger.assertion('Get Habits Test', 'Returns habits array', Array.isArray(response.body.habits), true, Array.isArray(response.body.habits));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.habits).toHaveLength(2);
      expect(response.body.habits[0].name).toBe('Morning Exercise');
    });
  });

  describe('POST /habits', () => {
    it('should create a new habit successfully', async () => {
      testLogger.testStep('Create Habit Test', 'Testing habit creation');

      const habitData = {
        name: 'Meditation',
        description: 'Daily meditation practice',
        frequency_type: 'daily',
        frequency_value: 1,
        target_count: 1,
        difficulty_level: 3,
        category: 'wellness',
        color: '#10B981'
      };

      const mockCreatedHabit = {
        id: 3,
        ...habitData,
        user_id: 1,
        streak_count: 0,
        best_streak: 0,
        total_completions: 0,
        is_archived: false,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockDb.query.mockResolvedValue({ rows: [mockCreatedHabit] });

      const response = await request(app)
        .post('/habits')
        .send(habitData);

      testLogger.assertion('Create Habit Test', 'Status code is 201', response.status === 201, 201, response.status);
      testLogger.assertion('Create Habit Test', 'Success is true', response.body.success === true, true, response.body.success);
      testLogger.assertion('Create Habit Test', 'Habit has correct name', response.body.habit.name === 'Meditation', true, response.body.habit.name === 'Meditation');

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.habit.name).toBe('Meditation');
      expect(response.body.habit.frequency_type).toBe('daily');
    });

    it('should validate required fields', async () => {
      testLogger.testStep('Create Habit Validation Test', 'Testing habit validation');

      const invalidHabitData = {
        description: 'Missing name field'
      };

      const response = await request(app)
        .post('/habits')
        .send(invalidHabitData);

      testLogger.assertion('Habit Validation Test', 'Status code is 400', response.status === 400, 400, response.status);
      testLogger.assertion('Habit Validation Test', 'Success is false', response.body.success === false, false, response.body.success);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /habits/:id', () => {
    it('should return specific habit', async () => {
      testLogger.testStep('Get Single Habit Test', 'Testing single habit retrieval');

      const mockHabit = {
        id: 1,
        name: 'Morning Exercise',
        description: 'Daily workout routine',
        frequency_type: 'daily',
        user_id: 1
      };

      mockDb.query.mockResolvedValue({ rows: [mockHabit] });

      const response = await request(app).get('/habits/1');

      testLogger.assertion('Get Single Habit Test', 'Status code is 200', response.status === 200, 200, response.status);
      testLogger.assertion('Get Single Habit Test', 'Returns correct habit', response.body.habit.id === 1, true, response.body.habit.id === 1);

      expect(response.status).toBe(200);
      expect(response.body.habit.name).toBe('Morning Exercise');
    });

    it('should return 404 for non-existent habit', async () => {
      testLogger.testStep('Get Non-existent Habit Test', 'Testing non-existent habit retrieval');

      mockDb.query.mockResolvedValue({ rows: [] });

      const response = await request(app).get('/habits/999');

      testLogger.assertion('Non-existent Habit Test', 'Status code is 404', response.status === 404, 404, response.status);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /habits/:id', () => {
    it('should update habit successfully', async () => {
      testLogger.testStep('Update Habit Test', 'Testing habit update');

      const updateData = {
        name: 'Evening Exercise',
        description: 'Updated description'
      };

      const mockUpdatedHabit = {
        id: 1,
        ...updateData,
        frequency_type: 'daily',
        user_id: 1
      };

      mockDb.query.mockResolvedValue({ rows: [mockUpdatedHabit] });

      const response = await request(app)
        .put('/habits/1')
        .send(updateData);

      testLogger.assertion('Update Habit Test', 'Status code is 200', response.status === 200, 200, response.status);
      testLogger.assertion('Update Habit Test', 'Name updated correctly', response.body.habit.name === 'Evening Exercise', true, response.body.habit.name === 'Evening Exercise');

      expect(response.status).toBe(200);
      expect(response.body.habit.name).toBe('Evening Exercise');
    });
  });

  describe('DELETE /habits/:id', () => {
    it('should delete habit successfully', async () => {
      testLogger.testStep('Delete Habit Test', 'Testing habit deletion');

      mockDb.query.mockResolvedValue({ rows: [{ id: 1 }] });

      const response = await request(app).delete('/habits/1');

      testLogger.assertion('Delete Habit Test', 'Status code is 200', response.status === 200, 200, response.status);
      testLogger.assertion('Delete Habit Test', 'Success is true', response.body.success === true, true, response.body.success);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      testLogger.testStep('Database Error Test', 'Testing database error handling');

      mockDb.query.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app).get('/habits');

      testLogger.assertion('Database Error Test', 'Status code is 500', response.status === 500, 500, response.status);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });
});