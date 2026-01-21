module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: ['tsconfig.json', 'tsconfig.dev.json'],
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  ignorePatterns: [
    '/lib/**/*', // Build output
    '/node_modules/**/*', // Dependencies
    '*.config.js',
    'jest.config.js',
  ],
  plugins: [
    '@typescript-eslint',
  ],
  rules: {
    // TypeScript specific rules
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }
    ],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-inferrable-types': 'warn',

    // General ESLint rules
    'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
    'no-debugger': 'warn',
    'no-duplicate-imports': 'error',
    'prefer-const': 'warn',
    'no-var': 'error',
    'no-unused-expressions': 'warn',

    // Firebase Functions specific
    'import/no-unresolved': 'off', // Firebase Functions handles this
    'no-restricted-globals': ['error', 'name', 'length'],
    'prefer-arrow-callback': 'error',
    'no-return-await': 'error',

    // Relaxed rules for development
    '@typescript-eslint/ban-ts-comment': 'warn',
    '@typescript-eslint/no-non-null-assertion': 'warn',
  },
  overrides: [
    // Test files
    {
      files: [
        '**/*.test.{ts,js}',
        '**/*.spec.{ts,js}',
        '**/test/**/*.{ts,js}',
        '**/tests/**/*.{ts,js}'
      ],
      env: {
        jest: true,
      },
      rules: {
        // Allow any types in tests
        '@typescript-eslint/no-explicit-any': 'off',
        // Allow non-null assertions in tests
        '@typescript-eslint/no-non-null-assertion': 'off',
        // Allow empty functions in tests (mocks)
        '@typescript-eslint/no-empty-function': 'off',
        // Allow console statements in test files
        'no-console': 'off',
        // Allow unused variables in test files
        '@typescript-eslint/no-unused-vars': 'off',
      },
    },
    // Portal-specific files (T009)
    {
      files: [
        'src/portal/**/*.ts',
        'src/portal/**/*.js'
      ],
      rules: {
        // Stricter rules for portal modules
        '@typescript-eslint/explicit-function-return-type': 'warn',
        '@typescript-eslint/no-explicit-any': 'error',
        'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
        // Portal-specific naming conventions
        '@typescript-eslint/naming-convention': [
          'warn',
          {
            'selector': 'interface',
            'format': ['PascalCase'],
            'custom': {
              'regex': '^(Portal|Chat|Analytics|Generate)',
              'match': false
            }
          },
          {
            'selector': 'typeAlias',
            'format': ['PascalCase']
          }
        ],
        // Require documentation for exported functions
        'require-jsdoc': [
          'warn',
          {
            'require': {
              'FunctionDeclaration': true,
              'MethodDefinition': false,
              'ClassDeclaration': true,
              'ArrowFunctionExpression': false,
              'FunctionExpression': false
            }
          }
        ],
      },
    },
  ],
};