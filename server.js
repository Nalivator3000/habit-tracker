const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const config = require('./src/config');

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
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
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
    uptime: process.uptime(),
  });
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

// Serve frontend for any non-API routes
app.get('*', (req, res) => {
  // If it's not an API route and not a static file, serve index.html
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  } else {
    res.status(404).json({
      error: 'API route not found',
      message: `Cannot ${req.method} ${req.originalUrl}`,
    });
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

// Start server
const PORT = process.env.PORT || config.port || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Habit Tracker API running on port ${PORT}`);
  console.log(`📊 Environment: ${config.nodeEnv}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});

module.exports = app;