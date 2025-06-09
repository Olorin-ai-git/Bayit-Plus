/**
 * Below are the default set or rules a plugin can override
 * Pass this config into `plugin-cli.config.js` to have it picked up by the build system
 * Overrides are additive, they will not overwrite what the build brings.
 * To learn more see https://github.intuit.com/pages/UX-Infra/plugin-cli/docs/config-files
 */
const path = require('path');

module.exports = {
  rules: [
    {
      test: /\.css$/i,
      use: [
        'css-loader',
        {
          loader: 'postcss-loader',
          options: {
            postcssOptions: {
              config: path.resolve(__dirname, 'postcss.config.js'),
            },
          },
        },
      ],
    },
  ],
  plugins: [],
  silent: false,
  // performance,
  resolve: {
    extensions: [],
    modules: [],
  },
};
