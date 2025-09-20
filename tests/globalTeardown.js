const { Pool } = require('pg');
const { testLogger } = require('../src/utils/logger');

module.exports = async () => {
  testLogger.startTest('Global Test Teardown', 'Cleaning up test environment');

  console.log('🧹 Cleaning up test environment...');

  const testDbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: 'postgres',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || ''
  };

  try {
    const adminPool = new Pool(testDbConfig);

    testLogger.testStep('Global Test Teardown', 'Dropping test database');

    await adminPool.query(`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = 'habit_tracker_test' AND pid <> pg_backend_pid()
    `);

    await adminPool.query('DROP DATABASE IF EXISTS habit_tracker_test');

    await adminPool.end();

    testLogger.endTest('Global Test Teardown', 'pass', Date.now() - global.testStart, {
      cleanedDatabase: 'habit_tracker_test'
    });

    console.log('✅ Test environment cleanup complete');

  } catch (error) {
    testLogger.endTest('Global Test Teardown', 'fail', Date.now() - global.testStart, {
      error: error.message
    });
    console.error('❌ Test cleanup failed:', error);
  }
};