# Claude Code Project Configuration

## Project Overview
**Habit Tracker** - Comprehensive habit tracking application with database persistence, automated testing, and full-featured interface.

## Testing Requirements
⚠️ **ВАЖНО**: При добавлении любой новой функциональности ОБЯЗАТЕЛЬНО писать тесты!

### Автоматические тесты должны покрывать:
1. **Database Operations** - все CRUD операции с БД
2. **API Endpoints** - все новые эндпоинты и их ответы
3. **UI Elements** - новые элементы интерфейса
4. **Form Validation** - валидация форм и обработка ошибок
5. **Response Handling** - правильность обработки ответов API

### Типы тестов:
- **Unit Tests** - тестирование отдельных функций
- **Integration Tests** - тестирование взаимодействия компонентов
- **UI Tests** - тестирование элементов интерфейса
- **Database Tests** - тестирование операций с базой данных

## Common Commands

### Development
```bash
# Start server
npm start

# Start development with auto-reload
npm run dev
```

### Testing Interface
- **URL**: `/public/db-test.html`
- **Full Test Suite**: Автоматическое тестирование всех компонентов
- **Manual Testing**: Ручное тестирование отдельных операций
- **Database Reset**: Полная очистка БД с пересозданием данных

## Project Structure
```
├── src/
│   ├── routes/
│   │   ├── habits-minimal.js    # Main API routes with comprehensive testing
│   │   ├── auth.js             # Authentication routes
│   │   └── admin.js            # Admin panel routes
│   └── config/
│       └── database.js         # Database configuration
├── public/
│   ├── app.html               # Main application interface
│   ├── app.js                # Frontend logic
│   ├── db-test.html          # Comprehensive testing interface
│   └── style.css             # Application styles
└── server.js                 # Main server file
```

## Database Schema
```sql
-- Habits table
CREATE TABLE habits (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#3B82F6',
    frequency_type VARCHAR(20) DEFAULT 'daily',
    target_count INTEGER DEFAULT 1,
    difficulty_level INTEGER DEFAULT 3,
    is_archived BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Habit logs table
CREATE TABLE habit_logs (
    id SERIAL PRIMARY KEY,
    habit_id INTEGER REFERENCES habits(id),
    user_id INTEGER NOT NULL,
    date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'completed',
    completion_count INTEGER DEFAULT 1,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(habit_id, date)
);
```

## API Endpoints

### Main Routes
- `GET /api/habits` - Получить все привычки
- `POST /api/habits` - Создать новую привычку
- `PUT /api/habits/:id` - Обновить привычку
- `DELETE /api/habits/:id` - Удалить привычку (soft delete)
- `POST /api/habits/:id/log` - Записать выполнение привычки
- `DELETE /api/habits/:id/log` - Отменить выполнение привычки (UNDO)
- `GET /api/habits/logs/today` - Получить логи за сегодня

### Testing & Admin Routes
- `GET /api/habits/db-test` - Тестирование базы данных
- `POST /api/habits/reset-database` - Полная очистка БД
- `POST /api/habits/create-real-habits` - Создание тестовых привычек

## Key Features
1. **Database Persistence** - Полная работа с PostgreSQL
2. **UPSERT Operations** - Обработка дублирующихся записей
3. **Transaction Support** - Атомарные операции
4. **Comprehensive Testing** - Полное покрытие тестами
5. **Statistics Calculation** - Точные статистики без переполнения
6. **Error Handling** - Подробная обработка ошибок
7. **Undo Functionality** - Возможность отменить выполненные задачи
8. **Advanced Frequency System** - Сложная система регулярности привычек

## Frequency System Architecture

### Frequency Types:
1. **Daily** - каждый день
   - `frequency_type: 'daily'`
   - `target_count: N` - количество раз в день
   - Multiple instances: "Task x1", "Task x2", etc.

2. **Every N Days** - раз в N дней
   - `frequency_type: 'every_n_days'`
   - `frequency_value: N` - интервал в днях
   - Next due calculation based on last completion

