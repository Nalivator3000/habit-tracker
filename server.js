const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const config = require('./src/config');
const { initializeDatabase } = require('./src/config/initDatabase');

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      scriptSrcAttr: ["'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api', limiter);

// CORS
app.use(cors({
  origin: config.cors.origin,
  credentials: true,
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Test database connection
    const { pool } = require('./src/config/database');
    const dbResult = await pool.query('SELECT NOW() as db_time');

    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      environment: config.nodeEnv,
      uptime: process.uptime(),
      database: {
        status: 'connected',
        time: dbResult.rows[0].db_time
      }
    });
  } catch (dbError) {
    res.status(503).json({
      status: 'PARTIAL',
      timestamp: new Date().toISOString(),
      environment: config.nodeEnv,
      uptime: process.uptime(),
      database: {
        status: 'disconnected',
        error: dbError.message
      }
    });
  }
});

// Database debug endpoint
app.get('/debug/database', async (req, res) => {
  try {
    const { pool } = require('./src/config/database');

    // Get database info
    const versionResult = await pool.query('SELECT version() as version');
    const tablesResult = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    // Get table row counts
    const tables = tablesResult.rows.map(row => row.table_name);
    const counts = {};

    for (const table of tables) {
      try {
        const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
        counts[table] = parseInt(countResult.rows[0].count);
      } catch (error) {
        counts[table] = `Error: ${error.message}`;
      }
    }

    res.json({
      database: {
        version: versionResult.rows[0].version,
        tables: tables,
        counts: counts,
        environment: {
          DATABASE_HOST: process.env.DATABASE_HOST ? '✓ Set' : '✗ Missing',
          DATABASE_PORT: process.env.DATABASE_PORT ? '✓ Set' : '✗ Missing',
          DATABASE_NAME: process.env.DATABASE_NAME ? '✓ Set' : '✗ Missing',
          DATABASE_USER: process.env.DATABASE_USER ? '✓ Set' : '✗ Missing',
          DATABASE_PASSWORD: process.env.DATABASE_PASSWORD ? '✓ Set' : '✗ Missing',
          DB_HOST: process.env.DB_HOST ? '✓ Set' : '✗ Missing',
          DB_NAME: process.env.DB_NAME ? '✓ Set' : '✗ Missing',
          NODE_ENV: process.env.NODE_ENV || 'not set'
        }
      }
    });

  } catch (error) {
    res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
    });
  }
});

// API info endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'Habit Tracker API',
    version: '1.0.0',
    description: 'Cross-platform habit tracking application API',
    endpoints: {
      authentication: {
        'POST /api/auth/register': 'Register new user',
        'POST /api/auth/login': 'User login',
        'GET /api/auth/profile': 'Get user profile',
        'PUT /api/auth/profile': 'Update user profile',
      },
      habits: {
        'GET /api/habits': 'Get user habits',
        'POST /api/habits': 'Create new habit',
        'GET /api/habits/:id': 'Get specific habit',
        'PUT /api/habits/:id': 'Update habit',
        'DELETE /api/habits/:id': 'Delete habit',
        'GET /api/habits/overview': 'Get habits overview',
      },
      logging: {
        'POST /api/habits/:id/log': 'Log habit completion',
        'GET /api/habits/:id/logs': 'Get habit logs',
        'GET /api/habits/logs/today': 'Get today\'s logs',
        'PUT /api/habits/logs/:id': 'Update habit log',
        'DELETE /api/habits/logs/:id': 'Delete habit log',
      },
      system: {
        'GET /health': 'Health check',
        'GET /api': 'API information',
      }
    },
    documentation: 'https://github.com/Nalivator3000/habit-tracker',
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.use('/api', require('./src/routes'));

// Catch-all handler - serve frontend or API 404
app.use((req, res) => {
  // If it's an API route that wasn't handled, return 404 JSON
  if (req.path.startsWith('/api')) {
    res.status(404).json({
      error: 'API route not found',
      message: `Cannot ${req.method} ${req.originalUrl}`,
    });
  } else {
    // Serve frontend for non-API routes
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);

  const status = err.status || err.statusCode || 500;
  const message = config.nodeEnv === 'production'
    ? 'Internal server error'
    : err.message;

  res.status(status).json({
    error: message,
    ...(config.nodeEnv !== 'production' && { stack: err.stack }),
  });
});

// Start server with database initialization
const PORT = process.env.PORT || config.port || 3000;

async function startServer() {
  try {
    // Initialize database first
    const dbInitialized = await initializeDatabase();

    if (!dbInitialized) {
      console.error('⚠️ Database initialization failed, but continuing to start server...');
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Habit Tracker API running on port ${PORT}`);
      console.log(`📊 Environment: ${config.nodeEnv}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
      console.log(`🎯 Web app: http://localhost:${PORT}/app.html`);
      console.log(`🔧 Admin setup: http://localhost:${PORT}/admin-setup.html`);
    });

  } catch (error) {
    console.error('💥 Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;