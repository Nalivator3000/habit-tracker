const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');

// Skip detailed test logging in production
const isProduction = process.env.NODE_ENV === 'production';

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for logs
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;

    if (Object.keys(meta).length > 0) {
      log += ` | Meta: ${JSON.stringify(meta)}`;
    }

    if (stack) {
      log += `\nStack: ${stack}`;
    }

    return log;
  })
);

// Create transport for daily rotating files
const createDailyRotateTransport = (filename, level = 'info') => {
  return new DailyRotateFile({
    filename: path.join(logsDir, `${filename}-%DATE%.log`),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d', // Keep logs for 14 days
    level: level,
    format: logFormat,
    auditFile: path.join(logsDir, `${filename}-audit.json`)
  });
};

// Configure winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    // Console transport (only in development)
    ...(process.env.NODE_ENV === 'development' ? [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple(),
          winston.format.printf(({ timestamp, level, message, ...meta }) => {
            let log = `${timestamp} [${level}]: ${message}`;
            if (Object.keys(meta).length > 0) {
              log += ` ${JSON.stringify(meta)}`;
            }
            return log;
          })
        )
      })
    ] : []),

    // File transports
    createDailyRotateTransport('app', 'info'),
    createDailyRotateTransport('error', 'error'),
    createDailyRotateTransport('combined', 'debug'),

    // Test logs (only during testing)
    ...(process.env.NODE_ENV === 'test' ? [
      new winston.transports.File({
        filename: path.join(logsDir, 'test.log'),
        level: 'debug',
        format: logFormat
      })
    ] : [])
  ],

  // Handle uncaught exceptions and rejections
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'exceptions.log'),
      format: logFormat
    })
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'rejections.log'),
      format: logFormat
    })
  ]
});

// Custom logging methods for different contexts
const createContextLogger = (context) => {
  return {
    debug: (message, meta = {}) => logger.debug(message, { context, ...meta }),
    info: (message, meta = {}) => logger.info(message, { context, ...meta }),
    warn: (message, meta = {}) => logger.warn(message, { context, ...meta }),
    error: (message, meta = {}) => logger.error(message, { context, ...meta }),
  };
};

// Specialized loggers
const loggers = {
  api: createContextLogger('API'),
  database: createContextLogger('DATABASE'),
  auth: createContextLogger('AUTH'),
  habit: createContextLogger('HABIT'),
  bot: createContextLogger('BOT'),
  test: createContextLogger('TEST'),
  server: createContextLogger('SERVER')
};

// Test logging utilities (simplified in production)
const testLogger = {
  startTest: (testName, description = '') => {
    if (!isProduction) {
      logger.info(`🧪 TEST STARTED: ${testName}`, {
        context: 'TEST',
        type: 'start',
        testName,
        description,
        timestamp: new Date().toISOString()
      });
    }
  },

  endTest: (testName, result, duration, details = {}) => {
    if (!isProduction) {
      const emoji = result === 'pass' ? '✅' : '❌';
      logger.info(`${emoji} TEST ${result.toUpperCase()}: ${testName}`, {
        context: 'TEST',
        type: 'end',
        testName,
        result,
        duration,
        ...details
      });
    }
  },

  testStep: (testName, step, data = {}) => {
    if (!isProduction) {
      logger.debug(`📋 TEST STEP: ${testName} - ${step}`, {
        context: 'TEST',
        type: 'step',
        testName,
        step,
        ...data
      });
    }
  },

  assertion: (testName, assertion, result, expected, actual) => {
    if (!isProduction) {
      const emoji = result ? '✅' : '❌';
      logger.debug(`${emoji} ASSERTION: ${testName} - ${assertion}`, {
        context: 'TEST',
        type: 'assertion',
        testName,
        assertion,
        result,
        expected,
        actual
      });
    }
  }
};

// API request logging middleware
const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);

  // Log incoming request
  loggers.api.info(`📥 ${req.method} ${req.path}`, {
    requestId,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.method !== 'GET' ? req.body : undefined
  });

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const duration = Date.now() - startTime;
    const emoji = res.statusCode < 400 ? '📤' : '⚠️';

    loggers.api.info(`${emoji} ${req.method} ${req.path} - ${res.statusCode}`, {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('Content-Length')
    });

    originalEnd.call(this, chunk, encoding);
  };

  next();
};

// Database query logging
const dbLogger = {
  query: (sql, params, duration, rowCount) => {
    loggers.database.debug(`🗃️ SQL Query executed`, {
      sql: sql.substring(0, 200) + (sql.length > 200 ? '...' : ''),
      params: params ? params.slice(0, 5) : undefined,
      duration: `${duration}ms`,
      rowCount
    });
  },

  error: (sql, params, error) => {
    loggers.database.error(`❌ SQL Query failed`, {
      sql: sql.substring(0, 200) + (sql.length > 200 ? '...' : ''),
      params: params ? params.slice(0, 5) : undefined,
      error: error.message,
      stack: error.stack
    });
  },

  connection: (event, details = {}) => {
    const emoji = event === 'connect' ? '🔗' : '🔌';
    loggers.database.info(`${emoji} Database ${event}`, details);
  }
};

// Bot interaction logging
const botLogger = {
  command: (command, userId, chatId, success = true) => {
    const emoji = success ? '🤖' : '⚠️';
    loggers.bot.info(`${emoji} Bot command: ${command}`, {
      command,
      userId,
      chatId,
      success
    });
  },

  message: (type, userId, chatId, content) => {
    loggers.bot.debug(`💬 Bot ${type}`, {
      type,
      userId,
      chatId,
      content: content.substring(0, 100) + (content.length > 100 ? '...' : '')
    });
  },

  error: (error, context = {}) => {
    loggers.bot.error(`❌ Bot error: ${error.message}`, {
      error: error.message,
      stack: error.stack,
      ...context
    });
  }
};

module.exports = {
  logger,
  loggers,
  testLogger,
  requestLogger,
  dbLogger,
  botLogger,
  createContextLogger
};