// Jest Configuration for Enhanced Session Management Tests
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  testMatch: [
    '<rootDir>/src/__tests__/**/*.test.{ts,tsx}',
    '<rootDir>/src/**/__tests__/**/*.{ts,tsx}',
    '<rootDir>/src/**/*.test.{ts,tsx}'
  ],
  collectCoverageFrom: [
    'src/services/**/*.{ts,tsx}',
    'src/hooks/**/*.{ts,tsx}',
    'src/components/**/*.{tsx}',
    '!src/**/*.d.ts',
    '!src/__tests__/**',
    '!src/**/__tests__/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './src/services/enhancedSessionManager.ts': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    },
    './src/services/offlineSessionManager.ts': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './src/hooks/useOfflineSession.ts': {
      branches: 75,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
    '^.+\\.(js|jsx)$': 'babel-jest'
  },
  transformIgnorePatterns: [
    'node_modules/(?!(firebase|@firebase)/)'
  ],
  testTimeout: 10000,
  clearMocks: true,
  restoreMocks: true,
  verbose: true,
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json-summary'
  ],
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json'
    }
  }
};