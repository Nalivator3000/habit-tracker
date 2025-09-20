module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/frontend/setupTests.js'],

  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/frontend/src/$1',
  },

  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        ['@babel/preset-react', { runtime: 'automatic' }],
        '@babel/preset-typescript'
      ]
    }]
  },

  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json'],

  testMatch: [
    '<rootDir>/tests/frontend/**/*.test.(js|jsx|ts|tsx)',
    '<rootDir>/tests/frontend/**/*.spec.(js|jsx|ts|tsx)'
  ],

  collectCoverageFrom: [
    'frontend/src/**/*.{js,jsx,ts,tsx}',
    '!frontend/src/index.tsx',
    '!frontend/src/serviceWorker.ts',
    '!frontend/src/**/*.d.ts',
  ],

  coverageDirectory: 'coverage/frontend',

  coverageReporters: ['text', 'lcov', 'html'],

  moduleDirectories: ['node_modules', '<rootDir>/frontend/src'],

  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/frontend/build/'
  ]
};