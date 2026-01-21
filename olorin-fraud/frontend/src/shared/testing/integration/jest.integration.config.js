module.exports = {
  displayName: 'Integration Tests',
  rootDir: '../../../../',
  testMatch: [
    '<rootDir>/src/**/__tests__/integration/**/*.test.{ts,tsx,js,jsx}',
    '<rootDir>/src/shared/testing/integration/**/*.test.{ts,tsx,js,jsx}'
  ],
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
    '^@microservices/(.*)$': '<rootDir>/src/microservices/$1',
    '^@shell/(.*)$': '<rootDir>/src/shell/$1',
    '^@structured-investigation/(.*)$': '<rootDir>/src/microservices/structured-investigation/$1',
    '^@manual-investigation/(.*)$': '<rootDir>/src/microservices/manual-investigation/$1',
    '^@agent-analytics/(.*)$': '<rootDir>/src/microservices/agent-analytics/$1',
    '^@rag-intelligence/(.*)$': '<rootDir>/src/microservices/rag-intelligence/$1',
    '^@visualization/(.*)$': '<rootDir>/src/microservices/visualization/$1',
    '^@reporting/(.*)$': '<rootDir>/src/microservices/reporting/$1',
    '^@core-ui/(.*)$': '<rootDir>/src/microservices/core-ui/$1',
    '^@design-system/(.*)$': '<rootDir>/src/microservices/design-system/$1'
  },
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        jsx: 'react-jsx',
        strict: false
      }
    }],
    '^.+\\.(js|jsx)$': 'babel-jest'
  },
  collectCoverage: false,
  testTimeout: 30000,
  verbose: true,
  detectOpenHandles: true,
  forceExit: true,
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,
  maxWorkers: 1,
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/build/',
    '/dist/',
    '/coverage/'
  ]
};