3. **Weekly** - раз в неделю
   - `frequency_type: 'weekly'`
   - Shows in daily view, no penalty until Sunday
   - Weekly reset cycle

4. **Schedule-based** - по расписанию
   - `frequency_type: 'schedule'`
   - `schedule_dates: [...]` - выбранные даты
   - Calendar picker interface

5. **Monthly** - раз в месяц
   - `frequency_type: 'monthly'`
   - `frequency_value: day_of_month` (1-31)
   - Monthly reset cycle

6. **Yearly** - раз в год
   - `frequency_type: 'yearly'`
   - `schedule_dates: ['MM-DD']` - месяц и день
   - Annual reset cycle

### Database Schema Updates:
```sql
ALTER TABLE habits ADD COLUMN frequency_value INTEGER DEFAULT 1;
ALTER TABLE habits ADD COLUMN schedule_dates JSONB DEFAULT '[]';
ALTER TABLE habits ADD COLUMN next_due_date DATE;
ALTER TABLE habits ADD COLUMN last_reset_date DATE;
```

## Development Guidelines

### При добавлении новых функций:
1. ✅ Написать unit тесты для backend функций
2. ✅ Добавить integration тесты для API
3. ✅ Создать UI тесты для новых элементов интерфейса
4. ✅ Обновить database тесты если изменяется схема
5. ✅ Добавить тесты валидации для новых форм
6. ✅ Протестировать error handling для новых сценариев

### Структура тестов:
```javascript
// В db-test.html добавлять новые тесты:
async function testNewFeature() {
    addResult('New Feature Test', 'loading');
    try {
        // Тест логика
        const result = await testFunction();
        addResult('New Feature Test ✅', 'success', result);
    } catch (error) {
        addResult('New Feature Test ❌', 'error', { error: error.message });
    }
}
```

## Production Notes
- Использует PostgreSQL на Railway.app
- Автоматический деплой при push в main
- Comprehensive logging для отладки
- Database transactions для data integrity
- No localStorage - только database operations

## Recent Updates
- ✅ Полное покрытие тестами всех компонентов
- ✅ Database reset functionality
- ✅ UI elements testing
- ✅ Form validation testing
- ✅ API response format validation
- ✅ Comprehensive error handling testing
- ✅ **Полная система авторизации** - регистрация, логин, JWT токены
- ✅ **Календарь привычек** - визуализация в стиле heatmap по месяцам
- ✅ **Защищенные API маршруты** - все endpoints требуют авторизацию
- ✅ **Персональные данные пользователей** - каждый видит только свои привычки

## Новые возможности

### 🔐 Система авторизации
- **Регистрация пользователей** с валидацией
- **Логин с JWT токенами** (access + refresh)
- **Автоматическое обновление токенов**
- **Защита всех API endpoints**
- **Персональные данные** - пользователи изолированы
- **Красивая страница логина**: `/auth.html`

### 📅 Календарь привычек
- **Визуализация по месяцам** в стиле GitHub heatmap
- **Цветовая индикация**: зеленый=выполнено, красный=пропущено
- **Интерактивное переключение** статуса привычек
- **Навигация по месяцам** с кнопками ← →
- **Адаптивный дизайн** для мобильных устройств
- **Статистика выполнения** в реальном времени
- **Доступ через**: `/calendar.html`

### 🔗 Навигация
- **Dashboard** (`/app.html`) - основной интерфейс управления привычками
- **Calendar** (`/calendar.html`) - календарный обзор и статистика
- **Testing** (`/db-test.html`) - инструменты тестирования и отладки
- **Login** (`/auth.html`) - страница входа и регистрации

### 🆔 API Endpoints
- `POST /api/auth/register` - Регистрация пользователя
- `POST /api/auth/login` - Вход в систему
- `POST /api/auth/refresh` - Обновление токена
- `GET /api/habits/logs/month/:year/:month` - Логи за месяц для календаря

### 🔧 Технические улучшения
- **Автоматические тесты авторизации** (`test-auth.js`)
- **Исправлен бесконечный цикл** авторизации
- **Синхронизация токенов** между компонентами
- **Обработка ошибок 401/403** с редиректом на логин