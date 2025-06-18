/**
 * ESLint configuration for mock files
 */

module.exports = {
  extends: ['react-app', 'react-app/jest'],
  rules: {
    'import/no-extraneous-dependencies': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
    'no-unused-vars': 'off',
  },
};
