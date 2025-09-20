const { testLogger } = require('../src/utils/logger');

beforeAll(() => {
  testLogger.startTest('Test Suite Setup', 'Setting up test environment');

  process.env.NODE_ENV = 'test';
  process.env.DB_NAME = 'habit_tracker_test';
  process.env.LOG_LEVEL = 'debug';

  testLogger.testStep('Test Suite Setup', 'Environment configured for testing');
});

afterAll(() => {
  testLogger.endTest('Test Suite Setup', 'pass', Date.now(), {
    testEnvironment: 'Node.js',
    logLevel: 'debug'
  });
});

beforeEach(() => {
  jest.clearAllMocks();
});

global.testStart = Date.now();

process.on('unhandledRejection', (reason, promise) => {
  testLogger.assertion('Global Error Handler', 'No unhandled rejections', false, 'No rejections', reason);
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  testLogger.assertion('Global Error Handler', 'No uncaught exceptions', false, 'No exceptions', error.message);
  console.error('Uncaught Exception:', error);
});