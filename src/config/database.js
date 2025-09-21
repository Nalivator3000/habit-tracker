const { Pool } = require('pg');
require('dotenv').config();

// Railway provides DATABASE_URL or individual DATABASE_* variables
let pool;

if (process.env.DATABASE_URL) {
  // Use DATABASE_URL connection string (Railway standard)
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
} else {
  // Fallback to individual environment variables
  pool = new Pool({
    host: process.env.DATABASE_HOST || process.env.DB_HOST || 'localhost',
    port: process.env.DATABASE_PORT || process.env.DB_PORT || 5432,
    database: process.env.DATABASE_NAME || process.env.DB_NAME || 'habit_tracker',
    user: process.env.DATABASE_USER || process.env.DB_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || process.env.DB_PASSWORD,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
}

// Connection logging and debugging
console.log('🔧 Database configuration:');
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- DATABASE_URL:', process.env.DATABASE_URL ? 'Set (using connection string)' : 'Not set');
console.log('- DATABASE_HOST:', process.env.DATABASE_HOST || 'Not set');
console.log('- DATABASE_NAME:', process.env.DATABASE_NAME || 'Not set');
console.log('- DATABASE_USER:', process.env.DATABASE_USER || 'Not set');
console.log('- DATABASE_PASSWORD:', process.env.DATABASE_PASSWORD ? 'Set' : 'Not set');

// Test connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Database connection error:', err.message);
  console.warn('⚠️ Server will continue running without database functionality');
  console.error('❌ Connection details:', {
    host: process.env.DATABASE_HOST || process.env.DB_HOST,
    database: process.env.DATABASE_NAME || process.env.DB_NAME,
    user: process.env.DATABASE_USER || process.env.DB_USER,
    hasPassword: !!(process.env.DATABASE_PASSWORD || process.env.DB_PASSWORD),
    hasUrl: !!process.env.DATABASE_URL
  });
  // Do NOT exit process - let server handle DB errors gracefully
});

// Query helper function with graceful error handling
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Query executed:', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Database query error:', error.message);
    console.warn('⚠️ Query failed - database may be unavailable');

    // Create a more informative error for API endpoints
    const dbError = new Error(`Database unavailable: ${error.message}`);
    dbError.code = 'DB_UNAVAILABLE';
    dbError.originalError = error;
    throw dbError;
  }
};

// Transaction helper with graceful error handling
const transaction = async (callback) => {
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    console.error('Transaction error:', error.message);
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Rollback error:', rollbackError.message);
      }
    }

    // Create informative error for API endpoints
    const txError = new Error(`Transaction failed: ${error.message}`);
    txError.code = 'TX_FAILED';
    txError.originalError = error;
    throw txError;
  } finally {
    if (client) {
      client.release();
    }
  }
};

// Helper to check database connectivity
const checkConnection = async () => {
  try {
    const result = await pool.query('SELECT NOW() as db_time');
    return {
      connected: true,
      time: result.rows[0].db_time,
      error: null
    };
  } catch (error) {
    return {
      connected: false,
      time: null,
      error: error.message
    };
  }
};

module.exports = {
  pool,
  query,
  transaction,
  checkConnection,
};