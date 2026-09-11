module.exports = {
  parser: '@typescript-eslint/parser',
  extends: [
    '../../.eslintrc.json',
  ],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  rules: {
    ...require('@typescript-eslint/eslint-plugin').configs.recommended.rules,
    'no-console': 'error',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'warn',
  },
};
