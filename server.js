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

// Serve static files with proper handling
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint with graceful database handling
app.get('/health', async (req, res) => {
  const { checkConnection } = require('./src/config/database');

  // Always return basic server health
  const baseResponse = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
    uptime: process.uptime(),
    config: {
      hasDbUrl: !!process.env.DATABASE_URL,
      hasDbHost: !!process.env.DATABASE_HOST,
      hasDbPassword: !!process.env.DATABASE_PASSWORD,
      hasPgHost: !!process.env.PGHOST,
      hasPgDatabase: !!process.env.PGDATABASE,
      hasPgUser: !!process.env.PGUSER,
      hasPgPassword: !!process.env.PGPASSWORD,
      nodeEnv: process.env.NODE_ENV
    }
  };

  // Test database connection without failing the endpoint
  const dbStatus = await checkConnection();

  if (dbStatus.connected) {
    res.status(200).json({
      ...baseResponse,
      database: {
        status: 'connected',
        time: dbStatus.time
      }
    });
  } else {
    // Server is healthy, database is not - return 200 with warning
    res.status(200).json({
      ...baseResponse,
      status: 'PARTIAL',
      database: {
        status: 'disconnected',
        error: dbStatus.error
      },
      warning: 'Database unavailable - server running with limited functionality'
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
    version: '1.2.0',
    build: 'HABIT-TRACKER-2025.09.21-17:50',
    commit: '60fd97c',
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
      admin: {
        'POST /api/admin/setup-root': 'Setup root user',
        'POST /api/admin/create-admin': 'Create admin user',
        'POST /api/admin/init-database': 'Initialize database',
        'GET /api/admin/test-env': 'Test environment variables',
        'GET /api/admin/test-tables': 'Test database tables',
        'GET /api/admin/test-queries': 'Test database queries',
        'GET /api/admin/test-db': 'Test database connection',
      },
      system: {
        'GET /health': 'Health check',
        'GET /api': 'API information',
        'GET /env-debug.html': 'Debug interface',
      }
    },
    documentation: 'https://github.com/Nalivator3000/habit-tracker',
    timestamp: new Date().toISOString(),
  });
});

// Direct route for database testing interface
app.get('/db-test', (req, res) => {
  console.log('🧪 DB-TEST: Serving db-test.html');
  res.sendFile(path.join(__dirname, 'public', 'db-test.html'));
});

app.get('/db-test.html', (req, res) => {
  console.log('🧪 DB-TEST: Serving db-test.html via .html route');
  res.sendFile(path.join(__dirname, 'public', 'db-test.html'));
});

