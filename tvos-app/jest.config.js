module.exports = {
  preset: 'react-native',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|react-native-vector-icons|react-native-linear-gradient|react-native-video|react-native-safe-area-context|react-native-screens|@react-native-async-storage|@react-native-clipboard)/)',
  ],
  testMatch: [
    '**/__tests__/**/*.(test|spec).(ts|tsx|js|jsx)',
    '**/*.(test|spec).(ts|tsx|js|jsx)',
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/node_modules/**',
  ],
  coverageThreshold: {
    global: {
      branches: 87,
      functions: 87,
      lines: 87,
      statements: 87,
    },
  },
  coverageReporters: ['text', 'lcov', 'html'],
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@bayit/shared-services$': '<rootDir>/../shared/services/index.ts',
    '^@bayit/shared-stores/(.*)$': '<rootDir>/../shared/stores/$1',
    '^@bayit/shared-hooks/(.*)$': '<rootDir>/../shared/hooks/$1',
    '^@bayit/shared-screens$': '<rootDir>/../shared/screens/index.ts',
    '^@bayit/shared/(.*)$': '<rootDir>/../shared/$1',
    '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/__mocks__/fileMock.js',
  },
};
