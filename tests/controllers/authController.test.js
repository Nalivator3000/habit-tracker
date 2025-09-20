const request = require('supertest');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const authController = require('../../src/controllers/authController');
const { testLogger } = require('../../src/utils/logger');

jest.mock('../../src/config/database');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

const mockDb = {
  query: jest.fn(),
};

require('../../src/config/database').mockReturnValue(mockDb);

const app = express();
app.use(express.json());
app.post('/register', authController.register);
app.post('/login', authController.login);
app.get('/profile', authController.getProfile);
app.put('/profile', authController.updateProfile);

describe('AuthController Tests', () => {
  let testStartTime;

  beforeEach(() => {
    testStartTime = Date.now();
    jest.clearAllMocks();
    testLogger.startTest('AuthController', 'Testing authentication controller methods');
  });

  afterEach(() => {
    const duration = Date.now() - testStartTime;
    testLogger.endTest('AuthController', 'pass', duration);
  });

  describe('POST /register', () => {
    it('should register a new user successfully', async () => {
      testLogger.testStep('Register Test', 'Testing user registration');

      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      };

      const hashedPassword = 'hashedPassword123';
      const userId = 1;

      bcrypt.hash.mockResolvedValue(hashedPassword);
      mockDb.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: userId, ...userData, password_hash: hashedPassword }] });

      jwt.sign.mockReturnValue('mock-jwt-token');

      const response = await request(app)
        .post('/register')
        .send(userData);

      testLogger.assertion('Register Test', 'Status code is 201', response.status === 201, 201, response.status);
      testLogger.assertion('Register Test', 'Success is true', response.body.success === true, true, response.body.success);
      testLogger.assertion('Register Test', 'Token is provided', !!response.body.token, true, !!response.body.token);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(bcrypt.hash).toHaveBeenCalledWith(userData.password, 12);
    });

    it('should return error if user already exists', async () => {
      testLogger.testStep('Register Test', 'Testing duplicate user registration');

      const userData = {
        email: 'existing@example.com',
        password: 'password123',
        name: 'Test User'
      };

      mockDb.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });

      const response = await request(app)
        .post('/register')
        .send(userData);

      testLogger.assertion('Duplicate Register Test', 'Status code is 400', response.status === 400, 400, response.status);
      testLogger.assertion('Duplicate Register Test', 'Success is false', response.body.success === false, false, response.body.success);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });
  });

  describe('POST /login', () => {
    it('should login user with valid credentials', async () => {
      testLogger.testStep('Login Test', 'Testing user login with valid credentials');

      const credentials = {
        email: 'test@example.com',
        password: 'password123'
      };

      const dbUser = {
        id: 1,
        email: credentials.email,
        password_hash: 'hashedPassword123',
        name: 'Test User'
      };

      mockDb.query.mockResolvedValueOnce({ rows: [dbUser] });
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign.mockReturnValue('mock-jwt-token');

      const response = await request(app)
        .post('/login')
        .send(credentials);

      testLogger.assertion('Login Test', 'Status code is 200', response.status === 200, 200, response.status);
      testLogger.assertion('Login Test', 'Success is true', response.body.success === true, true, response.body.success);
      testLogger.assertion('Login Test', 'Token is provided', !!response.body.token, true, !!response.body.token);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(bcrypt.compare).toHaveBeenCalledWith(credentials.password, dbUser.password_hash);
    });

    it('should return error for invalid credentials', async () => {
      testLogger.testStep('Login Test', 'Testing login with invalid password');

      const credentials = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      const dbUser = {
        id: 1,
        email: credentials.email,
        password_hash: 'hashedPassword123'
      };

      mockDb.query.mockResolvedValueOnce({ rows: [dbUser] });
      bcrypt.compare.mockResolvedValue(false);

      const response = await request(app)
        .post('/login')
        .send(credentials);

      testLogger.assertion('Invalid Login Test', 'Status code is 401', response.status === 401, 401, response.status);
      testLogger.assertion('Invalid Login Test', 'Success is false', response.body.success === false, false, response.body.success);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid');
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      testLogger.testStep('Error Handling Test', 'Testing database error handling');

      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      };

      mockDb.query.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .post('/register')
        .send(userData);

      testLogger.assertion('Error Handling Test', 'Status code is 500', response.status === 500, 500, response.status);
      testLogger.assertion('Error Handling Test', 'Success is false', response.body.success === false, false, response.body.success);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });
});