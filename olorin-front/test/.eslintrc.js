/**
 * ESLint configuration for test files
 */

module.exports = {
  extends: ['react-app', 'react-app/jest'],
  rules: {
    'import/no-extraneous-dependencies': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-unused-vars': 'off',
  },
};
