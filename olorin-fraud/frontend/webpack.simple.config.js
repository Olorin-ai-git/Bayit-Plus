const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

module.exports = (env, argv) => {
  const isDevelopment = argv.mode === 'development';

  return {
    mode: isDevelopment ? 'development' : 'production',

    entry: './src/shell/bootstrap.tsx',

    devtool: isDevelopment ? 'eval-source-map' : 'source-map',

    resolve: {
      extensions: ['.tsx', '.ts', '.jsx', '.js', '.json'],
      plugins: [
        new TsconfigPathsPlugin({
          configFile: path.resolve(__dirname, 'tsconfig.json')
        })
      ],
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@microservices': path.resolve(__dirname, 'src/microservices'),
        '@shared': path.resolve(__dirname, 'src/shared'),
        '@shell': path.resolve(__dirname, 'src/shell')
      }
    },

    module: {
      rules: [
        {
          test: /\.tsx?$/,
          exclude: /node_modules/,
          use: [
            {
              loader: 'ts-loader',
              options: {
                transpileOnly: true,
                configFile: path.resolve(__dirname, 'tsconfig.json')
              }
            }
          ]
        },
        {
          test: /\.css$/,
          use: [
            'style-loader',
            'css-loader',
            {
              loader: 'postcss-loader',
              options: {
                postcssOptions: {
                  plugins: [
                    require('tailwindcss'),
                    require('autoprefixer')
                  ]
                }
              }
            }
          ]
        },
        {
          test: /\.(png|jpe?g|gif|svg|ico)$/i,
          type: 'asset/resource',
          generator: {
            filename: 'assets/images/[name].[hash][ext]'
          }
        },
        {
          test: /\.(woff|woff2|eot|ttf|otf)$/i,
          type: 'asset/resource',
          generator: {
            filename: 'assets/fonts/[name].[hash][ext]'
          }
        }
      ]
    },

    plugins: [
      new CleanWebpackPlugin(),

      new HtmlWebpackPlugin({
        template: './public/index.html',
        title: 'Olorin Shell - Simple Mode',
        favicon: './public/favicon.ico'
      }),

      new (require('webpack').DefinePlugin)({
        'process.env.NODE_ENV': JSON.stringify(argv.mode || 'production'),
        'process.env.SERVICE_NAME': JSON.stringify('shell'),
        'process.env.SERVICE_PORT': JSON.stringify(3000),
        'process.env.REACT_APP_ENV': JSON.stringify(process.env.REACT_APP_ENV || 'production'),
        'process.env.REACT_APP_VERSION': JSON.stringify(process.env.REACT_APP_VERSION || '1.0.0'),
        'process.env.REACT_APP_SERVICE_NAME': JSON.stringify(process.env.REACT_APP_SERVICE_NAME || 'olorin-investigation'),
        'process.env.REACT_APP_API_BASE_URL': JSON.stringify(process.env.REACT_APP_API_BASE_URL || 'https://api.olorin.ai'),
        'process.env.REACT_APP_API_VERSION': JSON.stringify(process.env.REACT_APP_API_VERSION || 'v1'),
        'process.env.REACT_APP_WS_URL': JSON.stringify(process.env.REACT_APP_WS_URL || 'wss://api.olorin.ai'),
        'process.env.REACT_APP_FRONTEND_PORT': JSON.stringify(process.env.REACT_APP_FRONTEND_PORT || '443'),
        // Polling config
        'process.env.REACT_APP_POLLING_BASE_INTERVAL_MS': JSON.stringify(process.env.REACT_APP_POLLING_BASE_INTERVAL_MS || '5000'),
        'process.env.REACT_APP_POLLING_FAST_INTERVAL_MS': JSON.stringify(process.env.REACT_APP_POLLING_FAST_INTERVAL_MS || '5000'),
        'process.env.REACT_APP_POLLING_SLOW_INTERVAL_MS': JSON.stringify(process.env.REACT_APP_POLLING_SLOW_INTERVAL_MS || '30000'),
        'process.env.REACT_APP_POLLING_MAX_RETRIES': JSON.stringify(process.env.REACT_APP_POLLING_MAX_RETRIES || '3'),
        'process.env.REACT_APP_POLLING_BACKOFF_MULTIPLIER': JSON.stringify(process.env.REACT_APP_POLLING_BACKOFF_MULTIPLIER || '2'),
        'process.env.REACT_APP_POLLING_MAX_BACKOFF_MS': JSON.stringify(process.env.REACT_APP_POLLING_MAX_BACKOFF_MS || '60000'),
        // Feature flags
        'process.env.REACT_APP_FEATURE_ENABLE_RAG': JSON.stringify(process.env.REACT_APP_FEATURE_ENABLE_RAG || 'true'),
        'process.env.REACT_APP_FEATURE_ENABLE_REAL_TIME_UPDATES': JSON.stringify(process.env.REACT_APP_FEATURE_ENABLE_REAL_TIME_UPDATES || 'false'),
        'process.env.REACT_APP_FEATURE_ENABLE_MICROSERVICES': JSON.stringify(process.env.REACT_APP_FEATURE_ENABLE_MICROSERVICES || 'false'),
        'process.env.REACT_APP_FEATURE_ENABLE_WIZARD': JSON.stringify(process.env.REACT_APP_FEATURE_ENABLE_WIZARD || 'true'),
        'process.env.REACT_APP_FEATURE_ENABLE_TEMPLATES': JSON.stringify(process.env.REACT_APP_FEATURE_ENABLE_TEMPLATES || 'true'),
        'process.env.REACT_APP_FEATURE_ENABLE_MULTI_ENTITY': JSON.stringify(process.env.REACT_APP_FEATURE_ENABLE_MULTI_ENTITY || 'true'),
        'process.env.REACT_APP_FEATURE_ENABLE_LLM_INSIGHTS': JSON.stringify(process.env.REACT_APP_FEATURE_ENABLE_LLM_INSIGHTS || 'true'),
        'process.env.REACT_APP_FEATURE_ENABLE_RELATIONSHIP_GRAPH': JSON.stringify(process.env.REACT_APP_FEATURE_ENABLE_RELATIONSHIP_GRAPH || 'true'),
        'process.env.REACT_APP_FEATURE_ENABLE_STATE_PERSISTENCE': JSON.stringify(process.env.REACT_APP_FEATURE_ENABLE_STATE_PERSISTENCE || 'true'),
        'process.env.REACT_APP_FEATURE_ENABLE_OPTIMISTIC_LOCKING': JSON.stringify(process.env.REACT_APP_FEATURE_ENABLE_OPTIMISTIC_LOCKING || 'true'),
        'process.env.REACT_APP_FEATURE_ENABLE_AUDIT_LOG': JSON.stringify(process.env.REACT_APP_FEATURE_ENABLE_AUDIT_LOG || 'true'),
        'process.env.REACT_APP_FEATURE_ENABLE_POLLING': JSON.stringify(process.env.REACT_APP_FEATURE_ENABLE_POLLING || 'true'),
        'process.env.REACT_APP_FEATURE_ENABLE_AUTONOMOUS_MODE': JSON.stringify(process.env.REACT_APP_FEATURE_ENABLE_AUTONOMOUS_MODE || 'true'),
        'process.env.REACT_APP_FEATURE_ENABLE_MOCK_DATA': JSON.stringify(process.env.REACT_APP_FEATURE_ENABLE_MOCK_DATA || 'false'),
        // UI config
        'process.env.REACT_APP_PAGINATION_SIZE': JSON.stringify(process.env.REACT_APP_PAGINATION_SIZE || '20'),
        'process.env.REACT_APP_REQUEST_TIMEOUT_MS': JSON.stringify(process.env.REACT_APP_REQUEST_TIMEOUT_MS || '30000'),
        // Wizard config
        'process.env.REACT_APP_MAX_ENTITIES': JSON.stringify(process.env.REACT_APP_MAX_ENTITIES || '50'),
        'process.env.REACT_APP_MAX_TOOLS': JSON.stringify(process.env.REACT_APP_MAX_TOOLS || '100'),
        'process.env.REACT_APP_DEFAULT_RISK_THRESHOLD': JSON.stringify(process.env.REACT_APP_DEFAULT_RISK_THRESHOLD || '50'),
        'process.env.REACT_APP_DEFAULT_CORRELATION_MODE': JSON.stringify(process.env.REACT_APP_DEFAULT_CORRELATION_MODE || 'AND'),
        'process.env.REACT_APP_DEFAULT_EXECUTION_MODE': JSON.stringify(process.env.REACT_APP_DEFAULT_EXECUTION_MODE || 'parallel'),
        'process.env.REACT_APP_WIZARD_AUTO_SAVE_INTERVAL_MS': JSON.stringify(process.env.REACT_APP_WIZARD_AUTO_SAVE_INTERVAL_MS || '5000'),
        'process.env.REACT_APP_WIZARD_VALIDATION_DEBOUNCE_MS': JSON.stringify(process.env.REACT_APP_WIZARD_VALIDATION_DEBOUNCE_MS || '300'),
        'process.env.REACT_APP_WIZARD_PROGRESS_UPDATE_INTERVAL_MS': JSON.stringify(process.env.REACT_APP_WIZARD_PROGRESS_UPDATE_INTERVAL_MS || '1000')
      })
    ],

    devServer: {
      port: 3000,
      hot: true,
      liveReload: true,
      historyApiFallback: true,
      allowedHosts: 'all',
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization'
      },
      client: {
        overlay: {
          errors: true,
          warnings: true
        },
        logging: 'info',
        progress: true,
        reconnect: 5
      },
      static: {
        directory: path.join(__dirname, 'public'),
        publicPath: '/',
        watch: {
          ignored: /node_modules/,
          usePolling: false,
          interval: 100
        }
      },
      devMiddleware: {
        stats: {
          preset: 'minimal',
          colors: true,
          chunks: false,
          modules: false,
          children: false,
          timings: true,
          assets: true
        },
        writeToDisk: false
      },
      compress: true,
      open: true
    },

    optimization: {
      minimize: !isDevelopment,
      splitChunks: {
        chunks: 'async',
        minSize: isDevelopment ? 0 : 20000,
        maxSize: isDevelopment ? 0 : 244000,
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 10,
            enforce: true,
            reuseExistingChunk: true
          }
        }
      }
    },

    output: {
      path: path.resolve(__dirname, 'dist', 'shell'),
      filename: isDevelopment ? '[name].js' : '[name].[contenthash].js',
      chunkFilename: isDevelopment ? '[name].chunk.js' : '[name].[contenthash].chunk.js',
      publicPath: '/',
      clean: true
    },

    performance: {
      hints: !isDevelopment ? 'warning' : false,
      maxAssetSize: 512000,
      maxEntrypointSize: 512000
    },

    stats: {
      colors: true,
      chunks: false,
      chunkModules: false,
      modules: false,
      children: false
    }
  };
};