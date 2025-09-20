#!/usr/bin/env node

const AutoTestRunner = require('../test-runner');
const { testLogger } = require('../src/utils/logger');

console.log('🚀 Habit Tracker - Automated Test Watcher');
console.log('=========================================\n');

testLogger.startTest('Test Watcher Startup', 'Initializing automated test watcher');

const runner = new AutoTestRunner();

process.on('SIGINT', () => {
  testLogger.endTest('Test Watcher Startup', 'interrupted', Date.now());
  console.log('\n\n👋 Test watcher stopped by user');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  testLogger.endTest('Test Watcher Startup', 'fail', Date.now(), {
    error: error.message,
    stack: error.stack
  });
  console.error('💥 Uncaught exception in test watcher:', error);
  process.exit(1);
});

runner.watch().catch((error) => {
  testLogger.endTest('Test Watcher Startup', 'fail', Date.now(), {
    error: error.message
  });
  console.error('❌ Test watcher failed:', error);
  process.exit(1);
});