module.exports = {
  rootDir: '../../../..',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['@testing-library/jest-dom'],
  testMatch: ['<rootDir>/src/components/review/__tests__/*.test.ts?(x)'],
  transform: { '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { configFile: './babel.config.cjs' }] },
  moduleNameMapper: { '\\.css$': 'identity-obj-proxy' },
};
