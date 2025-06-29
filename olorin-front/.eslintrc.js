/**
 * ESLint configuration for Olorin webapp
 */

module.exports = {
  extends: [
    'react-app',
    'react-app/jest'
  ],
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
      files: ['**/*.{ts,tsx}'],
      parser: '@typescript-eslint/parser',
      plugins: ['@typescript-eslint'],
      extends: [
        'react-app',
        'react-app/jest'
      ],
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
<<<<<<< HEAD:front/.eslintrc.js
=======
      files: ['**/*.{ts,tsx}'],
      extends: ['react-app', 'react-app/jest'],
>>>>>>> restructure-projects:olorin-front/.eslintrc.js
    },
  ],
};
