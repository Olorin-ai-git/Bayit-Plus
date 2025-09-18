/**
 * Jest Configuration for Olorin Microservices Testing
 * Comprehensive testing setup for 8 microservices with React, TypeScript, and Module Federation
 */

const path = require('path');

module.exports = {
  // Use jsdom environment for React testing
  testEnvironment: 'jsdom',

  // Setup files to run before tests
  setupFilesAfterEnv: [
    '<rootDir>/src/shared/testing/jest-setup.ts'
  ],

  // Module name mapping for path aliases
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
    '^@components/(.*)$': '<rootDir>/src/shared/components/$1',
    '^@hooks/(.*)$': '<rootDir>/src/shared/hooks/$1',
    '^@services/(.*)$': '<rootDir>/src/shared/services/$1',
    '^@utils/(.*)$': '<rootDir>/src/shared/utils/$1',
    '^@types/(.*)$': '<rootDir>/src/shared/types/$1',
    '^@events/(.*)$': '<rootDir>/src/shared/events/$1',
    '^@figma/(.*)$': '<rootDir>/src/shared/figma/$1',
    '^@testing/(.*)$': '<rootDir>/src/shared/testing/$1',

    // Microservice aliases
    '^@autonomous-investigation/(.*)$': '<rootDir>/src/microservices/autonomous-investigation/$1',
    '^@manual-investigation/(.*)$': '<rootDir>/src/microservices/manual-investigation/$1',
    '^@agent-analytics/(.*)$': '<rootDir>/src/microservices/agent-analytics/$1',
    '^@rag-intelligence/(.*)$': '<rootDir>/src/microservices/rag-intelligence/$1',
    '^@visualization/(.*)$': '<rootDir>/src/microservices/visualization/$1',
    '^@reporting/(.*)$': '<rootDir>/src/microservices/reporting/$1',
    '^@core-ui/(.*)$': '<rootDir>/src/microservices/core-ui/$1',
    '^@design-system/(.*)$': '<rootDir>/src/microservices/design-system/$1'
  },

  // File extensions to process
  moduleFileExtensions: [
    'js',
    'jsx',
    'ts',
    'tsx',
    'json'
  ],

  // Transform configuration
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true
      }
    }],
    '^.+\\.(js|jsx)$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        ['@babel/preset-react', { runtime: 'automatic' }]
      ]
    }],
    '^.+\\.css$': 'jest-transform-stub',
    '^.+\\.(jpg|jpeg|png|gif|svg)$': 'jest-transform-stub'
  },

  // Files to ignore during transformation
  transformIgnorePatterns: [
    'node_modules/(?!(mitt|@headlessui/react)/)'
  ],

  // Test file patterns
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.(ts|tsx|js|jsx)',
    '<rootDir>/src/**/*.(test|spec).(ts|tsx|js|jsx)',
    '<rootDir>/src/**/*.test.(ts|tsx|js|jsx)',
    '<rootDir>/src/**/*.spec.(ts|tsx|js|jsx)'
  ],

  // Files to ignore for testing
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/build/',
    '<rootDir>/dist/',
    '<rootDir>/coverage/',
    '<rootDir>/src/shared/testing/playwright-mcp.ts' // Playwright tests run separately
  ],

  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{ts,tsx,js,jsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{ts,tsx,js,jsx}',
    '!src/**/*.config.{ts,js}',
    '!src/index.tsx',
    '!src/reportWebVitals.ts',
    '!src/shared/testing/**',
    '!**/node_modules/**',
    '!**/vendor/**'
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    },
    // Service-specific thresholds
    './src/shared/': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './src/microservices/autonomous-investigation/': {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75
    },
    './src/microservices/manual-investigation/': {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75
    },
    './src/microservices/agent-analytics/': {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75
    },
    './src/microservices/rag-intelligence/': {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75
    },
    './src/microservices/visualization/': {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75
    },
    './src/microservices/reporting/': {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75
    },
    './src/microservices/core-ui/': {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75
    },
    './src/microservices/design-system/': {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75
    }
  },

  // Coverage output
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json',
    'clover'
  ],

  // Test reporter configuration
  reporters: [
    'default',
    ['jest-html-reporters', {
      publicPath: './coverage/html-report',
      filename: 'jest-report.html',
      expand: true,
      hideIcon: false,
      pageTitle: 'Olorin Microservices Test Report',
      logoImgPath: undefined,
      inlineSource: false
    }],
    ['jest-junit', {
      outputDirectory: './coverage',
      outputName: 'junit.xml',
      ancestorSeparator: ' › ',
      uniqueOutputName: 'false',
      suiteNameTemplate: '{filepath}',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}'
    }]
  ],

  // Global test timeout
  testTimeout: 10000,

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,

  // Error handling
  errorOnDeprecated: true,

  // Watch mode configuration
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/build/',
    '<rootDir>/dist/',
    '<rootDir>/coverage/'
  ],

  // Globals available in tests
  globals: {
    'ts-jest': {
      isolatedModules: true
    }
  },

  // Module directories
  moduleDirectories: [
    'node_modules',
    '<rootDir>/src'
  ],

  // Projects for different test types
  projects: [
    // Unit tests
    {
      displayName: 'Unit Tests',
      testMatch: [
        '<rootDir>/src/**/*.unit.(test|spec).(ts|tsx|js|jsx)',
        '<rootDir>/src/**/unit/**/*.(test|spec).(ts|tsx|js|jsx)'
      ],
      setupFilesAfterEnv: [
        '<rootDir>/src/shared/testing/jest-setup.ts'
      ]
    },

    // Integration tests
    {
      displayName: 'Integration Tests',
      testMatch: [
        '<rootDir>/src/**/*.integration.(test|spec).(ts|tsx|js|jsx)',
        '<rootDir>/src/**/integration/**/*.(test|spec).(ts|tsx|js|jsx)'
      ],
      setupFilesAfterEnv: [
        '<rootDir>/src/shared/testing/jest-setup.ts',
        '<rootDir>/src/shared/testing/integration-setup.ts'
      ],
      testTimeout: 15000
    },

    // Component tests
    {
      displayName: 'Component Tests',
      testMatch: [
        '<rootDir>/src/**/*.component.(test|spec).(ts|tsx|js|jsx)',
        '<rootDir>/src/**/components/**/*.(test|spec).(ts|tsx|js|jsx)'
      ],
      setupFilesAfterEnv: [
        '<rootDir>/src/shared/testing/jest-setup.ts',
        '<rootDir>/src/shared/testing/component-setup.ts'
      ]
    },

    // Event system tests
    {
      displayName: 'Event System Tests',
      testMatch: [
        '<rootDir>/src/shared/events/**/*.(test|spec).(ts|tsx|js|jsx)'
      ],
      setupFilesAfterEnv: [
        '<rootDir>/src/shared/testing/jest-setup.ts',
        '<rootDir>/src/shared/testing/event-setup.ts'
      ]
    },

    // Service tests (per microservice)
    {
      displayName: 'Autonomous Investigation Tests',
      testMatch: [
        '<rootDir>/src/microservices/autonomous-investigation/**/*.(test|spec).(ts|tsx|js|jsx)'
      ],
      setupFilesAfterEnv: [
        '<rootDir>/src/shared/testing/jest-setup.ts',
        '<rootDir>/src/shared/testing/service-setup.ts'
      ]
    },

    {
      displayName: 'Manual Investigation Tests',
      testMatch: [
        '<rootDir>/src/microservices/manual-investigation/**/*.(test|spec).(ts|tsx|js|jsx)'
      ],
      setupFilesAfterEnv: [
        '<rootDir>/src/shared/testing/jest-setup.ts',
        '<rootDir>/src/shared/testing/service-setup.ts'
      ]
    },

    {
      displayName: 'Agent Analytics Tests',
      testMatch: [
        '<rootDir>/src/microservices/agent-analytics/**/*.(test|spec).(ts|tsx|js|jsx)'
      ],
      setupFilesAfterEnv: [
        '<rootDir>/src/shared/testing/jest-setup.ts',
        '<rootDir>/src/shared/testing/service-setup.ts'
      ]
    },

    {
      displayName: 'RAG Intelligence Tests',
      testMatch: [
        '<rootDir>/src/microservices/rag-intelligence/**/*.(test|spec).(ts|tsx|js|jsx)'
      ],
      setupFilesAfterEnv: [
        '<rootDir>/src/shared/testing/jest-setup.ts',
        '<rootDir>/src/shared/testing/service-setup.ts'
      ]
    },

    {
      displayName: 'Visualization Tests',
      testMatch: [
        '<rootDir>/src/microservices/visualization/**/*.(test|spec).(ts|tsx|js|jsx)'
      ],
      setupFilesAfterEnv: [
        '<rootDir>/src/shared/testing/jest-setup.ts',
        '<rootDir>/src/shared/testing/service-setup.ts'
      ]
    },

    {
      displayName: 'Reporting Tests',
      testMatch: [
        '<rootDir>/src/microservices/reporting/**/*.(test|spec).(ts|tsx|js|jsx)'
      ],
      setupFilesAfterEnv: [
        '<rootDir>/src/shared/testing/jest-setup.ts',
        '<rootDir>/src/shared/testing/service-setup.ts'
      ]
    },

    {
      displayName: 'Core UI Tests',
      testMatch: [
        '<rootDir>/src/microservices/core-ui/**/*.(test|spec).(ts|tsx|js|jsx)'
      ],
      setupFilesAfterEnv: [
        '<rootDir>/src/shared/testing/jest-setup.ts',
        '<rootDir>/src/shared/testing/service-setup.ts'
      ]
    },

    {
      displayName: 'Design System Tests',
      testMatch: [
        '<rootDir>/src/microservices/design-system/**/*.(test|spec).(ts|tsx|js|jsx)'
      ],
      setupFilesAfterEnv: [
        '<rootDir>/src/shared/testing/jest-setup.ts',
        '<rootDir>/src/shared/testing/service-setup.ts'
      ]
    }
  ]
};