module.exports = {
  displayName: 'Integration Tests',
  rootDir: '../../../',
  testMatch: [
    '**/__tests__/integration/**/*.test.{ts,tsx,js,jsx}',
    '**/shared/testing/integration/**/*.test.{ts,tsx,js,jsx}'
  ],
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
    '^@microservices/(.*)$': '<rootDir>/src/microservices/$1',
    '^@shell/(.*)$': '<rootDir>/src/shell/$1'
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