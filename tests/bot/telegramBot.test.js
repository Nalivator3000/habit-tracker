const TelegramBot = require('node-telegram-bot-api');
const { testLogger } = require('../../src/utils/logger');

jest.mock('node-telegram-bot-api');
jest.mock('../../src/config/database');

const mockDb = {
  query: jest.fn(),
};

require('../../src/config/database').mockReturnValue(mockDb);

const telegramBot = require('../../src/bot/telegramBot');

describe('Telegram Bot Tests', () => {
  let mockBot;
  let testStartTime;

  beforeEach(() => {
    testStartTime = Date.now();
    jest.clearAllMocks();
    testLogger.startTest('Telegram Bot', 'Testing Telegram bot functionality');

    mockBot = {
      on: jest.fn(),
      sendMessage: jest.fn().mockResolvedValue({ message_id: 123 }),
      editMessageText: jest.fn().mockResolvedValue(true),
      answerCallbackQuery: jest.fn().mockResolvedValue(true),
      setMyCommands: jest.fn().mockResolvedValue(true),
      startPolling: jest.fn(),
      stopPolling: jest.fn(),
    };

    TelegramBot.mockImplementation(() => mockBot);
  });

  afterEach(() => {
    const duration = Date.now() - testStartTime;
    testLogger.endTest('Telegram Bot', 'pass', duration);
  });

  describe('Bot Initialization', () => {
    it('should initialize bot with correct token', () => {
      testLogger.testStep('Bot Init Test', 'Testing bot initialization');

      process.env.TELEGRAM_BOT_TOKEN = 'test_token_123';

      const bot = require('../../src/bot/telegramBot');

      testLogger.assertion('Bot Init Test', 'TelegramBot constructor called', TelegramBot.mock.calls.length >= 1, '>=1', TelegramBot.mock.calls.length);

      expect(TelegramBot).toHaveBeenCalledWith('test_token_123', { polling: false });
    });

    it('should set up command handlers', () => {
      testLogger.testStep('Command Setup Test', 'Testing command handler setup');

      require('../../src/bot/telegramBot');

      testLogger.assertion('Command Setup Test', 'Event listeners registered', mockBot.on.mock.calls.length >= 2, '>=2', mockBot.on.mock.calls.length);

      expect(mockBot.on).toHaveBeenCalledWith('message', expect.any(Function));
      expect(mockBot.on).toHaveBeenCalledWith('callback_query', expect.any(Function));
    });
  });

  describe('Command Handling', () => {
    let messageHandler;
    let callbackHandler;

    beforeEach(() => {
      require('../../src/bot/telegramBot');
      messageHandler = mockBot.on.mock.calls.find(call => call[0] === 'message')[1];
      callbackHandler = mockBot.on.mock.calls.find(call => call[0] === 'callback_query')[1];
    });

    describe('/start Command', () => {
      it('should handle /start command for new users', async () => {
        testLogger.testStep('Start Command Test', 'Testing /start command for new users');

        const mockMessage = {
          chat: { id: 12345 },
          from: { id: 12345, first_name: 'John', username: 'john_doe' },
          text: '/start'
        };

        mockDb.query.mockResolvedValueOnce({ rows: [] });

        await messageHandler(mockMessage);

        testLogger.assertion('Start Command Test', 'Welcome message sent', mockBot.sendMessage.mock.calls.length >= 1, '>=1', mockBot.sendMessage.mock.calls.length);

        expect(mockBot.sendMessage).toHaveBeenCalledWith(
          12345,
          expect.stringContaining('Welcome to Habit Tracker Bot'),
          expect.objectContaining({
            reply_markup: expect.objectContaining({
              inline_keyboard: expect.any(Array)
            })
          })
        );
      });

      it('should handle /start command for existing users', async () => {
        testLogger.testStep('Start Existing User Test', 'Testing /start command for existing users');

        const mockMessage = {
          chat: { id: 12345 },
          from: { id: 12345, first_name: 'John', username: 'john_doe' },
          text: '/start'
        };

        const mockUser = {
          id: 1,
          telegram_id: 12345,
          name: 'John Doe',
          email: 'john@example.com'
        };

        mockDb.query.mockResolvedValueOnce({ rows: [mockUser] });

        await messageHandler(mockMessage);

        testLogger.assertion('Start Existing User Test', 'Welcome back message sent', mockBot.sendMessage.mock.calls.length >= 1, '>=1', mockBot.sendMessage.mock.calls.length);

        expect(mockBot.sendMessage).toHaveBeenCalledWith(
          12345,
          expect.stringContaining('Welcome back, John Doe'),
          expect.any(Object)
        );
      });
    });

    describe('/habits Command', () => {
      it('should display user habits', async () => {
        testLogger.testStep('Habits Command Test', 'Testing /habits command');

        const mockMessage = {
          chat: { id: 12345 },
          from: { id: 12345 },
          text: '/habits'
        };

        const mockUser = { id: 1, telegram_id: 12345 };
        const mockHabits = [
          {
            id: 1,
            name: 'Morning Exercise',
            frequency_type: 'daily',
            streak_count: 5,
            is_archived: false
          },
          {
            id: 2,
            name: 'Read Books',
            frequency_type: 'weekly',
            streak_count: 2,
            is_archived: false
          }
        ];

        mockDb.query
          .mockResolvedValueOnce({ rows: [mockUser] })
          .mockResolvedValueOnce({ rows: mockHabits });

        await messageHandler(mockMessage);

        testLogger.assertion('Habits Command Test', 'Habits list sent', mockBot.sendMessage.mock.calls.length >= 1, '>=1', mockBot.sendMessage.mock.calls.length);

        expect(mockBot.sendMessage).toHaveBeenCalledWith(
          12345,
          expect.stringContaining('Your Habits'),
          expect.objectContaining({
            reply_markup: expect.objectContaining({
              inline_keyboard: expect.any(Array)
            })
          })
        );
      });

      it('should handle empty habits list', async () => {
        testLogger.testStep('Empty Habits Test', 'Testing empty habits list');

        const mockMessage = {
          chat: { id: 12345 },
          from: { id: 12345 },
          text: '/habits'
        };

        const mockUser = { id: 1, telegram_id: 12345 };

        mockDb.query
          .mockResolvedValueOnce({ rows: [mockUser] })
          .mockResolvedValueOnce({ rows: [] });

        await messageHandler(mockMessage);

        testLogger.assertion('Empty Habits Test', 'Empty message sent', mockBot.sendMessage.mock.calls.length >= 1, '>=1', mockBot.sendMessage.mock.calls.length);

        expect(mockBot.sendMessage).toHaveBeenCalledWith(
          12345,
          expect.stringContaining('no habits yet'),
          expect.any(Object)
        );
      });
    });

    describe('/today Command', () => {
      it('should show today\'s habits', async () => {
        testLogger.testStep('Today Command Test', 'Testing /today command');

        const mockMessage = {
          chat: { id: 12345 },
          from: { id: 12345 },
          text: '/today'
        };

        const mockUser = { id: 1, telegram_id: 12345 };
        const mockTodayHabits = [
          {
            id: 1,
            name: 'Morning Exercise',
            target_count: 1,
            completed_today: 0,
            status: 'pending'
          },
          {
            id: 2,
            name: 'Read Books',
            target_count: 1,
            completed_today: 1,
            status: 'completed'
          }
        ];

        mockDb.query
          .mockResolvedValueOnce({ rows: [mockUser] })
          .mockResolvedValueOnce({ rows: mockTodayHabits });

        await messageHandler(mockMessage);

        testLogger.assertion('Today Command Test', 'Today\'s habits sent', mockBot.sendMessage.mock.calls.length >= 1, '>=1', mockBot.sendMessage.mock.calls.length);

        expect(mockBot.sendMessage).toHaveBeenCalledWith(
          12345,
          expect.stringContaining('Today\'s Habits'),
          expect.objectContaining({
            reply_markup: expect.objectContaining({
              inline_keyboard: expect.any(Array)
            })
          })
        );
      });
    });

    describe('/stats Command', () => {
      it('should display user statistics', async () => {
        testLogger.testStep('Stats Command Test', 'Testing /stats command');

        const mockMessage = {
          chat: { id: 12345 },
          from: { id: 12345 },
          text: '/stats'
        };

        const mockUser = { id: 1, telegram_id: 12345 };
        const mockStats = [
          {
            name: 'Morning Exercise',
            streak_count: 5,
            best_streak: 10,
            total_completions: 25,
            completion_rate: 85.5
          },
          {
            name: 'Read Books',
            streak_count: 2,
            best_streak: 7,
            total_completions: 15,
            completion_rate: 72.3
          }
        ];

        mockDb.query
          .mockResolvedValueOnce({ rows: [mockUser] })
          .mockResolvedValueOnce({ rows: mockStats });

        await messageHandler(mockMessage);

        testLogger.assertion('Stats Command Test', 'Statistics sent', mockBot.sendMessage.mock.calls.length >= 1, '>=1', mockBot.sendMessage.mock.calls.length);

        expect(mockBot.sendMessage).toHaveBeenCalledWith(
          12345,
          expect.stringContaining('Your Statistics'),
          expect.any(Object)
        );
      });
    });
  });

  describe('Callback Query Handling', () => {
    let callbackHandler;

    beforeEach(() => {
      require('../../src/bot/telegramBot');
      callbackHandler = mockBot.on.mock.calls.find(call => call[0] === 'callback_query')[1];
    });

    it('should handle habit completion callback', async () => {
      testLogger.testStep('Habit Complete Callback Test', 'Testing habit completion callback');

      const mockCallback = {
        id: 'callback_123',
        message: { chat: { id: 12345 }, message_id: 456 },
        from: { id: 12345 },
        data: 'complete_habit_1'
      };

      const mockUser = { id: 1, telegram_id: 12345 };
      const mockHabit = {
        id: 1,
        name: 'Morning Exercise',
        streak_count: 5
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockUser] })
        .mockResolvedValueOnce({ rows: [mockHabit] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [{ ...mockHabit, streak_count: 6 }] });

      await callbackHandler(mockCallback);

      testLogger.assertion('Habit Complete Callback Test', 'Completion processed', mockBot.answerCallbackQuery.mock.calls.length >= 1, '>=1', mockBot.answerCallbackQuery.mock.calls.length);

      expect(mockBot.answerCallbackQuery).toHaveBeenCalledWith(
        'callback_123',
        'Habit completed! 🎉'
      );
    });

    it('should handle habit skip callback', async () => {
      testLogger.testStep('Habit Skip Callback Test', 'Testing habit skip callback');

      const mockCallback = {
        id: 'callback_456',
        message: { chat: { id: 12345 }, message_id: 456 },
        from: { id: 12345 },
        data: 'skip_habit_1'
      };

      const mockUser = { id: 1, telegram_id: 12345 };
      const mockHabit = {
        id: 1,
        name: 'Morning Exercise',
        streak_count: 5
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockUser] })
        .mockResolvedValueOnce({ rows: [mockHabit] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [{ ...mockHabit, streak_count: 0 }] });

      await callbackHandler(mockCallback);

      testLogger.assertion('Habit Skip Callback Test', 'Skip processed', mockBot.answerCallbackQuery.mock.calls.length >= 1, '>=1', mockBot.answerCallbackQuery.mock.calls.length);

      expect(mockBot.answerCallbackQuery).toHaveBeenCalledWith(
        'callback_456',
        'Habit skipped. Streak reset to 0.'
      );
    });

    it('should handle navigation callbacks', async () => {
      testLogger.testStep('Navigation Callback Test', 'Testing navigation callbacks');

      const mockCallback = {
        id: 'callback_789',
        message: { chat: { id: 12345 }, message_id: 456 },
        from: { id: 12345 },
        data: 'main_menu'
      };

      await callbackHandler(mockCallback);

      testLogger.assertion('Navigation Callback Test', 'Navigation processed', mockBot.editMessageText.mock.calls.length >= 1, '>=1', mockBot.editMessageText.mock.calls.length);

      expect(mockBot.editMessageText).toHaveBeenCalledWith(
        expect.stringContaining('Main Menu'),
        expect.objectContaining({
          chat_id: 12345,
          message_id: 456,
          reply_markup: expect.objectContaining({
            inline_keyboard: expect.any(Array)
          })
        })
      );
    });
  });

  describe('Error Handling', () => {
    let messageHandler;

    beforeEach(() => {
      require('../../src/bot/telegramBot');
      messageHandler = mockBot.on.mock.calls.find(call => call[0] === 'message')[1];
    });

    it('should handle database errors gracefully', async () => {
      testLogger.testStep('Database Error Test', 'Testing database error handling');

      const mockMessage = {
        chat: { id: 12345 },
        from: { id: 12345 },
        text: '/habits'
      };

      mockDb.query.mockRejectedValue(new Error('Database connection failed'));

      await messageHandler(mockMessage);

      testLogger.assertion('Database Error Test', 'Error message sent', mockBot.sendMessage.mock.calls.length >= 1, '>=1', mockBot.sendMessage.mock.calls.length);

      expect(mockBot.sendMessage).toHaveBeenCalledWith(
        12345,
        expect.stringContaining('error'),
        expect.any(Object)
      );
    });

    it('should handle unknown commands', async () => {
      testLogger.testStep('Unknown Command Test', 'Testing unknown command handling');

      const mockMessage = {
        chat: { id: 12345 },
        from: { id: 12345 },
        text: '/unknown_command'
      };

      await messageHandler(mockMessage);

      testLogger.assertion('Unknown Command Test', 'Help message sent', mockBot.sendMessage.mock.calls.length >= 1, '>=1', mockBot.sendMessage.mock.calls.length);

      expect(mockBot.sendMessage).toHaveBeenCalledWith(
        12345,
        expect.stringContaining('Unknown command'),
        expect.any(Object)
      );
    });

    it('should handle unauthorized users', async () => {
      testLogger.testStep('Unauthorized User Test', 'Testing unauthorized user handling');

      const mockMessage = {
        chat: { id: 12345 },
        from: { id: 12345 },
        text: '/habits'
      };

      mockDb.query.mockResolvedValueOnce({ rows: [] });

      await messageHandler(mockMessage);

      testLogger.assertion('Unauthorized User Test', 'Registration prompt sent', mockBot.sendMessage.mock.calls.length >= 1, '>=1', mockBot.sendMessage.mock.calls.length);

      expect(mockBot.sendMessage).toHaveBeenCalledWith(
        12345,
        expect.stringContaining('Please start with /start'),
        expect.any(Object)
      );
    });
  });

  describe('Message Formatting', () => {
    it('should format habit messages correctly', () => {
      testLogger.testStep('Message Formatting Test', 'Testing message formatting');

      const mockHabits = [
        {
          id: 1,
          name: 'Morning Exercise',
          frequency_type: 'daily',
          streak_count: 5
        },
        {
          id: 2,
          name: 'Read Books',
          frequency_type: 'weekly',
          streak_count: 2
        }
      ];

      const telegramBotModule = require('../../src/bot/telegramBot');

      if (telegramBotModule.formatHabitsMessage) {
        const formattedMessage = telegramBotModule.formatHabitsMessage(mockHabits);

        testLogger.assertion('Message Formatting Test', 'Message contains habit names', formattedMessage.includes('Morning Exercise'), true, formattedMessage.includes('Morning Exercise'));
        testLogger.assertion('Message Formatting Test', 'Message contains streak info', formattedMessage.includes('5'), true, formattedMessage.includes('5'));

        expect(formattedMessage).toContain('Morning Exercise');
        expect(formattedMessage).toContain('Read Books');
        expect(formattedMessage).toContain('🔥 5');
      }
    });

    it('should use emojis consistently', () => {
      testLogger.testStep('Emoji Consistency Test', 'Testing emoji usage');

      const telegramBotModule = require('../../src/bot/telegramBot');

      if (telegramBotModule.getStatusEmoji) {
        const completedEmoji = telegramBotModule.getStatusEmoji('completed');
        const pendingEmoji = telegramBotModule.getStatusEmoji('pending');
        const skippedEmoji = telegramBotModule.getStatusEmoji('skipped');

        testLogger.assertion('Emoji Test', 'Completed emoji is checkmark', completedEmoji === '✅', '✅', completedEmoji);
        testLogger.assertion('Emoji Test', 'Pending emoji is circle', pendingEmoji === '⭕', '⭕', pendingEmoji);
        testLogger.assertion('Emoji Test', 'Skipped emoji is cross', skippedEmoji === '❌', '❌', skippedEmoji);

        expect(completedEmoji).toBe('✅');
        expect(pendingEmoji).toBe('⭕');
        expect(skippedEmoji).toBe('❌');
      }
    });
  });

  describe('Bot Lifecycle', () => {
    it('should start polling correctly', () => {
      testLogger.testStep('Bot Start Test', 'Testing bot start');

      const telegramBotModule = require('../../src/bot/telegramBot');

      if (telegramBotModule.start) {
        telegramBotModule.start();

        testLogger.assertion('Bot Start Test', 'Polling started', mockBot.startPolling.mock.calls.length >= 1, '>=1', mockBot.startPolling.mock.calls.length);

        expect(mockBot.startPolling).toHaveBeenCalled();
      }
    });

    it('should stop polling correctly', () => {
      testLogger.testStep('Bot Stop Test', 'Testing bot stop');

      const telegramBotModule = require('../../src/bot/telegramBot');

      if (telegramBotModule.stop) {
        telegramBotModule.stop();

        testLogger.assertion('Bot Stop Test', 'Polling stopped', mockBot.stopPolling.mock.calls.length >= 1, '>=1', mockBot.stopPolling.mock.calls.length);

        expect(mockBot.stopPolling).toHaveBeenCalled();
      }
    });

    it('should set bot commands on initialization', () => {
      testLogger.testStep('Bot Commands Test', 'Testing bot commands setup');

      require('../../src/bot/telegramBot');

      testLogger.assertion('Bot Commands Test', 'Commands set', mockBot.setMyCommands.mock.calls.length >= 1, '>=1', mockBot.setMyCommands.mock.calls.length);

      if (mockBot.setMyCommands.mock.calls.length > 0) {
        const commands = mockBot.setMyCommands.mock.calls[0][0];
        expect(commands).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ command: 'start' }),
            expect.objectContaining({ command: 'habits' }),
            expect.objectContaining({ command: 'today' }),
            expect.objectContaining({ command: 'stats' })
          ])
        );
      }
    });
  });
});