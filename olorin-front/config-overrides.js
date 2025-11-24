/**
 * Webpack Configuration Overrides for Olorin Frontend
 * 
 * Provides advanced bundle optimization, code splitting, and performance enhancements
 * for the React application without ejecting from Create React App.
 */

const path = require('path');
const { override, addWebpackPlugin, addWebpackModuleRule } = require('customize-cra');
const CompressionPlugin = require('compression-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const TerserPlugin = require('terser-webpack-plugin');
const ModuleFederationPlugin = require('webpack/lib/container/ModuleFederationPlugin');

// Bundle analyzer configuration
const shouldAnalyze = process.env.ANALYZE === 'true';

// Module Federation configuration for 8 microservices
const moduleFederationConfig = {
  name: 'shell',
  filename: 'remoteEntry.js',
  remotes: {
<<<<<<< HEAD
    autonomousInvestigation: 'autonomousInvestigation@http://localhost:3001/remoteEntry.js',
=======
    structuredInvestigation: 'structuredInvestigation@http://localhost:3001/remoteEntry.js',
>>>>>>> 001-modify-analyzer-method
    manualInvestigation: 'manualInvestigation@http://localhost:3002/remoteEntry.js',
    agentAnalytics: 'agentAnalytics@http://localhost:3003/remoteEntry.js',
    ragIntelligence: 'ragIntelligence@http://localhost:3004/remoteEntry.js',
    visualization: 'visualization@http://localhost:3005/remoteEntry.js',
    reporting: 'reporting@http://localhost:3006/remoteEntry.js',
    coreUI: 'coreUI@http://localhost:3007/remoteEntry.js',
    designSystem: 'designSystem@http://localhost:3008/remoteEntry.js',
  },
  exposes: {
    './App': './src/App',
    './SharedComponents': './src/shared/components',
    './SharedHooks': './src/shared/hooks',
    './SharedServices': './src/shared/services',
    './SharedTypes': './src/shared/types',
    './SharedUtils': './src/shared/utils',
    './DesignTokens': './src/shared/figma/design-tokens',
    './EventBus': './src/shared/events/eventBus',
  },
  shared: {
    react: {
      singleton: true,
      requiredVersion: '^18.2.0',
      eager: true,
    },
    'react-dom': {
      singleton: true,
      requiredVersion: '^18.2.0',
      eager: true,
    },
    'react-router-dom': {
      singleton: true,
      requiredVersion: '^6.11.0',
    },
    '@headlessui/react': {
      singleton: true,
      requiredVersion: '^2.0.0',
    },
    'tailwindcss': {
      singleton: true,
      requiredVersion: '^3.3.0',
    },
    mitt: {
      singleton: true,
      requiredVersion: '^3.0.1',
    },
    axios: {
      singleton: true,
      requiredVersion: '^1.4.0',
    },
    typescript: {
      singleton: true,
      requiredVersion: '^4.9.5',
    },
  },
};

// Performance optimization configuration
const performanceConfig = (config) => {
  // Only apply optimizations in production
  if (process.env.NODE_ENV === 'production') {
    // Advanced code splitting
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          // Vendor chunks
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: 10,
            chunks: 'all',
            enforce: true,
          },
          
          // Common chunks
          common: {
            name: 'common',
            minChunks: 2,
            priority: 5,
            chunks: 'all',
            reuseExistingChunk: true,
          },
          
          // React ecosystem
          react: {
            test: /[\\/]node_modules[\\/](react|react-dom|react-router)[\\/]/,
            name: 'react-vendor',
            priority: 20,
            chunks: 'all',
          },
          
          // Material-UI
          mui: {
            test: /[\\/]node_modules[\\/]@mui[\\/]/,
            name: 'mui-vendor',
            priority: 15,
            chunks: 'all',
          },
          
          // Charts and visualization
          charts: {
            test: /[\\/]node_modules[\\/](chart\.js|react-chartjs-2|d3|recharts)[\\/]/,
            name: 'charts-vendor',
            priority: 15,
            chunks: 'all',
          },
          
          // Utilities
          utils: {
            test: /[\\/]node_modules[\\/](lodash|moment|date-fns|axios)[\\/]/,
            name: 'utils-vendor',
            priority: 15,
            chunks: 'all',
          }
        },
      },
      
      // Runtime chunk
      runtimeChunk: {
        name: 'runtime',
      },
      
      // Enhanced minification
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            compress: {
              drop_console: true,
              drop_debugger: true,
              pure_funcs: ['console.log', 'console.info', 'console.debug'],
            },
            mangle: {
              safari10: true,
            },
            format: {
              comments: false,
            },
          },
          extractComments: false,
        }),
      ],
      
      // Module concatenation
      concatenateModules: true,
      
      // Tree shaking
      usedExports: true,
      sideEffects: false,
    };
    
    // Performance hints
    config.performance = {
      maxAssetSize: 512000, // 500kb
      maxEntrypointSize: 512000, // 500kb
      hints: 'warning',
    };
  }
  
  // Resolve configuration
  config.resolve = {
    ...config.resolve,
    alias: {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@hooks': path.resolve(__dirname, 'src/hooks'),
      '@services': path.resolve(__dirname, 'src/services'),
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@types': path.resolve(__dirname, 'src/types'),
    },
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
  };
  
  return config;
};

