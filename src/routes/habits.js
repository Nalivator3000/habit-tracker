const express = require('express');
const router = express.Router();

const habitController = require('../controllers/habitController');
const habitLogController = require('../controllers/habitLogController');
const { authenticateToken } = require('../middleware/auth');
const { validateHabit, validateHabitLog } = require('../middleware/validation');

// All habit routes require authentication
router.use(authenticateToken);

// Habit endpoints info
router.get('/', habitController.getHabits);

// Habit CRUD operations
router.post('/', validateHabit, habitController.createHabit);
router.get('/overview', habitController.getHabitOverview);
router.get('/:id', habitController.getHabit);
router.put('/:id', validateHabit, habitController.updateHabit);
router.delete('/:id', habitController.deleteHabit);

// Habit statistics
router.get('/:id/stats', habitController.getHabitStats);

// Restore archived habit
router.post('/:id/restore', habitController.restoreHabit);

// Habit logging routes
router.post('/:habitId/log', validateHabitLog, habitLogController.logHabitCompletion);
router.get('/:habitId/logs', habitLogController.getHabitLogs);

// Individual log operations
router.get('/logs/:logId', habitLogController.getHabitLog);
router.put('/logs/:logId', validateHabitLog, habitLogController.updateHabitLog);
router.delete('/logs/:logId', habitLogController.deleteHabitLog);

// User log summaries
router.get('/logs', habitLogController.getAllUserLogs);
router.get('/logs/today', habitLogController.getTodayLogs);
router.get('/logs/weekly', habitLogController.getWeeklySummary);

module.exports = router;