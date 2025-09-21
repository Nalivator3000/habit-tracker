const { body, validationResult } = require('express-validator');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value,
      })),
    });
  }
  next();
};

// User registration validation
const validateRegistration = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),

  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),

  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),

  body('timezone')
    .optional()
    .isString()
    .withMessage('Timezone must be a valid string'),

  handleValidationErrors,
];

// User login validation (simplified for root user)
const validateLogin = [
  body('email')
    .notEmpty()
    .withMessage('Email/username is required'),

  body('password')
    .notEmpty()
    .withMessage('Password is required'),

  handleValidationErrors,
];

// Password reset request validation
const validatePasswordResetRequest = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),

  handleValidationErrors,
];

// Password reset validation
const validatePasswordReset = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),

  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),

  handleValidationErrors,
];

// Habit validation
const validateHabit = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Habit name must be between 1 and 200 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),

  body('frequency_type')
    .isIn(['daily', 'weekly', 'monthly', 'custom'])
    .withMessage('Frequency type must be daily, weekly, monthly, or custom'),

  body('frequency_value')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Frequency value must be a positive integer'),

  body('target_count')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Target count must be a positive integer'),

  body('color')
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage('Color must be a valid hex color code'),

  body('difficulty_level')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Difficulty level must be between 1 and 5'),

  handleValidationErrors,
];

// Habit log validation
const validateHabitLog = [
  body('status')
    .isIn(['completed', 'partial', 'skipped', 'failed'])
    .withMessage('Status must be completed, partial, skipped, or failed'),

  body('completion_count')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Completion count must be a non-negative integer'),

  body('quality_rating')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Quality rating must be between 1 and 10'),

  body('mood_before')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Mood before must be between 1 and 10'),

  body('mood_after')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Mood after must be between 1 and 10'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters'),

  handleValidationErrors,
];

// Custom metric validation
const validateCustomMetric = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Metric name must be between 1 and 100 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),

  body('scale_min')
    .optional()
    .isInt()
    .withMessage('Scale minimum must be an integer'),

  body('scale_max')
    .optional()
    .isInt()
    .withMessage('Scale maximum must be an integer'),

  body('scale_type')
    .optional()
    .isIn(['numeric', 'boolean', 'text'])
    .withMessage('Scale type must be numeric, boolean, or text'),

  body('unit')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Unit cannot exceed 20 characters'),

  handleValidationErrors,
];

module.exports = {
  handleValidationErrors,
  validateRegistration,
  validateLogin,
  validatePasswordResetRequest,
  validatePasswordReset,
  validateHabit,
  validateHabitLog,
  validateCustomMetric,
};