/**
 * This file allows you to override certain functionality that Plugin CLI provides.
 * For more info on the options, see https://github.intuit.com/pages/UX-Infra/plugin-cli/docs/config-files
 * For more info on lint config, see https://github.intuit.com/pages/UX-Infra/plugin-cli/docs/config-linting
 */
const eslintConfig = require('./.eslintrc');
const webpackConfig = require('./webpack.config');
const cypressConfig = require('./cypress.config');
const jestConfig = require('./jest.config');

module.exports = {
  lint: {
    js: {
      // read a local eslint config file
      localConfig: false,
    },
    ts: {
      // Pass ts-specific rules here
      rules: eslintConfig.rules,
    },
  },
  build: {
    babel: {
      plugins: [],
    },
    enableTypeCheck: true,
    webpack: webpackConfig,
  },
  test: {
    // Empty rule sets will not override anything, but we can set this up for if/when rules get added
    jest: jestConfig,
    cypress: {
      config: cypressConfig,
    },
  },
};
