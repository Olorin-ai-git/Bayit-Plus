/**
 * Webpack Configuration for Autonomous Investigation Microservice
 * Module Federation setup for independent deployment and runtime composition
 */

const ModuleFederationPlugin = require('@module-federation/webpack');
const path = require('path');

const packageJson = require('../../../../../package.json');

// Extract dependencies for sharing
const deps = packageJson.dependencies;
const devDeps = packageJson.devDependencies;

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  const isDevelopment = !isProduction;

  return {
    name: 'autonomous_investigation',
    mode: isProduction ? 'production' : 'development',

    entry: './src/microservices/autonomous-investigation/index.tsx',

    target: 'web',

    resolve: {
      extensions: ['.tsx', '.ts', '.jsx', '.js', '.json'],
      alias: {
        '@': path.resolve(__dirname, '../'),
        '@shared': path.resolve(__dirname, '../../shared'),
        '@components': path.resolve(__dirname, '../components'),
        '@services': path.resolve(__dirname, '../services'),
        '@hooks': path.resolve(__dirname, '../hooks'),
        '@stores': path.resolve(__dirname, '../stores'),
        '@types': path.resolve(__dirname, '../types'),
        '@config': path.resolve(__dirname, '../config'),
        '@utils': path.resolve(__dirname, '../utils'),
      },
    },

    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: [
            {
              loader: 'ts-loader',
              options: {
                configFile: path.resolve(__dirname, '../tsconfig.json'),
                transpileOnly: isDevelopment,
              },
            },
          ],
          exclude: /node_modules/,
        },
        {
          test: /\.jsx?$/,
          use: [
            {
              loader: 'babel-loader',
              options: {
                presets: [
                  ['@babel/preset-env', { targets: 'defaults' }],
                  ['@babel/preset-react', { runtime: 'automatic' }],
                ],
              },
            },
          ],
          exclude: /node_modules/,
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
                    require('autoprefixer'),
                  ],
                },
              },
            },
          ],
        },
        {
          test: /\.(png|jpg|jpeg|gif|svg|webp)$/i,
          type: 'asset/resource',
          generator: {
            filename: 'assets/images/[name].[hash][ext]',
          },
        },
        {
          test: /\.(woff|woff2|eot|ttf|otf)$/i,
          type: 'asset/resource',
          generator: {
            filename: 'assets/fonts/[name].[hash][ext]',
          },
        },
      ],
    },

    plugins: [
      new ModuleFederationPlugin({
        name: 'autonomous_investigation',
        filename: 'remoteEntry.js',

        // Expose components and services
        exposes: {
          './AutonomousInvestigationApp': './src/microservices/autonomous-investigation/AutonomousInvestigationApp.tsx',
          './InvestigationDashboard': './src/microservices/autonomous-investigation/components/InvestigationDashboard.tsx',
          './ConceptSwitcher': './src/microservices/autonomous-investigation/components/ConceptSwitcher.tsx',
          './GraphVisualization': './src/microservices/autonomous-investigation/components/GraphVisualization.tsx',
          './TimelineView': './src/microservices/autonomous-investigation/components/TimelineView.tsx',
          './AutonomousControls': './src/microservices/autonomous-investigation/components/AutonomousControls.tsx',
          './EventBusIntegration': './src/microservices/autonomous-investigation/services/eventBusIntegration.ts',
          './AuthIntegration': './src/microservices/autonomous-investigation/services/authIntegration.ts',
          './MonitoringIntegration': './src/microservices/autonomous-investigation/services/monitoringIntegration.ts',
          './Types': './src/microservices/autonomous-investigation/types/index.ts',
        },

        // Remote dependencies from other microservices
        remotes: {
          shell: 'shell@http://localhost:3000/remoteEntry.js',
          core_ui: 'core_ui@http://localhost:3006/remoteEntry.js',
          investigation: 'investigation@http://localhost:3001/remoteEntry.js',
          agent_analytics: 'agent_analytics@http://localhost:3002/remoteEntry.js',
          visualization: 'visualization@http://localhost:3004/remoteEntry.js',
          reporting: 'reporting@http://localhost:3005/remoteEntry.js',
        },

        // Shared dependencies
        shared: {
          // React ecosystem
          'react': {
            singleton: true,
            requiredVersion: deps.react,
            eager: false,
          },
          'react-dom': {
            singleton: true,
            requiredVersion: deps['react-dom'],
            eager: false,
          },
          'react-router-dom': {
            singleton: true,
            requiredVersion: deps['react-router-dom'],
            eager: false,
          },

          // State management
          'zustand': {
            singleton: true,
            requiredVersion: deps.zustand,
            eager: false,
          },

          // Utilities
          'lodash': {
            singleton: false,
            requiredVersion: deps.lodash,
            eager: false,
          },
          'date-fns': {
            singleton: false,
            requiredVersion: deps['date-fns'],
            eager: false,
          },

          // Validation
          'zod': {
            singleton: true,
            requiredVersion: deps.zod,
            eager: false,
          },

          // Event handling
          'mitt': {
            singleton: true,
            requiredVersion: deps.mitt,
            eager: false,
          },

          // Graph libraries
          'vis-network': {
            singleton: false,
            requiredVersion: deps['vis-network'],
            eager: false,
          },
          'd3': {
            singleton: false,
            requiredVersion: deps.d3,
            eager: false,
          },

          // HTTP client
          'axios': {
            singleton: true,
            requiredVersion: deps.axios,
            eager: false,
          },

          // Tailwind CSS
          'tailwindcss': {
            singleton: true,
            requiredVersion: devDeps.tailwindcss,
            eager: false,
          },

          // Shared modules from our codebase
          '@shared/events/eventBus': {
            singleton: true,
            eager: false,
          },
          '@shared/monitoring/PerformanceMonitor': {
            singleton: true,
            eager: false,
          },
          '@shared/components': {
            singleton: false,
            eager: false,
          },
        },
      }),
    ],

    optimization: {
      minimize: isProduction,
      splitChunks: {
        chunks: 'async',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
          shared: {
            test: /[\\/]src[\\/]shared[\\/]/,
            name: 'shared',
            chunks: 'all',
          },
        },
      },
    },

    devServer: {
      port: 3007, // Autonomous investigation microservice port
      host: '0.0.0.0',
      allowedHosts: 'all',
      historyApiFallback: true,
      hot: true,
      static: {
        directory: path.join(__dirname, '../public'),
      },
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization',
      },
      client: {
        logging: 'warn',
        overlay: {
          errors: true,
          warnings: false,
        },
      },
    },

    output: {
      path: path.resolve(__dirname, '../dist'),
      filename: isProduction ? '[name].[contenthash].js' : '[name].js',
      chunkFilename: isProduction ? '[name].[contenthash].chunk.js' : '[name].chunk.js',
      publicPath: isProduction
        ? '/autonomous-investigation/'
        : 'http://localhost:3007/',
      clean: isProduction,
    },

    devtool: isDevelopment ? 'eval-source-map' : 'source-map',

    performance: {
      hints: isProduction ? 'warning' : false,
      maxEntrypointSize: 512000,
      maxAssetSize: 512000,
    },

    cache: {
      type: 'filesystem',
      cacheDirectory: path.resolve(__dirname, '../node_modules/.cache/webpack'),
    },

    stats: {
      errorDetails: true,
      modules: false,
      chunks: false,
      assets: true,
      timings: true,
    },
  };
};