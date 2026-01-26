module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
  ],
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['react', 'react-hooks'],
  globals: {
    __DEV__: 'readonly',
    __TV__: 'readonly',
    __WEBOS__: 'readonly',
    __TIZEN__: 'readonly',
  },
  rules: {
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    'no-console': 'warn',
    'no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_|^demo|^config$|^is[A-Z]',
        ignoreRestSiblings: true,
      },
    ],
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_|^demo|^config$|^is[A-Z]',
        ignoreRestSiblings: true,
      },
    ],
  },
  overrides: [
    {
      files: ['**/demoService.js', '**/demo*.js', '**/*Shim.js'],
      rules: {
        'no-unused-vars': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
      },
    },
    {
      files: ['scripts/**/*.js', 'check-*.js', 'screenshot-*.js'],
      rules: {
        'no-console': 'off',
      },
    },
    {
      files: ['index.web.js'],
      rules: {
        'no-console': 'off', // TV mode initialization logging is acceptable
      },
    },
  ],
  settings: {
    react: {
      version: 'detect',
    },
  },
};
