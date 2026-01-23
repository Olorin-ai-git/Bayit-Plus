const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

// Load environment variables from .env file
require('dotenv').config();

const isDevelopment = process.env.NODE_ENV !== 'production';
const packagesPath = path.resolve(__dirname, '../packages/ui');

// Collect all VITE_ prefixed environment variables for import.meta.env
function getViteEnvVars() {
  const envVars = {};
  Object.keys(process.env).forEach((key) => {
    if (key.startsWith('VITE_')) {
      envVars[key] = process.env[key];
    }
  });
  return envVars;
}

module.exports = {
  entry: './src/main.tsx',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: isDevelopment ? '[name].js' : '[name].[contenthash].js',
    publicPath: '/',
    clean: true,
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.jsx', '.js', '.json'],
    alias: {
      // @olorin packages from packages/ui directory (no /src - files are in root)
      '@olorin/design-tokens': path.resolve(packagesPath, 'design-tokens'),
      '@olorin/shared-hooks': path.resolve(packagesPath, 'shared-hooks'),
      '@olorin/shared-i18n': path.resolve(packagesPath, 'shared-i18n'),
      '@olorin/shared-services': path.resolve(packagesPath, 'shared-services'),
      '@olorin/shared-stores': path.resolve(packagesPath, 'shared-stores'),
      // Local aliases
      '@': path.resolve(__dirname, 'src'),
    },
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx|js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              '@babel/preset-react',
              '@babel/preset-typescript',
            ],
          },
        },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader', 'postcss-loader'],
      },
      {
        test: /\.(png|jpg|jpeg|gif|svg)$/i,
        type: 'asset/resource',
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource',
      },
    ],
  },
  plugins: [
    // Define import.meta.env for Vite compatibility
    new webpack.DefinePlugin({
      'import.meta.env': JSON.stringify({
        ...getViteEnvVars(),
        MODE: isDevelopment ? 'development' : 'production',
        DEV: isDevelopment,
        PROD: !isDevelopment,
      }),
    }),
    new HtmlWebpackPlugin({
      template: './index.html',
      inject: true,
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'public',
          to: '',
          noErrorOnMissing: true,
        },
      ],
    }),
  ],
  devServer: {
    port: 3211,
    hot: true,
    historyApiFallback: true,
    static: {
      directory: path.join(__dirname, 'public'),
    },
    client: {
      overlay: {
        errors: true,
        warnings: false,
      },
    },
  },
  devtool: isDevelopment ? 'eval-source-map' : 'source-map',
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
      },
    },
  },
};
