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