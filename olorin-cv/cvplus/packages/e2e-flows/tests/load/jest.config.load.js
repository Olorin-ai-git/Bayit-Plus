/**
 * Jest Configuration for Load Testing
 * Optimized for high-concurrency, long-running load tests
 */

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',

  // Load test specific settings
  testMatch: [
    '**/tests/load/**/*.test.ts'
  ],

  // Extend timeouts for load testing
  testTimeout: 1800000, // 30 minutes for load tests

  // Optimize for load testing
  maxWorkers: '50%', // Use half available cores to leave resources for test execution
  maxConcurrency: 1, // Run load tests sequentially to avoid resource conflicts

  // Memory and resource optimization
  workerIdleMemoryLimit: '1GB',

  // Coverage settings (disabled for load tests due to overhead)
  collectCoverage: false,

  // Reporters optimized for load testing
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: './tests/load/reports',
        filename: 'load-test-report.html',
        expand: true,
        hideIcon: true,
        pageTitle: 'CVPlus E2E Flows - Load Test Results'
      }
    ],
    [
      'jest-junit',
      {
        outputDirectory: './tests/load/reports',
        outputName: 'load-test-junit.xml',
        suiteName: 'CVPlus E2E Flows Load Tests'
      }
    ]
  ],

  // Setup and teardown
  globalSetup: '<rootDir>/tests/load/jest.setup.ts',
  globalTeardown: '<rootDir>/tests/load/jest.teardown.ts',

  // Module resolution
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1'
  },

  // Transform settings
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        compilerOptions: {
          module: 'commonjs',
          target: 'ES2020'
        }
      }
    }]
  },

  // Test environment variables
  testEnvironmentOptions: {
    NODE_ENV: 'test',
    LOAD_TEST_MODE: 'true'
  },

  // Clear mocks and reset modules for clean test runs
  clearMocks: true,
  resetMocks: false,
  resetModules: false,

  // Verbose output for load test debugging
  verbose: true,

  // Detect handles to prevent hanging processes
  detectOpenHandles: true,
  forceExit: true
};