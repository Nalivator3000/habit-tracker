#!/usr/bin/env node

const AutoTestRunner = require('../test-runner');
const { testLogger } = require('../src/utils/logger');

const testType = process.argv[2] || 'all';
const validTypes = ['all', 'unit', 'integration', 'frontend', 'bot', 'coverage'];

if (!validTypes.includes(testType)) {
  console.error(`❌ Invalid test type: ${testType}`);
  console.error(`✅ Valid types: ${validTypes.join(', ')}`);
  process.exit(1);
}

console.log('🧪 Habit Tracker - Automated Test Runner');
console.log('========================================\n');

testLogger.startTest('Test Runner Execution', `Running ${testType} tests`);

const runner = new AutoTestRunner();

async function runTests() {
  try {
    let result;

    switch (testType) {
      case 'unit':
        result = await runner.runUnitTests();
        break;
      case 'integration':
        result = await runner.runIntegrationTests();
        break;
      case 'frontend':
        result = await runner.runFrontendTests();
        break;
      case 'bot':
        result = await runner.runBotTests();
        break;
      case 'coverage':
        result = await runner.generateCoverageReport();
        break;
      case 'all':
      default:
        result = await runner.runAllTests();
        break;
    }

    const success = testType === 'all' ? runner.calculateOverallResult() : result.success;

    testLogger.endTest('Test Runner Execution', success ? 'pass' : 'fail', Date.now(), {
      testType,
      success
    });

    if (success) {
      console.log('\n🎉 All tests completed successfully!');
      process.exit(0);
    } else {
      console.log('\n💥 Some tests failed. Check the output above for details.');
      process.exit(1);
    }

  } catch (error) {
    testLogger.endTest('Test Runner Execution', 'fail', Date.now(), {
      testType,
      error: error.message
    });
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  }
}

process.on('SIGINT', () => {
  testLogger.endTest('Test Runner Execution', 'interrupted', Date.now());
  console.log('\n👋 Test execution stopped by user');
  process.exit(0);
});

runTests();