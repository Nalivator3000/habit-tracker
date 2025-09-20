const { spawn } = require('child_process');

// Skip in production
if (process.env.NODE_ENV === 'production') {
  console.log('⚠️ Test runner is disabled in production environment');
  process.exit(0);
}

const { testLogger } = require('./src/utils/logger');

class AutoTestRunner {
  constructor() {
    this.isRunning = false;
    this.testResults = {
      unit: null,
      integration: null,
      frontend: null,
      bot: null,
      coverage: null
    };
  }

  async runAllTests() {
    if (this.isRunning) {
      testLogger.testStep('AutoTestRunner', 'Tests already running, skipping');
      return this.testResults;
    }

    this.isRunning = true;
    testLogger.startTest('Automated Test Suite', 'Running complete test suite with logging');

    const startTime = Date.now();

    try {
      console.log('🧪 Starting Automated Test Suite...\n');

      await this.runUnitTests();
      await this.runIntegrationTests();
      await this.runFrontendTests();
      await this.runBotTests();
      await this.generateCoverageReport();

      const duration = Date.now() - startTime;
      const overallResult = this.calculateOverallResult();

      testLogger.endTest('Automated Test Suite', overallResult ? 'pass' : 'fail', duration, {
        unitTests: this.testResults.unit?.success || false,
        integrationTests: this.testResults.integration?.success || false,
        frontendTests: this.testResults.frontend?.success || false,
        botTests: this.testResults.bot?.success || false,
        totalDuration: `${duration}ms`
      });

      this.printSummary();

      return this.testResults;

    } catch (error) {
      const duration = Date.now() - startTime;
      testLogger.endTest('Automated Test Suite', 'fail', duration, {
        error: error.message
      });
      console.error('❌ Test suite failed:', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  async runUnitTests() {
    testLogger.testStep('AutoTestRunner', 'Running unit tests');
    console.log('📋 Running Unit Tests...');

    const result = await this.runJestTests('tests/controllers', 'Unit Tests');
    this.testResults.unit = result;

    console.log(result.success ? '✅ Unit tests passed' : '❌ Unit tests failed');
    return result;
  }

  async runIntegrationTests() {
    testLogger.testStep('AutoTestRunner', 'Running integration tests');
    console.log('🔗 Running Integration Tests...');

    const result = await this.runJestTests('tests/integration', 'Integration Tests');
    this.testResults.integration = result;

    console.log(result.success ? '✅ Integration tests passed' : '❌ Integration tests failed');
    return result;
  }

  async runFrontendTests() {
    testLogger.testStep('AutoTestRunner', 'Running frontend tests');
    console.log('🎨 Running Frontend Tests...');

    const result = await this.runJestTests('tests/frontend', 'Frontend Tests', {
      config: 'tests/frontend/jest.config.js'
    });
    this.testResults.frontend = result;

    console.log(result.success ? '✅ Frontend tests passed' : '❌ Frontend tests failed');
    return result;
  }

  async runBotTests() {
    testLogger.testStep('AutoTestRunner', 'Running bot tests');
    console.log('🤖 Running Bot Tests...');

    const result = await this.runJestTests('tests/bot', 'Bot Tests');
    this.testResults.bot = result;

    console.log(result.success ? '✅ Bot tests passed' : '❌ Bot tests failed');
    return result;
  }

  async runJestTests(testPath, testName, options = {}) {
    const startTime = Date.now();

    return new Promise((resolve) => {
      const jestArgs = [
        'jest',
        testPath,
        '--verbose',
        '--coverage',
        '--passWithNoTests'
      ];

      if (options.config) {
        jestArgs.push('--config', options.config);
      }

      const jest = spawn('npx', jestArgs, {
        stdio: 'pipe',
        shell: true,
        cwd: process.cwd()
      });

      let stdout = '';
      let stderr = '';

      jest.stdout.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        process.stdout.write(output);
      });

      jest.stderr.on('data', (data) => {
        const output = data.toString();
        stderr += output;
        if (!output.includes('Warning')) {
          process.stderr.write(output);
        }
      });

      jest.on('close', (code) => {
        const duration = Date.now() - startTime;
        const success = code === 0;

        const result = {
          testName,
          success,
          exitCode: code,
          duration,
          stdout,
          stderr,
          coverage: this.extractCoverageInfo(stdout)
        };

        testLogger.assertion(`${testName}`, 'Tests passed', success, true, success);

        if (success) {
          testLogger.testStep('AutoTestRunner', `${testName} completed successfully in ${duration}ms`);
        } else {
          testLogger.testStep('AutoTestRunner', `${testName} failed with exit code ${code}`);
        }

        resolve(result);
      });

      jest.on('error', (error) => {
        const duration = Date.now() - startTime;
        testLogger.testStep('AutoTestRunner', `${testName} error: ${error.message}`);

        resolve({
          testName,
          success: false,
          exitCode: -1,
          duration,
          error: error.message,
          stdout: '',
          stderr: error.message,
          coverage: null
        });
      });
    });
  }

  async generateCoverageReport() {
    testLogger.testStep('AutoTestRunner', 'Generating coverage report');
    console.log('📊 Generating Coverage Report...');

    const result = await this.runJestTests('', 'Coverage Report', {
      config: 'jest.config.js'
    });

    this.testResults.coverage = result;

    console.log(result.success ? '✅ Coverage report generated' : '❌ Coverage report failed');
    return result;
  }

  extractCoverageInfo(output) {
    const coverageMatch = output.match(/All files\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)/);

    if (coverageMatch) {
      return {
        statements: parseFloat(coverageMatch[1]),
        branches: parseFloat(coverageMatch[2]),
        functions: parseFloat(coverageMatch[3]),
        lines: parseFloat(coverageMatch[4])
      };
    }

    return null;
  }

