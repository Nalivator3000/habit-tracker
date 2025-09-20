const TelegramBot = require('node-telegram-bot-api');
const config = require('../config');
const db = require('../config/database');
const habitService = require('./habitService');

class HabitTrackerBot {
  constructor() {
    this.bot = new TelegramBot(config.telegram.botToken, { polling: true });
    this.userSessions = new Map(); // Store user states for conversations
    this.setupCommands();
    this.setupEventHandlers();
  }

  setupCommands() {
    // Bot command menu
    this.bot.setMyCommands([
      { command: 'start', description: 'Start using the habit tracker' },
      { command: 'help', description: 'Show help information' },
      { command: 'link', description: 'Link your account' },
      { command: 'habits', description: 'View your habits' },
      { command: 'today', description: 'View today\'s habits' },
      { command: 'done', description: 'Mark habit as done' },
      { command: 'skip', description: 'Skip a habit' },
      { command: 'stats', description: 'View your statistics' },
      { command: 'add', description: 'Add a new habit' },
      { command: 'settings', description: 'Bot settings' },
    ]);
  }

  setupEventHandlers() {
    // Start command
    this.bot.onText(/\/start/, (msg) => {
      this.handleStart(msg);
    });

    // Help command
    this.bot.onText(/\/help/, (msg) => {
      this.handleHelp(msg);
    });

    // Link account command
    this.bot.onText(/\/link/, (msg) => {
      this.handleLinkAccount(msg);
    });

    // View habits
    this.bot.onText(/\/habits/, (msg) => {
      this.handleViewHabits(msg);
    });

    // Today's habits
    this.bot.onText(/\/today/, (msg) => {
      this.handleTodayHabits(msg);
    });

    // Mark habit as done
    this.bot.onText(/\/done(?:\s+(.+))?/, (msg, match) => {
      this.handleMarkDone(msg, match[1]);
    });

    // Skip habit
    this.bot.onText(/\/skip(?:\s+(.+))?/, (msg, match) => {
      this.handleSkipHabit(msg, match[1]);
    });

    // View statistics
    this.bot.onText(/\/stats/, (msg) => {
      this.handleViewStats(msg);
    });

    // Add new habit
    this.bot.onText(/\/add(?:\s+(.+))?/, (msg, match) => {
      this.handleAddHabit(msg, match[1]);
    });

    // Settings
    this.bot.onText(/\/settings/, (msg) => {
      this.handleSettings(msg);
    });

    // Handle callback queries (inline keyboard)
    this.bot.on('callback_query', (query) => {
      this.handleCallbackQuery(query);
    });

    // Handle text messages (for conversations)
    this.bot.on('message', (msg) => {
      if (!msg.text.startsWith('/')) {
        this.handleTextMessage(msg);
      }
    });

    // Error handling
    this.bot.on('error', (error) => {
      console.error('Telegram Bot Error:', error);
    });
  }

