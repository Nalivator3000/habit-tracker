module.exports = {
  testEnvironment: 'node',

  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json-summary'
  ],

  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },

  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js',
    '**/__tests__/**/*.js'
  ],

  setupFilesAfterEnv: [
    '<rootDir>/tests/setup.js'
  ],

  testTimeout: 30000,

  coveragePathIgnorePatterns: [
    'node_modules/',
    'coverage/',
    'tests/',
    'frontend/',
    'logs/',
    '.env'
  ],

  collectCoverageFrom: [
    'src/**/*.js',
    'server.js',
    'bot.js',
    '!src/bot/telegramBot.js',
    '!**/node_modules/**'
  ],

  verbose: true,

  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'test-results',
      outputName: 'junit.xml',
      suiteNameTemplate: '{filepath}',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}'
    }]
  ],

  globalSetup: '<rootDir>/tests/globalSetup.js',
  globalTeardown: '<rootDir>/tests/globalTeardown.js',

  testPathIgnorePatterns: [
    'node_modules/',
    'frontend/',
    'coverage/'
  ]
};