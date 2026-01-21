const path = require('path');
const { getLoader, loaderByName } = require('@craco/craco');

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Allow webpack to resolve modules from the monorepo
      webpackConfig.resolve.plugins = webpackConfig.resolve.plugins.filter(
        plugin => plugin.constructor.name !== 'ModuleScopePlugin'
      );

      // Add alias for @olorin/shared to resolve to the shared package
      webpackConfig.resolve.alias = {
        ...webpackConfig.resolve.alias,
        '@olorin/shared': path.resolve(__dirname, '../shared/src'),
      };

      // Find babel-loader and include the shared package for transpilation
      const { isFound, match } = getLoader(
        webpackConfig,
        loaderByName('babel-loader')
      );

      if (isFound) {
        const include = Array.isArray(match.loader.include)
          ? match.loader.include
          : [match.loader.include];

        match.loader.include = [
          ...include,
          path.resolve(__dirname, '../shared/src'),
        ];
      }

      return webpackConfig;
    },
  },
};
