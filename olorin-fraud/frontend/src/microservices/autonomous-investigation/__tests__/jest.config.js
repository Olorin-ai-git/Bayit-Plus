const path = require('path');

module.exports = {
  // Test environment
  testEnvironment: 'jsdom',

  // Root directory for tests
  rootDir: path.resolve(__dirname, '..'),

  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/__tests__/setup/setupTests.ts'
  ],

  // Test patterns
  testMatch: [
    '<rootDir>/__tests__/**/*.test.{ts,tsx}',
    '<rootDir>/**/*.test.{ts,tsx}'
  ],

  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: '<rootDir>/__tests__/coverage',
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json'
  ],

  // Coverage collection patterns
  collectCoverageFrom: [
    '<rootDir>/components/**/*.{ts,tsx}',
    '<rootDir>/hooks/**/*.{ts,tsx}',
    '<rootDir>/services/**/*.{ts,tsx}',
    '<rootDir>/utils/**/*.{ts,tsx}',
    '!<rootDir>/**/*.d.ts',
    '!<rootDir>/**/*.stories.{ts,tsx}',
    '!<rootDir>/__tests__/**/*',
    '!<rootDir>/node_modules/**/*'
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './components/': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    },
    './hooks/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    './services/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },

  // Module name mapping
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@components/(.*)$': '<rootDir>/components/$1',
    '^@hooks/(.*)$': '<rootDir>/hooks/$1',
    '^@services/(.*)$': '<rootDir>/services/$1',
    '^@utils/(.*)$': '<rootDir>/utils/$1',
    '^@types/(.*)$': '<rootDir>/types/$1',
    '^@test-utils$': '<rootDir>/__tests__/utils/testUtils'
  },

  // Module file extensions
  moduleFileExtensions: [
    'ts',
    'tsx',
    'js',
    'jsx',
    'json'
  ],

  // Transform patterns
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
    '^.+\\.(js|jsx)$': 'babel-jest'
  },

  // Transform ignore patterns
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$|@testing-library|@babel))'
  ],

  // Module directories
  moduleDirectories: [
    'node_modules',
    '<rootDir>'
  ],

  // Test timeout
  testTimeout: 10000,

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,

  // Restore mocks after each test
  restoreMocks: true,

  // Reset modules between tests
  resetModules: true,

  // Error on deprecated features
  errorOnDeprecated: true,

  // Detect open handles
  detectOpenHandles: true,

  // Force exit after tests complete
  forceExit: false,

  // Max worker processes
  maxWorkers: '50%',

  // Cache directory
  cacheDirectory: '<rootDir>/__tests__/.jest-cache',

  // Global setup/teardown
  globalSetup: undefined,
  globalTeardown: undefined,

  // Jest environment options
  testEnvironmentOptions: {
    url: 'http://localhost'
  },

  // Reporter configuration
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: '<rootDir>/__tests__/reports',
        outputName: 'junit.xml',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: true
      }
    ],
    [
      'jest-html-reporters',
      {
        publicPath: '<rootDir>/__tests__/reports',
        filename: 'report.html',
        expand: true,
        hideIcon: false,
        pageTitle: 'Autonomous Investigation Test Report'
      }
    ]
  ],

  // Watch plugins
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname'
  ],

  // Notify settings
  notify: false,
  notifyMode: 'failure-change',

  // Bail settings
  bail: 0,

  // Test result processor
  testResultsProcessor: undefined,

  // Custom matchers
  setupFiles: [],

  // Snapshot serializers
  snapshotSerializers: [],

  // Test path ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/utils/',
    '/__tests__/setup/',
    '/__tests__/coverage/',
    '/__tests__/reports/'
  ],

  // Watch path ignore patterns
  watchPathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/coverage/',
    '/__tests__/reports/',
    '/__tests__/.jest-cache/'
  ],

  // Preset configuration
  preset: 'ts-jest/presets/js-with-ts',

  // Globals configuration
  globals: {
    'ts-jest': {
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true
      },
      isolatedModules: true
    }
  },

  // Extensions to treat as ESM
  extensionsToTreatAsEsm: ['.ts', '.tsx'],

  // Custom test categories
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/__tests__/**/*.test.{ts,tsx}'],
      testPathIgnorePatterns: [
        '/__tests__/integration/',
        '/__tests__/e2e/'
      ]
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/__tests__/integration/**/*.test.{ts,tsx}']
    },
    {
      displayName: 'e2e',
      testMatch: ['<rootDir>/__tests__/e2e/**/*.test.{ts,tsx}']
    }
  ]
};