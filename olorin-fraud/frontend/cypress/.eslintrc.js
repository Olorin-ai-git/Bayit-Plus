/**
 * ESLint configuration for Cypress tests
 */

module.exports = {
  extends: ['react-app'],
  env: {
    'cypress/globals': true,
  },
  plugins: ['cypress'],
  rules: {
    'cypress/no-assigning-return-values': 'error',
    'cypress/no-unnecessary-waiting': 'error',
    'cypress/assertion-before-screenshot': 'warn',
    'cypress/no-force': 'warn',
  },
};
