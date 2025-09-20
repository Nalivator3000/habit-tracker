# Habit Tracker - Testing Guide

## Overview

This project includes a comprehensive testing suite with automated logging and reporting capabilities. The testing infrastructure covers:

- **Unit Tests**: Controller and business logic testing
- **Integration Tests**: Database and API endpoint testing
- **Frontend Tests**: React component and UI testing
- **Bot Tests**: Telegram bot functionality testing
- **Auto-Testing**: Automated test execution with logging

## Quick Start

### Run All Tests
```bash
npm test
# or
npm run test:all
```

### Run Specific Test Categories
```bash
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:frontend      # Frontend tests only
npm run test:bot          # Bot tests only
npm run test:coverage     # Generate coverage report
```

### Watch Mode (Auto-testing)
```bash
npm run test:watch
```
This will:
- Run complete test suite initially
- Watch for file changes
- Re-run tests automatically when files change
- Provide real-time logging and feedback

## Test Structure

```
tests/
├── setup.js                 # Global test setup
├── globalSetup.js           # Database setup for tests
├── globalTeardown.js        # Database cleanup
├── controllers/             # Unit tests
│   ├── authController.test.js
│   ├── habitController.test.js
│   └── habitLogController.test.js
├── integration/             # Integration tests
│   ├── database.test.js
│   └── api.test.js
├── frontend/                # Frontend tests
│   ├── jest.config.js
│   ├── setupTests.js
│   └── components.test.tsx
└── bot/                     # Bot tests
    └── telegramBot.test.js
```

## Testing Features

### 1. Comprehensive Logging
- All tests generate detailed logs with timestamps
- Test execution tracking with start/end events
- Assertion logging with expected vs actual values
- Error logging with full stack traces
- Logs saved to `./logs/` directory with daily rotation

### 2. Coverage Reports
- Line, branch, function, and statement coverage
- HTML reports generated in `./coverage/` directory
- Coverage thresholds enforced (80% minimum)
- Coverage data included in test logs

### 3. Database Testing
- Isolated test database (`habit_tracker_test`)
- Automatic setup and teardown
- Transaction rollback between tests
- Foreign key and constraint testing

### 4. API Integration Testing
- Full authentication flow testing
- CRUD operations testing
- Error handling validation
- Performance and concurrency testing
- Data isolation verification

### 5. Frontend Component Testing
- React component rendering tests
- User interaction simulation
- Redux store integration testing
- Form validation testing
- Accessibility testing

### 6. Bot Testing
- Command handling testing
- Callback query processing
- Message formatting validation
- Error handling verification
- Database integration testing

## Test Configuration

### Jest Configuration
Main config in `jest.config.js`:
- Node.js environment for backend tests
- Coverage thresholds set to 80%
- Test timeout: 30 seconds
- Detailed reporting enabled

Frontend config in `tests/frontend/jest.config.js`:
- jsdom environment for React testing
- Babel transformation for TypeScript/JSX
- Module path mapping for imports

### Environment Setup
Tests require:
- PostgreSQL database access
- Test environment variables
- Node.js 18+
- All project dependencies installed

## Auto-Testing Features

### Test Runner (`test-runner.js`)
- Orchestrates all test categories
- Provides detailed logging and reporting
- Generates comprehensive summary reports
- Handles test failures gracefully
- Calculates overall success/failure status

### Watch Mode
- Monitors file changes in real-time
- Debounces rapid changes (2-second delay)
- Re-runs affected test suites
- Provides continuous feedback
- Handles interruption gracefully

### Logging Integration
Every test execution includes:
- Test start/end timestamps
- Individual assertion results
- Performance metrics
- Error details and stack traces
- Coverage information
- Test duration tracking

## Example Usage

### Running Tests with Logging
```bash
# Run all tests with detailed logging
npm test

# Output:
# 🧪 Starting Automated Test Suite...
# 📋 Running Unit Tests...
# ✅ Unit tests passed
# 🔗 Running Integration Tests...
# ✅ Integration tests passed
# 🎨 Running Frontend Tests...
# ✅ Frontend tests passed
# 🤖 Running Bot Tests...
# ✅ Bot tests passed
# 📊 Generating Coverage Report...
# ✅ Coverage report generated
#
# ============================================================
# 📋 TEST SUITE SUMMARY
# ============================================================
# Unit Tests           | ✅ PASSED (2341ms)
# Integration Tests    | ✅ PASSED (4523ms)
# Frontend Tests       | ✅ PASSED (3102ms)
# Bot Tests           | ✅ PASSED (1845ms)
# Coverage Report     | ✅ PASSED (1231ms)
# ============================================================
# Overall Result: ✅ ALL TESTS PASSED
# ============================================================
```

### Watch Mode Usage
```bash
npm run test:watch

# Output:
# 👀 Starting Test Watcher...
# Running initial test suite...
# [Complete test run]
# 👀 Watching for file changes... (Press Ctrl+C to stop)
#
# 📝 File changed: src/controllers/habitController.js
# ⏳ Waiting for more changes...
# 🔄 Running tests...
# [Automated test re-run]
```

## Continuous Integration

### GitHub Actions Integration
The testing suite is designed to work with CI/CD pipelines:

```yaml
- name: Run Tests
  run: npm test

- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    file: ./coverage/lcov.info
```

### Pre-commit Hooks
Add to `.git/hooks/pre-commit`:
```bash
#!/bin/sh
npm run test:unit
if [ $? -ne 0 ]; then
  echo "❌ Unit tests failed. Commit rejected."
  exit 1
fi
```

## Troubleshooting

### Common Issues

**Database Connection Errors:**
- Ensure PostgreSQL is running
- Check `.env` file for correct database credentials
- Verify test database exists and is accessible

**Frontend Test Failures:**
- Install frontend dependencies: `cd frontend && npm install`
- Check for missing @testing-library packages
- Verify TypeScript configuration

**Bot Test Issues:**
- Mock implementations may need updates
- Ensure Telegram Bot API token is set (for integration tests)
- Check network connectivity for API calls

**Coverage Issues:**
- Increase timeout for slow tests
- Check file patterns in Jest configuration
- Verify all source files are included in coverage

### Debug Mode
Enable verbose logging:
```bash
LOG_LEVEL=debug npm test
```

This will provide additional debugging information in the logs.

## Performance Optimization

### Test Execution Speed
- Unit tests: < 5 seconds
- Integration tests: < 10 seconds
- Frontend tests: < 8 seconds
- Bot tests: < 5 seconds
- Total suite: < 30 seconds

### Parallel Execution
Tests run in parallel where possible:
- Jest runs tests in parallel by default
- Database tests use isolated transactions
- Frontend tests use separate jsdom environments

## Contributing

When adding new tests:
1. Follow existing naming conventions
2. Include comprehensive logging with `testLogger`
3. Add proper assertions with expected/actual values
4. Include error handling test cases
5. Update this documentation if adding new test categories

## Log Files

Test logs are automatically saved to:
- `./logs/test-{date}.log` - Daily test logs
- `./logs/combined-{date}.log` - All application logs
- `./logs/error-{date}.log` - Error-only logs

Logs are retained for 14 days and rotate daily.