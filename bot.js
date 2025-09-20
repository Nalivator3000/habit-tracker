require('dotenv').config();
const telegramBot = require('./src/bot/telegramBot');

// Start the Telegram bot
telegramBot.start();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down bot...');
  telegramBot.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down bot...');
  telegramBot.stop();
  process.exit(0);
});