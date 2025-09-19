module.exports = {
  displayName: 'Integration Tests',
  testMatch: [
    '<rootDir>/src/shared/testing/integration/**/*.test.{ts,tsx,js,jsx}'
  ],
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: [
    '<rootDir>/src/shared/testing/integration/setup.ts'
  ],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
    '^@microservices/(.*)$': '<rootDir>/src/microservices/$1',
    '^@shell/(.*)$': '<rootDir>/src/shell/$1'
  },
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
    '^.+\\.(js|jsx)$': 'babel-jest'
  },
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage/integration',
  coverageReporters: ['text', 'lcov', 'html'],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/build/',
    '/dist/',
    '/coverage/',
    '\\.test\\.(ts|tsx|js|jsx)$',
    '\\.spec\\.(ts|tsx|js|jsx)$'
  ],
  collectCoverageFrom: [
    'src/shared/**/*.{ts,tsx}',
    'src/shell/**/*.{ts,tsx}',
    'src/microservices/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{ts,tsx}',
    '!src/**/index.{ts,tsx}'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  testTimeout: 30000,
  verbose: true,
  detectOpenHandles: true,
  forceExit: true,
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,
  maxWorkers: 1, // Run integration tests sequentially
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.json',
      isolatedModules: true
    }
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/build/',
    '/dist/',
    '/coverage/'
  ]
};