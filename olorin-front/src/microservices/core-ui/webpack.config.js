const ModuleFederationPlugin = require('@module-federation/webpack');
const path = require('path');

module.exports = {
  mode: 'development',
  devServer: {
    port: 3000,
    historyApiFallback: true,
    hot: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },

  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    alias: {
      '@': path.resolve(__dirname, './'),
      '@shared': path.resolve(__dirname, '../shared'),
    },
  },

  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'ts-loader',
          options: {
            transpileOnly: true,
          },
        },
      },
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', { targets: 'defaults' }],
              ['@babel/preset-react', { runtime: 'automatic' }],
              '@babel/preset-typescript',
            ],
          },
        },
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
        test: /\.(png|jpe?g|gif|svg)$/,
        type: 'asset/resource',
      },
    ],
  },

  plugins: [
    new ModuleFederationPlugin({
      name: 'core_ui',
      filename: 'remoteEntry.js',

      // Expose the shell application
      exposes: {
        './App': './CoreUIApp.tsx',
        './Layout': './components/MainLayout.tsx',
        './Auth': './components/AuthProvider.tsx',
      },

      // Remote modules this shell will consume
      remotes: {
        'structured-investigation': 'structured_investigation@http://localhost:3001/remoteEntry.js',
        'manual-investigation': 'manual_investigation@http://localhost:3002/remoteEntry.js',
        'agent-analytics': 'agent_analytics@http://localhost:3003/remoteEntry.js',
        'rag-intelligence': 'rag_intelligence@http://localhost:3004/remoteEntry.js',
        'visualization': 'visualization@http://localhost:3005/remoteEntry.js',
        'reporting': 'reporting@http://localhost:3006/remoteEntry.js',
        'design-system': 'design_system@http://localhost:3007/remoteEntry.js',
        'analytics': 'analytics@http://localhost:3008/remoteEntry.js',
      },

      // Shared dependencies
      shared: {
        react: {
          singleton: true,
          eager: true,
          requiredVersion: '^18.2.0',
        },
        'react-dom': {
          singleton: true,
          eager: true,
          requiredVersion: '^18.2.0',
        },
        'react-router-dom': {
          singleton: true,
          eager: true,
          requiredVersion: '^6.11.0',
        },
        '@heroicons/react': {
          singleton: true,
          eager: true,
        },
        axios: {
          singleton: true,
          eager: true,
        },
        mitt: {
          singleton: true,
          eager: true,
        },
        // Share Tailwind CSS classes
        tailwindcss: {
          singleton: true,
          eager: true,
        },
      },
    }),
  ],

  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
        shared: {
          name: 'shared',
          minChunks: 2,
          chunks: 'all',
          enforce: true,
        },
      },
    },
  },

  externals: {
    // Keep these external to reduce bundle size
    'react': 'React',
    'react-dom': 'ReactDOM',
  },
};