// Image optimization
const imageOptimization = addWebpackModuleRule({
  test: /\.(png|jpe?g|gif|webp|svg)$/i,
  type: 'asset',
  parser: {
    dataUrlCondition: {
      maxSize: 8 * 1024, // 8KB inline limit
    },
  },
  generator: {
    filename: 'static/media/[name].[contenthash:8][ext]',
  },
  use: [
    {
      loader: 'image-webpack-loader',
      options: {
        mozjpeg: {
          progressive: true,
          quality: 85,
        },
        optipng: {
          enabled: false,
        },
        pngquant: {
          quality: [0.8, 0.9],
          speed: 4,
        },
        gifsicle: {
          interlaced: false,
        },
        webp: {
          quality: 85,
        },
      },
    },
  ],
});

// Service Worker configuration
const serviceWorkerConfig = (config) => {
  if (process.env.NODE_ENV === 'production') {
    // Enable service worker
    config.plugins = config.plugins || [];
    
    // Add workbox service worker
    const WorkboxPlugin = require('workbox-webpack-plugin');
    
    config.plugins.push(
      new WorkboxPlugin.GenerateSW({
        clientsClaim: true,
        skipWaiting: true,
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets',
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
          {
            urlPattern: /^https:\/\/api\./,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 5, // 5 minutes
              },
            },
          },
          {
            urlPattern: /\.(?:js|css|html)$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'static-resources',
            },
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
        ],
      })
    );
  }
  
  return config;
};

// Plugin configurations
const plugins = [
  // Module Federation plugin (always enabled)
  addWebpackPlugin(new ModuleFederationPlugin(moduleFederationConfig)),

  // Compression plugin for gzip
  process.env.NODE_ENV === 'production' &&
    addWebpackPlugin(
      new CompressionPlugin({
        algorithm: 'gzip',
        test: /\.(js|css|html|svg)$/,
        threshold: 8192,
        minRatio: 0.8,
        compressionOptions: {
          level: 9,
        },
      })
    ),
  
  // Brotli compression
  process.env.NODE_ENV === 'production' &&
    addWebpackPlugin(
      new CompressionPlugin({
        filename: '[path][base].br',
        algorithm: 'brotliCompress',
        test: /\.(js|css|html|svg)$/,
        compressionOptions: {
          level: 11,
        },
        threshold: 8192,
        minRatio: 0.8,
      })
    ),
  
  // Bundle analyzer (when ANALYZE=true)
  shouldAnalyze &&
    addWebpackPlugin(
      new BundleAnalyzerPlugin({
        analyzerMode: 'server',
        openAnalyzer: true,
        generateStatsFile: true,
        statsFilename: 'bundle-stats.json',
      })
    ),
].filter(Boolean);

// Development enhancements
const developmentConfig = (config) => {
  if (process.env.NODE_ENV === 'development') {
    // Hot reload optimization
    config.optimization = {
      ...config.optimization,
      moduleIds: 'named',
      chunkIds: 'named',
    };
    
    // Source map optimization
    config.devtool = 'eval-cheap-module-source-map';
    
    // Development server optimization
    if (config.devServer) {
      config.devServer = {
        ...config.devServer,
        hot: true,
        compress: true,
        historyApiFallback: true,
        client: {
          overlay: {
            errors: true,
            warnings: false,
          },
        },
      };
    }
  }
  
  return config;
};

// CSS optimization
const cssOptimization = (config) => {
  if (process.env.NODE_ENV === 'production') {
    // Find the CSS extraction plugin
    const MiniCssExtractPlugin = require('mini-css-extract-plugin');
    const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
    
    // Add CSS minimizer
    config.optimization.minimizer = config.optimization.minimizer || [];
    config.optimization.minimizer.push(
      new CssMinimizerPlugin({
        minimizerOptions: {
          preset: [
            'default',
            {
              discardComments: { removeAll: true },
              normalizeWhitespace: true,
            },
          ],
        },
      })
    );
    
    // Configure CSS extraction
    const cssExtractPlugin = config.plugins.find(
      plugin => plugin instanceof MiniCssExtractPlugin
    );
    
    if (cssExtractPlugin) {
      cssExtractPlugin.options = {
        ...cssExtractPlugin.options,
        filename: 'static/css/[name].[contenthash:8].css',
        chunkFilename: 'static/css/[name].[contenthash:8].chunk.css',
      };
    }
  }
  
  return config;
};

// Main configuration override
module.exports = override(
  performanceConfig,
  imageOptimization,
  serviceWorkerConfig,
  developmentConfig,
  cssOptimization,
  ...plugins,
  
  // Custom webpack configuration
  (config) => {
    // Output configuration
    config.output = {
      ...config.output,
      filename: 'static/js/[name].[contenthash:8].js',
      chunkFilename: 'static/js/[name].[contenthash:8].chunk.js',
    };
    
    // Module rules optimization
    config.module.rules = config.module.rules.map(rule => {
      // Optimize JS/TS processing
      if (rule.test && rule.test.toString().includes('tsx?')) {
        return {
          ...rule,
          exclude: /node_modules/,
          use: [
            ...rule.use,
            {
              loader: 'thread-loader',
              options: {
                workers: require('os').cpus().length - 1,
              },
            },
          ],
        };
      }
      
      return rule;
    });
    
    // Performance monitoring in development
    if (process.env.NODE_ENV === 'development') {
      config.plugins.push({
        apply: (compiler) => {
          compiler.hooks.done.tap('PerformanceMonitoring', (stats) => {
            const buildTime = stats.endTime - stats.startTime;
            console.log(`\n📊 Build Performance:`);
            console.log(`   Build time: ${buildTime}ms`);
            console.log(`   Modules: ${stats.compilation.modules.size}`);
            console.log(`   Assets: ${Object.keys(stats.compilation.assets).length}`);
            
            // Warn about slow builds
            if (buildTime > 10000) {
              console.warn(`⚠️  Slow build detected (${buildTime}ms)`);
            }
          });
        },
      });
    }
    
    return config;
  }
);