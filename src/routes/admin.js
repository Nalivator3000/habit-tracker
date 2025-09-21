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

module.exports = router;