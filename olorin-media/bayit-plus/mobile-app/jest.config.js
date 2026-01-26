/**
 * Jest Configuration for Bayit+ iOS Mobile App
 *
 * Configured for React Native 0.83 with TypeScript support
 * Coverage threshold: 87% minimum as per CLAUDE.md requirements
 */

module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testEnvironment: 'node',
  testMatch: [
    '**/__tests__/**/*.test.{ts,tsx}',
    '**/?(*.)+(spec|test).{ts,tsx}',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/ios/',
    '/android/',
    '/dist/',
    '/demo/',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@olorin/design-tokens$': '<rootDir>/../packages/ui/design-tokens/src',
    '^@olorin/glass-ui$': '<rootDir>/../packages/ui/glass-components/src/native',
    '^@olorin/glass-ui/(.*)$': '<rootDir>/../packages/ui/glass-components/src/$1',
    '^@olorin/shared-hooks$': '<rootDir>/../packages/ui/shared-hooks/src',
    '^@olorin/shared-i18n$': '<rootDir>/../packages/ui/shared-i18n/src',
    '^@olorin/shared-services$': '<rootDir>/../packages/ui/shared-services/src',
    '^@olorin/shared-stores$': '<rootDir>/../packages/ui/shared-stores/src',
    '^@bayit/shared$': '<rootDir>/../shared/components',
    '^@bayit/shared-hooks$': '<rootDir>/../shared/hooks',
    '^@bayit/shared-stores$': '<rootDir>/../shared/stores',
    '^@bayit/shared-services$': '<rootDir>/../shared/services',
  },
  transform: {
    '^.+\\.(ts|tsx)$': [
      'babel-jest',
      {
        presets: ['module:@react-native/babel-preset'],
      },
    ],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|react-native-.*|@react-native-.*|@sentry/react-native|lucide-react-native|nativewind)/)',
  ],
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/platform-shims/**',
    '!src/stubs/**',
    '!src/demo/**',
  ],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'text-summary', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 87,
      functions: 87,
      lines: 87,
      statements: 87,
    },
  },
  reporters: ['default'],
  verbose: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  globals: {
    __DEV__: true,
  },
};