// Embedded testing interface route
app.get('/test-db-interface', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Database Testing Interface</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; color: #333; padding: 2rem; }
        .container { max-width: 1200px; margin: 0 auto; background: rgba(255, 255, 255, 0.95); border-radius: 15px; padding: 2rem; backdrop-filter: blur(10px); }
        h1 { color: #4a5568; margin-bottom: 2rem; text-align: center; }
        .test-button { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 16px; margin: 10px; transition: transform 0.2s; }
        .test-button:hover { transform: translateY(-2px); }
        .results { background: #f8f9fa; padding: 1rem; border-radius: 8px; margin-top: 1rem; max-height: 500px; overflow-y: auto; }
        .test-result { margin: 1rem 0; padding: 1rem; border-radius: 6px; border-left: 4px solid #10B981; }
        .test-result.error { border-left-color: #EF4444; background: #FEE2E2; }
        .test-result.success { border-left-color: #10B981; background: #D1FAE5; }
        .test-data { background: #ffffff; padding: 1rem; border-radius: 4px; margin-top: 0.5rem; font-family: 'Courier New', monospace; font-size: 14px; max-height: 300px; overflow-y: auto; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🧪 Database Testing Interface</h1>

        <div style="margin-bottom: 2rem;">
            <button class="test-button" onclick="runAllTests()">🚀 Run All Tests</button>
            <button class="test-button" onclick="runDatabaseTest()">📊 Database Structure</button>
            <button class="test-button" onclick="testHabitLogging()">✅ Test Habit Logging</button>
            <button class="test-button" onclick="testUndoFunctionality()">↶ Test Undo Functionality</button>
            <button class="test-button" onclick="testHabitCRUD()">🔄 Test CRUD Operations</button>
            <button class="test-button" onclick="resetDatabase()">🧹 Reset Database</button>
            <button class="test-button" onclick="clearResults()">🗑️ Clear Results</button>
        </div>

        <div class="results" id="results">
            <p>Click a test button to start testing...</p>
        </div>
    </div>

    <script>
        const API_BASE = '/api/habits';
        let testResults = [];

        async function fetchAPI(endpoint, options = {}) {
            const response = await fetch(API_BASE + endpoint, {
                headers: { 'Content-Type': 'application/json' },
                ...options
            });
            if (!response.ok) throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
            return await response.json();
        }

        function addResult(title, status, data = null) {
            testResults.push({ title, status, data, timestamp: new Date().toISOString() });
            renderResults();
        }

        function renderResults() {
            const container = document.getElementById('results');
            if (testResults.length === 0) {
                container.innerHTML = '<p>Click a test button to start testing...</p>';
                return;
            }
            container.innerHTML = testResults.map(result => \`
                <div class="test-result \${result.status}">
                    <div><strong>\${result.title}</strong> <small>(\${new Date(result.timestamp).toLocaleTimeString()})</small></div>
                    \${result.data ? \`<div class="test-data">\${JSON.stringify(result.data, null, 2)}</div>\` : ''}
                </div>
            \`).join('');
            container.scrollTop = container.scrollHeight;
        }

        async function runDatabaseTest() {
            addResult('Database Structure Test', 'loading');
            try {
                const response = await fetchAPI('/db-test');
                addResult('Database Structure Test ✅', 'success', response);
            } catch (error) {
                addResult('Database Structure Test ❌', 'error', { error: error.message });
            }
        }

        async function testHabitLogging() {
            addResult('Habit Logging Test', 'loading');
            try {
                const response = await fetchAPI('/1/log', {
                    method: 'POST',
                    body: JSON.stringify({
                        date: new Date().toISOString().split('T')[0],
                        status: 'completed',
                        completion_count: 1,
                        notes: 'Test from embedded interface'
                    })
                });
                addResult('Habit Logging Test ✅', 'success', response);
            } catch (error) {
                addResult('Habit Logging Test ❌', 'error', { error: error.message });
            }
        }

        async function testUndoFunctionality() {
            addResult('Undo Functionality Test', 'loading');

            try {
                // Step 1: First log a habit completion
                addResult('Step 1: Logging habit completion...', 'loading');
                const logResponse = await fetchAPI('/1/log', {
                    method: 'POST',
                    body: JSON.stringify({
                        date: new Date().toISOString().split('T')[0],
                        status: 'completed',
                        completion_count: 1,
                        notes: 'Test for undo functionality'
                    })
                });

                if (logResponse.success) {
                    addResult('Step 1: Habit logged ✅', 'success', logResponse);

                    // Step 2: Wait a bit then undo the habit
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    addResult('Step 2: Testing undo...', 'loading');

                    const undoResponse = await fetchAPI('/1/log', {
                        method: 'DELETE'
                    });

                    if (undoResponse.success) {
                        addResult('Step 2: Undo successful ✅', 'success', undoResponse);
                        addResult('Undo Functionality Test ✅', 'success', {
                            message: 'Complete undo flow working correctly',
                            loggedData: logResponse,
                            undoData: undoResponse
                        });
                    } else {
                        addResult('Undo Functionality Test ❌', 'error', {
                            error: 'Undo failed',
                            response: undoResponse
                        });
                    }
                } else {
                    addResult('Undo Functionality Test ❌', 'error', {
                        error: 'Initial logging failed',
                        response: logResponse
                    });
                }

            } catch (error) {
                addResult('Undo Functionality Test ❌', 'error', { error: error.message });
            }
        }

        async function testHabitCRUD() {
            addResult('CRUD Operations Test', 'loading');
            try {
                const getResponse = await fetchAPI('/');
                addResult('GET Habits ✅', 'success', { count: getResponse.habits.length, habits: getResponse.habits });

                const todayResponse = await fetchAPI('/logs/today');
                addResult('GET Today Logs ✅', 'success', { count: todayResponse.count, logs: todayResponse.logs });
            } catch (error) {
                addResult('CRUD Operations Test ❌', 'error', { error: error.message });
            }
        }

        async function resetDatabase() {
            if (!confirm('Are you sure you want to reset the entire database?')) return;
            addResult('Database Reset', 'loading');
            try {
                const response = await fetchAPI('/reset-database', { method: 'POST' });
                addResult('Database Reset ✅', 'success', response);
                setTimeout(runDatabaseTest, 2000);
            } catch (error) {
                addResult('Database Reset ❌', 'error', { error: error.message });
            }
        }

        async function runAllTests() {
            testResults = [];
            addResult('Starting comprehensive test suite...', 'loading');
            await runDatabaseTest();
            await new Promise(resolve => setTimeout(resolve, 1000));
            await testHabitCRUD();
            await new Promise(resolve => setTimeout(resolve, 1000));
            await testHabitLogging();
            await new Promise(resolve => setTimeout(resolve, 1000));
            await testUndoFunctionality();
            addResult('All tests completed! 🎉', 'success');
        }

        function clearResults() {
            testResults = [];
            renderResults();
        }

        renderResults();
    </script>
</body>
</html>
  `);
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
    // For non-API routes, only serve index.html for root or unknown routes
    // Let express.static handle actual files
    if (req.path === '/' || req.path === '') {
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    } else {
      // 404 for other non-existent routes
      res.status(404).send('Not Found');
    }
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