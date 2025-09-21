const { pool } = require('./database');

const createTables = async () => {
  console.log('🗃️ Initializing database tables...');

  const schema = `
    -- Users table
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

    -- Habits table
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

    -- Habit logs table
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

    -- Custom metrics table (for future use)
    CREATE TABLE IF NOT EXISTS custom_metrics (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      scale_min INTEGER DEFAULT 1,
      scale_max INTEGER DEFAULT 10,
      scale_type VARCHAR(20) DEFAULT 'numeric',
      unit VARCHAR(50),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Metric logs table (for future use)
    CREATE TABLE IF NOT EXISTS metric_logs (
      id SERIAL PRIMARY KEY,
      metric_id INTEGER REFERENCES custom_metrics(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      value DECIMAL(10,2) NOT NULL,
      date DATE NOT NULL,
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(metric_id, date)
    );

    -- Habit categories table (for future use)
    CREATE TABLE IF NOT EXISTS habit_categories (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      icon VARCHAR(50),
      color VARCHAR(7) DEFAULT '#3B82F6',
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      is_default BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(name, user_id)
    );

    -- Create indexes for better performance
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
    CREATE INDEX IF NOT EXISTS idx_habits_user_id ON habits(user_id);
    CREATE INDEX IF NOT EXISTS idx_habits_frequency ON habits(frequency_type);
    CREATE INDEX IF NOT EXISTS idx_habit_logs_habit_id ON habit_logs(habit_id);
    CREATE INDEX IF NOT EXISTS idx_habit_logs_user_id ON habit_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_habit_logs_date ON habit_logs(date);
    CREATE INDEX IF NOT EXISTS idx_habit_logs_status ON habit_logs(status);
    CREATE INDEX IF NOT EXISTS idx_custom_metrics_user_id ON custom_metrics(user_id);
    CREATE INDEX IF NOT EXISTS idx_metric_logs_metric_id ON metric_logs(metric_id);
    CREATE INDEX IF NOT EXISTS idx_metric_logs_date ON metric_logs(date);
    CREATE INDEX IF NOT EXISTS idx_habit_categories_user_id ON habit_categories(user_id);
  `;

  try {
    await pool.query(schema);
    console.log('✅ Database tables initialized successfully');

    // Get table info
    const tableInfo = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    console.log('📊 Available tables:', tableInfo.rows.map(row => row.table_name).join(', '));

    return true;
  } catch (error) {
    console.error('❌ Failed to initialize database tables:', error);
    throw error;
  }
};

const checkDatabaseConnection = async () => {
  try {
    console.log('🔍 Testing database connection...');
    const result = await pool.query('SELECT NOW() as current_time, version() as postgres_version');
    console.log('✅ Database connection successful');
    console.log('🕐 Database time:', result.rows[0].current_time);
    console.log('🐘 PostgreSQL version:', result.rows[0].postgres_version.split(' ')[0]);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('🔧 Connection details:');
    console.error('  Host:', process.env.DATABASE_HOST || process.env.DB_HOST || 'localhost');
    console.error('  Port:', process.env.DATABASE_PORT || process.env.DB_PORT || 5432);
    console.error('  Database:', process.env.DATABASE_NAME || process.env.DB_NAME || 'habit_tracker');
    console.error('  User:', process.env.DATABASE_USER || process.env.DB_USER || 'postgres');
    console.error('  SSL:', process.env.NODE_ENV === 'production' ? 'enabled' : 'disabled');
    throw error;
  }
};

const initializeDatabase = async () => {
  try {
    await checkDatabaseConnection();
    await createTables();
    console.log('🎉 Database initialization complete!');
    return true;
  } catch (error) {
    console.error('💥 Database initialization failed:', error);
    return false;
  }
};

module.exports = {
  initializeDatabase,
  createTables,
  checkDatabaseConnection
};