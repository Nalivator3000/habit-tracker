# Habit Tracker

Cross-platform habit tracking application with web interface, mobile apps (iOS/Android), and Telegram bot integration.

## Features

- 📱 **Multi-platform**: Web app, iOS/Android apps, Telegram bot
- 📊 **Flexible tracking**: Daily, weekly, monthly, custom frequency patterns
- 📈 **Analytics**: Streak tracking, completion rates, visual progress
- 🎯 **Custom metrics**: Track mood, sleep quality, and other personal metrics
- 🔔 **Smart reminders**: Customizable notifications across all platforms
- 🎮 **Gamification**: Achievements, levels, and progress rewards
- 👥 **Social features**: Share progress, group challenges
- 🔒 **Secure**: JWT authentication, data encryption

## Tech Stack

### Backend
- **API**: Node.js + Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT + bcrypt
- **Real-time**: WebSocket support

### Frontend
- **Web**: React.js + TypeScript + Tailwind CSS
- **Mobile**: React Native
- **State Management**: Redux Toolkit

### Integrations
- **Telegram Bot**: Node.js Telegram Bot API
- **Push Notifications**: Firebase Cloud Messaging
- **Deployment**: Railway, Vercel

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Nalivator3000/habit-tracker.git
   cd habit-tracker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup environment**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials and JWT secret
   ```

4. **Setup database**
   ```bash
   # Create PostgreSQL database
   createdb habit_tracker

   # Run migrations
   psql -d habit_tracker -f database/schema.sql
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:3000`

## API Documentation

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh JWT token

### Habits
- `GET /api/habits` - Get user habits
- `POST /api/habits` - Create new habit
- `PUT /api/habits/:id` - Update habit
- `DELETE /api/habits/:id` - Delete habit

### Habit Tracking
- `POST /api/habits/:id/log` - Log habit completion
- `GET /api/habits/:id/logs` - Get habit completion history
- `GET /api/habits/:id/stats` - Get habit statistics

### Custom Metrics
- `GET /api/metrics` - Get user metrics
- `POST /api/metrics` - Create custom metric
- `POST /api/metrics/:id/log` - Log metric value

## Development

### Project Structure
```
habit-tracker/
├── src/
│   ├── config/          # Configuration files
│   ├── controllers/     # Route controllers
│   ├── middleware/      # Express middleware
│   ├── models/          # Database models
│   ├── routes/          # API routes
│   └── utils/           # Utility functions
├── database/
│   ├── migrations/      # Database migrations
│   └── schema.sql       # Full database schema
├── frontend/            # React web app (coming soon)
├── mobile/              # React Native app (coming soon)
└── telegram-bot/        # Telegram bot (coming soon)
```

### Available Scripts
- `npm run dev` - Start development server with nodemon
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## Deployment

### Railway Deployment

1. **Connect to Railway**
   - Fork this repository
   - Connect your GitHub account to Railway
   - Create new project from GitHub repo

2. **Environment Variables**
   Set these variables in Railway dashboard:
   ```
   DB_HOST=your_postgres_host
   DB_PORT=5432
   DB_NAME=railway
   DB_USER=postgres
   DB_PASSWORD=your_password
   JWT_SECRET=your_jwt_secret
   NODE_ENV=production
   ```

3. **Database Setup**
   Railway will automatically create PostgreSQL database. Run migrations via Railway CLI or deploy script.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Roadmap

- [x] **Phase 1**: Backend API and database setup
- [ ] **Phase 2**: Web frontend (React)
- [ ] **Phase 3**: Telegram bot integration
- [ ] **Phase 4**: Mobile apps (React Native)
- [ ] **Phase 5**: Advanced analytics and AI features
- [ ] **Phase 6**: Social features and gamification

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- 📧 Email: support@habittracker.app
- 💬 Telegram: [@habittracker_bot](https://t.me/habittracker_bot)
- 🐛 Issues: [GitHub Issues](https://github.com/Nalivator3000/habit-tracker/issues)