  async handleStart(msg) {
    const chatId = msg.chat.id;
    const user = await this.getLinkedUser(msg.from.id);

    if (user) {
      const message = `Welcome back, ${user.name}! 👋

I'm your personal habit tracker bot. Here's what I can help you with:

🎯 Track your daily habits
📊 View your progress and statistics
✅ Mark habits as complete
⏭️ Skip habits when needed
📈 Add new habits

Use /today to see today's habits or /help for more commands.`;

      await this.bot.sendMessage(chatId, message, {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '📋 Today\'s Habits', callback_data: 'today_habits' },
              { text: '📊 My Stats', callback_data: 'view_stats' }
            ],
            [
              { text: '➕ Add Habit', callback_data: 'add_habit' },
              { text: '⚙️ Settings', callback_data: 'settings' }
            ]
          ]
        }
      });
    } else {
      const message = `Welcome to Habit Tracker! 🎯

I'll help you build and maintain better habits. To get started, you need to link your account.

If you don't have an account yet, please:
1. Visit our web app to create an account
2. Come back and use /link to connect your account

If you already have an account, use /link to get started!`;

      await this.bot.sendMessage(chatId, message, {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔗 Link Account', callback_data: 'link_account' }],
            [{ text: '❓ Help', callback_data: 'help' }]
          ]
        }
      });
    }
  }

  async handleHelp(msg) {
    const chatId = msg.chat.id;
    const helpMessage = `🤖 *Habit Tracker Bot Commands*

*Basic Commands:*
/start - Start or restart the bot
/help - Show this help message
/link - Link your account

*Habit Management:*
/habits - View all your habits
/today - View today's habits
/done [habit] - Mark habit as completed
/skip [habit] - Skip a habit for today
/add [habit] - Add a new habit

*Statistics:*
/stats - View your progress statistics

*Settings:*
/settings - Configure bot preferences

*Quick Tips:*
• Use inline keyboards for faster actions
• You can type habit names or select from buttons
• Daily reminders can be set up in settings

Need more help? Contact support through our web app.`;

    await this.bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
  }

  async handleLinkAccount(msg) {
    const chatId = msg.chat.id;
    const telegramId = msg.from.id;

    // Check if already linked
    const existingUser = await this.getLinkedUser(telegramId);
    if (existingUser) {
      await this.bot.sendMessage(chatId, `You're already linked to account: ${existingUser.name} (${existingUser.email})`);
      return;
    }

    // Generate temporary link code
    const linkCode = this.generateLinkCode();
    this.storeLinkCode(telegramId, linkCode);

    const message = `🔗 *Account Linking*

To link your Telegram account:

1. Go to your web app settings
2. Navigate to "Telegram Integration"
3. Enter this code: \`${linkCode}\`
4. Click "Link Account"

This code expires in 10 minutes.

Alternatively, if you know your account email, reply with it and I'll help you link directly.`;

    await this.bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: {
        force_reply: true,
        input_field_placeholder: 'Enter your account email...'
      }
    });

    // Set user state for email linking
    this.userSessions.set(telegramId, { action: 'linking_email' });
  }

  async handleViewHabits(msg) {
    const chatId = msg.chat.id;
    const user = await this.getLinkedUser(msg.from.id);

    if (!user) {
      await this.sendNotLinkedMessage(chatId);
      return;
    }

    try {
      const habits = await habitService.getUserHabits(user.id, { is_active: true });

      if (habits.length === 0) {
        await this.bot.sendMessage(chatId, `You don't have any habits yet!

Use /add to create your first habit.`, {
          reply_markup: {
            inline_keyboard: [[{ text: '➕ Add Habit', callback_data: 'add_habit' }]]
          }
        });
        return;
      }

      let message = `📋 *Your Habits* (${habits.length})\n\n`;

      habits.forEach((habit, index) => {
        const streakEmoji = habit.streak_count > 0 ? '🔥' : '⭕';
        message += `${index + 1}. ${habit.name}\n`;
        message += `   ${streakEmoji} Streak: ${habit.streak_count} days\n`;
        message += `   📊 ${this.getFrequencyText(habit)}\n\n`;
      });

      const keyboard = this.createHabitsKeyboard(habits);

      await this.bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
      });

    } catch (error) {
      console.error('Error fetching habits:', error);
      await this.bot.sendMessage(chatId, 'Sorry, I couldn\'t fetch your habits right now. Please try again later.');
    }
  }

  async handleTodayHabits(msg) {
    const chatId = msg.chat.id;
    const user = await this.getLinkedUser(msg.from.id);

    if (!user) {
      await this.sendNotLinkedMessage(chatId);
      return;
    }

    try {
      const todayData = await habitService.getTodayProgress(user.id);
      const { pending_habits, completed_habits, completion_rate } = todayData;

      let message = `📅 *Today's Habits*\n\n`;
      message += `📊 Progress: ${Math.round(completion_rate)}% (${completed_habits.length}/${pending_habits.length + completed_habits.length})\n\n`;

      if (pending_habits.length > 0) {
        message += `⏳ *Pending:*\n`;
        pending_habits.forEach((habit, index) => {
          message += `${index + 1}. ${habit.name}\n`;
        });
        message += '\n';
      }

      if (completed_habits.length > 0) {
        message += `✅ *Completed:*\n`;
        completed_habits.forEach((habit, index) => {
          message += `${index + 1}. ${habit.name} ✓\n`;
        });
      }

      const keyboard = [];
      if (pending_habits.length > 0) {
        keyboard.push([{ text: '✅ Mark All Done', callback_data: 'mark_all_done' }]);

        // Add quick action buttons for first few habits
        const quickHabits = pending_habits.slice(0, 3);
        quickHabits.forEach(habit => {
          keyboard.push([
            { text: `✅ ${habit.name}`, callback_data: `done_${habit.id}` },
            { text: `⏭️ Skip`, callback_data: `skip_${habit.id}` }
          ]);
        });
      }

      keyboard.push([{ text: '📊 View Stats', callback_data: 'view_stats' }]);

      await this.bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
      });

    } catch (error) {
      console.error('Error fetching today habits:', error);
      await this.bot.sendMessage(chatId, 'Sorry, I couldn\'t fetch today\'s habits. Please try again later.');
    }
  }

  async handleMarkDone(msg, habitName) {
    const chatId = msg.chat.id;
    const user = await this.getLinkedUser(msg.from.id);

    if (!user) {
      await this.sendNotLinkedMessage(chatId);
      return;
    }

    if (!habitName) {
      // Show habits to select from
      await this.showHabitsForAction(chatId, user.id, 'done', 'Select a habit to mark as done:');
      return;
    }

    try {
      const habit = await this.findHabitByName(user.id, habitName);
      if (!habit) {
        await this.bot.sendMessage(chatId, `Habit "${habitName}" not found. Use /habits to see your habits.`);
        return;
      }

      await habitService.logHabitCompletion(habit.id, user.id, {
        status: 'completed',
        date: new Date().toISOString().split('T')[0]
      });

      await this.bot.sendMessage(chatId, `✅ Great job! "${habit.name}" marked as completed!

🔥 Current streak: ${habit.streak_count + 1} days`, {
        reply_markup: {
          inline_keyboard: [
            [{ text: '📋 Today\'s Habits', callback_data: 'today_habits' }],
            [{ text: '📊 View Stats', callback_data: 'view_stats' }]
          ]
        }
      });

    } catch (error) {
      console.error('Error marking habit done:', error);
      await this.bot.sendMessage(chatId, 'Sorry, I couldn\'t mark the habit as done. Please try again.');
    }
  }

  async handleCallbackQuery(query) {
    const chatId = query.message.chat.id;
    const data = query.data;

    // Acknowledge the callback query
    await this.bot.answerCallbackQuery(query.id);

    try {
      if (data === 'today_habits') {
        await this.handleTodayHabits({ chat: { id: chatId }, from: query.from });
      } else if (data === 'view_stats') {
        await this.handleViewStats({ chat: { id: chatId }, from: query.from });
      } else if (data === 'add_habit') {
        await this.handleAddHabit({ chat: { id: chatId }, from: query.from });
      } else if (data === 'link_account') {
        await this.handleLinkAccount({ chat: { id: chatId }, from: query.from });
      } else if (data === 'help') {
        await this.handleHelp({ chat: { id: chatId } });
      } else if (data.startsWith('done_')) {
        const habitId = data.replace('done_', '');
        await this.markHabitDone(chatId, query.from.id, habitId);
      } else if (data.startsWith('skip_')) {
        const habitId = data.replace('skip_', '');
        await this.skipHabit(chatId, query.from.id, habitId);
      }
    } catch (error) {
      console.error('Error handling callback query:', error);
      await this.bot.sendMessage(chatId, 'Sorry, something went wrong. Please try again.');
    }
  }

  // Helper methods
  async getLinkedUser(telegramId) {
    try {
      const result = await db.query(
        'SELECT * FROM users WHERE telegram_id = $1',
        [telegramId]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting linked user:', error);
      return null;
    }
  }

  async sendNotLinkedMessage(chatId) {
    await this.bot.sendMessage(chatId, `🔗 You need to link your account first!

Use /link to connect your Telegram account with your habit tracker account.`, {
      reply_markup: {
        inline_keyboard: [[{ text: '🔗 Link Account', callback_data: 'link_account' }]]
      }
    });
  }

  generateLinkCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  storeLinkCode(telegramId, code) {
    // In production, store this in Redis or database with expiration
    this.userSessions.set(`link_${telegramId}`, {
      code,
      expires: Date.now() + 10 * 60 * 1000 // 10 minutes
    });
  }

  getFrequencyText(habit) {
    switch (habit.frequency_type) {
      case 'daily':
        return habit.frequency_value === 1 ? 'Daily' : `${habit.frequency_value}x daily`;
      case 'weekly':
        return habit.frequency_value === 1 ? 'Weekly' : `${habit.frequency_value}x weekly`;
      case 'monthly':
        return 'Monthly';
      case 'custom':
        return `Every ${habit.frequency_value} days`;
      default:
        return 'Daily';
    }
  }

  createHabitsKeyboard(habits) {
    const keyboard = [];
    habits.slice(0, 5).forEach(habit => {
      keyboard.push([
        { text: `✅ ${habit.name}`, callback_data: `done_${habit.id}` },
        { text: `📊 Stats`, callback_data: `stats_${habit.id}` }
      ]);
    });

    keyboard.push([
      { text: '📋 Today\'s Habits', callback_data: 'today_habits' },
      { text: '➕ Add Habit', callback_data: 'add_habit' }
    ]);

    return keyboard;
  }

  start() {
    console.log('🤖 Telegram Habit Tracker Bot started');
  }

  stop() {
    this.bot.stopPolling();
    console.log('🤖 Telegram Bot stopped');
  }
}

// Initialize and export bot
const habitTrackerBot = new HabitTrackerBot();

module.exports = habitTrackerBot;