const express = require('express');
const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const router = express.Router();

// Create admin user endpoint
router.post('/create-admin', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    console.log('📝 Admin creation request:', { email, name });

    // Validation
    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, and name are required'
      });
    }

    // Check if user already exists
    const existingUser = await query('SELECT id, email FROM users WHERE email = $1', [email]);

    if (existingUser.rows.length > 0) {
      console.log('⚠️ User already exists:', email);

      // Update existing user's password
      const hashedPassword = await bcrypt.hash(password, 12);
      await query(
        'UPDATE users SET password_hash = $1, name = $2, updated_at = CURRENT_TIMESTAMP WHERE email = $3',
        [hashedPassword, name, email]
      );

      console.log('✅ Updated existing user:', email);

      return res.json({
        success: true,
        message: 'Admin user updated successfully',
        user: {
          id: existingUser.rows[0].id,
          email: email,
          name: name
        }
      });
    }

    // Create new user
    console.log('👤 Creating new admin user...');
    const hashedPassword = await bcrypt.hash(password, 12);

    const result = await query(
      `INSERT INTO users (email, password_hash, name, timezone, created_at, updated_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id, email, name, created_at`,
      [email, hashedPassword, name, 'UTC']
    );

    console.log('✅ Admin user created:', result.rows[0]);

    res.json({
      success: true,
      message: 'Admin user created successfully',
      user: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Admin creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create admin user',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Test database connection
router.get('/test-db', async (req, res) => {
  try {
    console.log('🔍 Testing database connection...');

    // Test basic connection
    const timeResult = await query('SELECT NOW() as current_time');
    console.log('✅ Database time:', timeResult.rows[0].current_time);

    // Test users table
    const userCount = await query('SELECT COUNT(*) as count FROM users');
    console.log('👥 User count:', userCount.rows[0].count);

    // Get table info
    const tables = await query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    res.json({
      success: true,
      database: {
        connected: true,
        time: timeResult.rows[0].current_time,
        userCount: parseInt(userCount.rows[0].count),
        tables: tables.rows.map(row => row.table_name),
        environment: {
          NODE_ENV: process.env.NODE_ENV,
          DATABASE_HOST: process.env.DATABASE_HOST ? 'Set' : 'Missing',
          DATABASE_NAME: process.env.DATABASE_NAME ? 'Set' : 'Missing',
          DATABASE_USER: process.env.DATABASE_USER ? 'Set' : 'Missing',
          DATABASE_PASSWORD: process.env.DATABASE_PASSWORD ? 'Set' : 'Missing'
        }
      }
    });

  } catch (error) {
    console.error('❌ Database test error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Test database tables
router.get('/test-tables', async (req, res) => {
  try {
    console.log('🔍 Testing database tables...');

    // Check if tables exist
    const tablesQuery = `
      SELECT table_name, table_type
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;

    const tablesResult = await query(tablesQuery);

    // Check users table structure
    const usersColumnsQuery = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'users' AND table_schema = 'public'
      ORDER BY ordinal_position;
    `;

    const usersColumns = await query(usersColumnsQuery);

    res.json({
      success: true,
      tables: tablesResult.rows,
      usersTableStructure: usersColumns.rows,
      tableCount: tablesResult.rows.length
    });

  } catch (error) {
    console.error('❌ Table test error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: error.code,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Test database queries
router.get('/test-queries', async (req, res) => {
  try {
    console.log('🔍 Testing database queries...');

    // Test basic connection
    const timeResult = await query('SELECT NOW() as current_time, version() as postgres_version');

    // Test users table
    const userCountResult = await query('SELECT COUNT(*) as user_count FROM users');

    // Test if users table has proper structure
    const sampleUser = await query('SELECT id, email, name, created_at FROM users LIMIT 1');

    // Test creating/dropping a test table
    await query('CREATE TABLE IF NOT EXISTS test_connection (id SERIAL PRIMARY KEY, test_data TEXT)');
    await query('INSERT INTO test_connection (test_data) VALUES ($1)', ['Connection test']);
    const testResult = await query('SELECT * FROM test_connection WHERE test_data = $1', ['Connection test']);
    await query('DROP TABLE IF EXISTS test_connection');

    res.json({
      success: true,
      connectionTest: {
        time: timeResult.rows[0].current_time,
        version: timeResult.rows[0].postgres_version
      },
      userTable: {
        count: parseInt(userCountResult.rows[0].user_count),
        sampleUser: sampleUser.rows[0] || null
      },
      queryTest: {
        testTableCreated: true,
        testDataInserted: testResult.rows.length > 0,
        testTableDropped: true
      }
    });

  } catch (error) {
    console.error('❌ Query test error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: error.code,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Initialize database tables
router.post('/init-database', async (req, res) => {
  try {
    console.log('🗃️ Initializing database tables...');

    const { pool } = require('../config/database');

    // Check if we can connect first
    const connectionTest = await pool.query('SELECT NOW() as test_time');
    console.log('✅ Database connection successful:', connectionTest.rows[0]);

    // Create tables using the schema
    const createTablesSQL = `
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
    `;

    await pool.query(createTablesSQL);

    // Verify tables were created
    const tablesResult = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log('✅ Database initialization completed');

    res.json({
      success: true,
      message: 'Database tables initialized successfully',
      tablesCreated: tablesResult.rows.map(row => row.table_name),
      connectionTest: connectionTest.rows[0]
    });

  } catch (error) {
    console.error('❌ Database initialization error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: error.code,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Test environment variables
router.get('/test-env', async (req, res) => {
  try {
    console.log('🔍 Testing environment variables...');

    // Get all environment variables that might be related to database
    const envVars = {
      // Standard DATABASE_* variables
      DATABASE_URL: process.env.DATABASE_URL || null,
      DATABASE_HOST: process.env.DATABASE_HOST || null,
      DATABASE_PORT: process.env.DATABASE_PORT || null,
      DATABASE_NAME: process.env.DATABASE_NAME || null,
      DATABASE_USER: process.env.DATABASE_USER || null,
      DATABASE_PASSWORD: process.env.DATABASE_PASSWORD ? '[HIDDEN]' : null,

      // Railway PG* variables
      PGHOST: process.env.PGHOST || null,
      PGPORT: process.env.PGPORT || null,
      PGDATABASE: process.env.PGDATABASE || null,
      PGUSER: process.env.PGUSER || null,
      PGPASSWORD: process.env.PGPASSWORD ? '[HIDDEN]' : null,

      // Other common variables
      NODE_ENV: process.env.NODE_ENV || null,
      PORT: process.env.PORT || null,

      // All environment variable names (for debugging)
      allEnvVarNames: Object.keys(process.env).filter(key =>
        key.includes('PG') ||
        key.includes('DATABASE') ||
        key.includes('DB_') ||
        key.includes('POSTGRES')
      ).sort()
    };

    res.json({
      success: true,
      environment: envVars,
      summary: {
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        hasPgVariables: !!(process.env.PGHOST && process.env.PGDATABASE && process.env.PGUSER && process.env.PGPASSWORD),
        hasAnyDbVars: Object.keys(process.env).some(key =>
          key.includes('PG') || key.includes('DATABASE') || key.includes('DB_')
        ),
        totalEnvVars: Object.keys(process.env).length
      }
    });

  } catch (error) {
    console.error('❌ Environment test error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Clear users and create root user
router.post('/setup-root', async (req, res) => {
  try {
    console.log('🗑️ Clearing users table and creating root user...');

    // Clear all users
    await query('DELETE FROM users');
    console.log('✅ All users deleted');

    // Create root user with simple credentials
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('root', 12);

    const result = await query(
      `INSERT INTO users (email, password_hash, name, timezone, created_at, updated_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id, email, name, created_at`,
      ['root', hashedPassword, 'Root User', 'UTC']
    );

    console.log('✅ Root user created:', result.rows[0]);

    res.json({
      success: true,
      message: 'Root user setup completed',
      user: result.rows[0],
      credentials: {
        email: 'root',
        password: 'root'
      }
    });

  } catch (error) {
    console.error('❌ Root setup error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Test login endpoint with detailed logging
router.post('/test-login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('🧪 Admin test login:', { email, hasPassword: !!password });

    // Import auth controller for testing
    const User = require('../models/User');
    const { generateTokenPair } = require('../utils/jwt');

    // Step 1: Find user
    console.log('1️⃣ Finding user...');
    const user = await User.findByEmail(email);
    console.log('1️⃣ User result:', user ? {
      id: user.id,
      email: user.email,
      name: user.name,
      is_active: user.is_active
    } : 'null');

    if (!user) {
      return res.json({
        success: false,
        step: 'find_user',
        error: 'User not found',
        email: email
      });
    }

    // Step 2: Verify password
    console.log('2️⃣ Verifying password...');
    const isValidPassword = await user.verifyPassword(password);
    console.log('2️⃣ Password valid:', isValidPassword);

    if (!isValidPassword) {
      return res.json({
        success: false,
        step: 'verify_password',
        error: 'Invalid password',
        user: { id: user.id, email: user.email }
      });
    }

    // Step 3: Generate tokens
    console.log('3️⃣ Generating tokens...');
    const tokens = generateTokenPair(user);
    console.log('3️⃣ Tokens generated');

    // Step 4: Update last active
    console.log('4️⃣ Updating last active...');
    await user.updateLastActive();
    console.log('4️⃣ Last active updated');

    res.json({
      success: true,
      message: 'Test login successful',
      user: user.toJSON(),
      tokens: {
        hasAccessToken: !!tokens.access_token,
        hasRefreshToken: !!tokens.refresh_token,
        tokenLength: tokens.access_token?.length || 0
      }
    });

  } catch (error) {
    console.error('🧪 Test login error:', error);
    res.json({
      success: false,
      step: 'unknown',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Fix database schema - add missing columns with proper verification
router.post('/fix-schema', async (req, res) => {
  try {
    console.log('🔧 Fixing database schema...');

    // First, check current table structure
    console.log('📋 Checking current table structure...');
    const currentColumns = await query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);

    console.log('📋 Current users table columns:');
    currentColumns.rows.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });

    // Define required columns
    const requiredColumns = [
      {
        name: 'is_active',
        sql: 'ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT true',
        check: 'SELECT column_name FROM information_schema.columns WHERE table_name = \'users\' AND column_name = \'is_active\''
      },
      {
        name: 'email_verified',
        sql: 'ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT false',
        check: 'SELECT column_name FROM information_schema.columns WHERE table_name = \'users\' AND column_name = \'email_verified\''
      },
      {
        name: 'last_active',
        sql: 'ALTER TABLE users ADD COLUMN last_active TIMESTAMP WITH TIME ZONE',
        check: 'SELECT column_name FROM information_schema.columns WHERE table_name = \'users\' AND column_name = \'last_active\''
      },
      {
        name: 'password_reset_token',
        sql: 'ALTER TABLE users ADD COLUMN password_reset_token VARCHAR(255)',
        check: 'SELECT column_name FROM information_schema.columns WHERE table_name = \'users\' AND column_name = \'password_reset_token\''
      },
      {
        name: 'password_reset_expires',
        sql: 'ALTER TABLE users ADD COLUMN password_reset_expires TIMESTAMP WITH TIME ZONE',
        check: 'SELECT column_name FROM information_schema.columns WHERE table_name = \'users\' AND column_name = \'password_reset_expires\''
      }
    ];

    const results = [];

    for (const column of requiredColumns) {
      try {
        // Check if column already exists
        console.log(`🔍 Checking if column ${column.name} exists...`);
        const checkResult = await query(column.check);

        if (checkResult.rows.length > 0) {
          console.log(`✅ Column ${column.name} already exists`);
          results.push({ column: column.name, status: 'already_exists' });
        } else {
          console.log(`➕ Adding column: ${column.name}`);
          await query(column.sql);

          // Verify the column was actually added
          const verifyResult = await query(column.check);
          if (verifyResult.rows.length > 0) {
            console.log(`✅ Successfully added column: ${column.name}`);
            results.push({ column: column.name, status: 'added_successfully' });
          } else {
            console.log(`❌ Failed to add column: ${column.name}`);
            results.push({ column: column.name, status: 'failed_to_add' });
          }
        }
      } catch (error) {
        console.log(`⚠️ Column ${column.name} error:`, error.message);
        results.push({ column: column.name, status: 'error', error: error.message });
      }
    }

    // Update existing users to have proper defaults (only for columns that exist)
    try {
      const isActiveExists = results.find(r => r.column === 'is_active')?.status === 'added_successfully' ||
                            results.find(r => r.column === 'is_active')?.status === 'already_exists';
      const emailVerifiedExists = results.find(r => r.column === 'email_verified')?.status === 'added_successfully' ||
                                 results.find(r => r.column === 'email_verified')?.status === 'already_exists';

      if (isActiveExists) {
        await query('UPDATE users SET is_active = true WHERE is_active IS NULL');
        console.log('✅ Updated is_active defaults');
      }

      if (emailVerifiedExists) {
        await query('UPDATE users SET email_verified = false WHERE email_verified IS NULL');
        console.log('✅ Updated email_verified defaults');
      }
    } catch (updateError) {
      console.log('⚠️ Error updating defaults:', updateError.message);
    }

    // Final verification - check table structure again
    console.log('🔍 Final verification of table structure...');
    const finalColumns = await query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);

    console.log('✅ Schema fixes completed');

    res.json({
      success: true,
      message: 'Database schema fixed',
      fixes: results,
      verification: {
        beforeColumns: currentColumns.rows.map(c => c.column_name),
        afterColumns: finalColumns.rows.map(c => c.column_name),
        totalColumnsBefore: currentColumns.rows.length,
        totalColumnsAfter: finalColumns.rows.length
      }
    });

  } catch (error) {
    console.error('❌ Schema fix error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Fix habits table structure
router.post('/fix-habits-table', async (req, res) => {
  try {
    console.log('🔧 Fixing habits table structure...');

    // First check if habits table exists and get its structure
    const tableCheck = await query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'habits'
      ORDER BY ordinal_position
    `);

    console.log('📋 Current habits table structure:', tableCheck.rows);

    // Create or recreate habits table with proper structure
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS habits (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        color VARCHAR(7) DEFAULT '#3B82F6',
        frequency_type VARCHAR(50) DEFAULT 'daily',
        target_count INTEGER DEFAULT 1,
        difficulty_level INTEGER DEFAULT 3,
        is_active BOOLEAN DEFAULT true,
        streak_count INTEGER DEFAULT 0,
        best_streak INTEGER DEFAULT 0,
        total_completions INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    await query(createTableSQL);
    console.log('✅ Habits table created/updated');

    // Check final structure
    const finalCheck = await query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'habits'
      ORDER BY ordinal_position
    `);

    res.json({
      success: true,
      message: 'Habits table structure fixed',
      beforeStructure: tableCheck.rows,
      afterStructure: finalCheck.rows
    });

  } catch (error) {
    console.error('❌ Fix habits table error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

module.exports = router;