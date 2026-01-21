module.exports = {
  extends: [
    '@typescript-eslint/recommended',
    '../../.eslintrc.base.js'
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    project: './tsconfig.json'
  },
  rules: {
    // Structured logging standards
    '@typescript-eslint/naming-convention': [
      'error',
      {
        selector: 'interface',
        format: ['PascalCase'],
        custom: {
          regex: '^Log[A-Z]',
          match: false
        }
      }
    ],

    // Require proper error handling in logging functions
    '@typescript-eslint/no-unused-vars': ['error', {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_'
    }],

    // Ensure all logging methods have proper types
    '@typescript-eslint/explicit-function-return-type': 'error',

    // Prevent console.log in favor of structured logging
    'no-console': 'error',

    // Require consistent log message formatting
    'prefer-template': 'error',

    // Security: prevent sensitive data in logs
    'no-restricted-syntax': [
      'error',
      {
        selector: "CallExpression[callee.property.name=/log|info|warn|error|debug/] Literal[value=/password|secret|token|key|credential/i]",
        message: "Avoid logging sensitive information"
      }
    ]
  },

  overrides: [
    {
      files: ['**/*.test.ts', '**/*.spec.ts'],
      rules: {
        'no-console': 'off'
      }
    }
  ]
};