  calculateOverallResult() {
    const results = Object.values(this.testResults).filter(r => r !== null);
    return results.every(result => result.success);
  }

  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📋 TEST SUITE SUMMARY');
    console.log('='.repeat(60));

    const testTypes = [
      { key: 'unit', name: 'Unit Tests' },
      { key: 'integration', name: 'Integration Tests' },
      { key: 'frontend', name: 'Frontend Tests' },
      { key: 'bot', name: 'Bot Tests' },
      { key: 'coverage', name: 'Coverage Report' }
    ];

    testTypes.forEach(({ key, name }) => {
      const result = this.testResults[key];
      if (result) {
        const status = result.success ? '✅ PASSED' : '❌ FAILED';
        const duration = result.duration ? `(${result.duration}ms)` : '';
        console.log(`${name.padEnd(20)} | ${status} ${duration}`);

        if (result.coverage) {
          console.log(`${' '.repeat(20)} | Coverage: ${result.coverage.lines}% lines, ${result.coverage.functions}% functions`);
        }
      } else {
        console.log(`${name.padEnd(20)} | ⏸️  SKIPPED`);
      }
    });

    const overallResult = this.calculateOverallResult();
    console.log('='.repeat(60));
    console.log(`Overall Result: ${overallResult ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
    console.log('='.repeat(60));

    const totalTests = Object.values(this.testResults).filter(r => r !== null).length;
    const passedTests = Object.values(this.testResults).filter(r => r && r.success).length;
    console.log(`Test Categories: ${passedTests}/${totalTests} passed`);

    const totalDuration = Object.values(this.testResults)
      .filter(r => r && r.duration)
      .reduce((sum, r) => sum + r.duration, 0);
    console.log(`Total Duration: ${totalDuration}ms`);

    if (!overallResult) {
      console.log('\n❌ Failed Tests:');
      Object.values(this.testResults)
        .filter(r => r && !r.success)
        .forEach(result => {
          console.log(`   - ${result.testName}: Exit code ${result.exitCode}`);
        });
    }

    console.log('\n📁 Log files available in ./logs/ directory');
    console.log('📊 Coverage reports available in ./coverage/ directory\n');
  }

  async watch() {
    console.log('👀 Starting Test Watcher...');
    console.log('Running initial test suite...\n');

    await this.runAllTests();

    console.log('\n👀 Watching for file changes... (Press Ctrl+C to stop)');

    const chokidar = require('chokidar');
    const watcher = chokidar.watch(['src/**/*.js', 'frontend/src/**/*.{js,jsx,ts,tsx}', 'tests/**/*.{js,ts,tsx}'], {
      ignored: /node_modules|\.git|coverage|logs/,
      persistent: true
    });

    let timeout;

    watcher.on('change', (path) => {
      console.log(`\n📝 File changed: ${path}`);
      console.log('⏳ Waiting for more changes...');

      clearTimeout(timeout);
      timeout = setTimeout(async () => {
        console.log('\n🔄 Running tests...\n');
        await this.runAllTests();
        console.log('\n👀 Watching for changes...');
      }, 2000);
    });

    process.on('SIGINT', () => {
      console.log('\n👋 Stopping test watcher...');
      watcher.close();
      process.exit(0);
    });
  }
}

module.exports = AutoTestRunner;

if (require.main === module) {
  const runner = new AutoTestRunner();
  const command = process.argv[2];

  switch (command) {
    case 'watch':
      runner.watch().catch(console.error);
      break;
    case 'unit':
      runner.runUnitTests().catch(console.error);
      break;
    case 'integration':
      runner.runIntegrationTests().catch(console.error);
      break;
    case 'frontend':
      runner.runFrontendTests().catch(console.error);
      break;
    case 'bot':
      runner.runBotTests().catch(console.error);
      break;
    default:
      runner.runAllTests().then(() => {
        process.exit(runner.calculateOverallResult() ? 0 : 1);
      }).catch((error) => {
        console.error(error);
        process.exit(1);
      });
  }
}