/**
 * NOTE: This config is purely for IDE integration. Rules can be overridden here
 * and used by tooling as needed.
 */

const { getPresetPath } = require('@appfabric/eslint-config-appfabric/next');

module.exports = {
  extends: '@appfabric/eslint-config-appfabric',
  rules: {
    'react/prop-types': 'off',
    // Disable require-jsdoc for public functions
    'require-jsdoc': 'off',
    // Disable enforcing file extensions for imports
    'import/extensions': 'off',
    // Use TS-specific unused vars rule and ignore variables prefixed with _
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    // Disable generic unused-vars rule
    'no-unused-vars': 'off',
  },
  overrides: [
    {
      parser: require.resolve('@typescript-eslint/parser'),
      plugins: ['@typescript-eslint'],
      settings: {
        'import/resolver': {
          node: {
            extensions: ['.js', '.jsx', '.ts', '.tsx'],
          },
          typescript: {
            project: ['tsconfig.json', './cypress/tsconfig.json'],
          },
        },
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
        ecmaVersion: 2018,
        project: ['tsconfig.json', './cypress/tsconfig.json'],
      },
      files: ['**/*.{ts,tsx}'],
      extends: [getPresetPath('typescript')],
    },
  ],
};
