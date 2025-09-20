const { Pool } = require('pg');
const { testLogger } = require('../src/utils/logger');

module.exports = async () => {
  testLogger.startTest('Global Test Setup', 'Setting up test database and environment');

  console.log('🧪 Setting up test environment...');

  const testDbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: 'postgres',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || ''
  };

  try {
    const adminPool = new Pool(testDbConfig);

    testLogger.testStep('Global Test Setup', 'Checking test database');

    try {
      await adminPool.query('DROP DATABASE IF EXISTS habit_tracker_test');
      testLogger.testStep('Global Test Setup', 'Dropped existing test database');
    } catch (error) {
      testLogger.testStep('Global Test Setup', 'No existing test database to drop');
    }

    await adminPool.query('CREATE DATABASE habit_tracker_test');
    testLogger.testStep('Global Test Setup', 'Created test database');

    await adminPool.end();

    const testPool = new Pool({
      ...testDbConfig,
      database: 'habit_tracker_test'
    });

    const schema = `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        telegram_id BIGINT UNIQUE,
        timezone VARCHAR(50) DEFAULT 'UTC',
        preferences JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS habits (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        frequency_type VARCHAR(20) NOT NULL DEFAULT 'daily',
        frequency_value INTEGER DEFAULT 1,
        target_count INTEGER DEFAULT 1,
        difficulty_level INTEGER DEFAULT 3 CHECK (difficulty_level BETWEEN 1 AND 5),
        category VARCHAR(100),
        color VARCHAR(7) DEFAULT '#3B82F6',
        icon VARCHAR(50),
        is_archived BOOLEAN DEFAULT FALSE,
        streak_count INTEGER DEFAULT 0,
        best_streak INTEGER DEFAULT 0,
        total_completions INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS habit_logs (
        id SERIAL PRIMARY KEY,
        habit_id INTEGER REFERENCES habits(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'completed',
        completion_count INTEGER DEFAULT 1,
        quality_rating INTEGER CHECK (quality_rating BETWEEN 1 AND 10),
        mood_before INTEGER CHECK (mood_before BETWEEN 1 AND 10),
        mood_after INTEGER CHECK (mood_after BETWEEN 1 AND 10),
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(habit_id, date)
      );

      CREATE INDEX idx_users_email ON users(email);
      CREATE INDEX idx_users_telegram_id ON users(telegram_id);
      CREATE INDEX idx_habits_user_id ON habits(user_id);
      CREATE INDEX idx_habit_logs_habit_id ON habit_logs(habit_id);
      CREATE INDEX idx_habit_logs_date ON habit_logs(date);
    `;

    await testPool.query(schema);
    testLogger.testStep('Global Test Setup', 'Test database schema created');

    await testPool.end();

    testLogger.endTest('Global Test Setup', 'pass', Date.now() - global.testStart, {
      database: 'habit_tracker_test',
      tables: ['users', 'habits', 'habit_logs']
    });

    console.log('✅ Test environment setup complete');

  } catch (error) {
    testLogger.endTest('Global Test Setup', 'fail', Date.now() - global.testStart, {
      error: error.message
    });
    console.error('❌ Test setup failed:', error);
    throw error;
  }
};