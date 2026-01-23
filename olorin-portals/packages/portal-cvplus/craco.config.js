const path = require('path');

module.exports = {
  style: {
    postcss: {
      mode: 'extends',
      plugins: [
        require('tailwindcss')(path.resolve(__dirname, 'tailwind.config.js')),
        require('autoprefixer'),
      ],
    },
  },
  webpack: {
    configure: (webpackConfig) => {
      // Ensure CSS files are processed through postcss-loader
      const cssRule = webpackConfig.module.rules.find(
        rule => rule.oneOf
      );

      if (cssRule && cssRule.oneOf) {
        cssRule.oneOf.forEach((rule) => {
          if (rule.test && rule.test.toString().includes('css')) {
            if (rule.use) {
              const loaders = Array.isArray(rule.use) ? rule.use : [rule.use];
              loaders.forEach((loader) => {
                if (
                  typeof loader === 'object' &&
                  loader.loader &&
                  loader.loader.includes('postcss-loader')
                ) {
                  // Ensure PostCSS loader has the right options
                  loader.options = loader.options || {};
                  loader.options.postcssOptions = {
                    plugins: [
                      require('tailwindcss')(path.resolve(__dirname, 'tailwind.config.js')),
                      require('autoprefixer'),
                    ],
                  };
                }
              });
            }
          }
        });
      }

      return webpackConfig;
    },
  },
};
