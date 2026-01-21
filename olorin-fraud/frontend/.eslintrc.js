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
            project: ['/Users/gklainert/Documents/olorin/olorin-front/tsconfig.json', '/Users/gklainert/Documents/olorin/olorin-front/cypress/tsconfig.json'],
          },
        },
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
        ecmaVersion: 2018,
        project: ['/Users/gklainert/Documents/olorin/olorin-front/tsconfig.json', '/Users/gklainert/Documents/olorin/olorin-front/cypress/tsconfig.json'],
        tsconfigRootDir: '/Users/gklainert/Documents/olorin/olorin-front',
      },
    },
  ],
};
