const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');

// Main source code configuration - let webpack handle modules
const babelLoaderConfiguration = {
  test: /\.(js|jsx|ts|tsx)$/,
  include: [
    path.resolve(__dirname, 'src'),
    path.resolve(__dirname, 'App.tsx'),
    path.resolve(__dirname, 'index.web.js'),
  ],
  use: {
    loader: 'babel-loader',
    options: {
      presets: [
        ['@babel/preset-env', { loose: true, modules: false }],
        ['@babel/preset-react', { runtime: 'automatic' }],
        '@babel/preset-typescript',
      ],
      plugins: [
        'react-native-web',
        ['@babel/plugin-transform-class-properties', { loose: true }],
        ['@babel/plugin-transform-private-methods', { loose: true }],
        ['@babel/plugin-transform-private-property-in-object', { loose: true }],
      ],
    },
  },
};

// Node modules that need transpilation (only react-native, not react-navigation which is already ESM)
const nodeModulesConfiguration = {
  test: /\.(js|jsx|ts|tsx)$/,
  include: /node_modules\/(react-native-web|react-native-safe-area-context|react-native-screens|@react-native)/,
  exclude: /node_modules\/@react-navigation/,
  use: {
    loader: 'babel-loader',
    options: {
      presets: [
        ['@babel/preset-env', {
          loose: true,
          modules: false,
          targets: { browsers: ['last 2 versions'] }
        }],
        ['@babel/preset-react', { runtime: 'automatic' }],
      ],
      plugins: [
        'react-native-web',
      ],
      sourceType: 'unambiguous',
    },
  },
};

const imageLoaderConfiguration = {
  test: /\.(gif|jpe?g|png|svg)$/,
  type: 'asset/resource',
};

const fontLoaderConfiguration = {
  test: /\.(woff|woff2|eot|ttf|otf)$/,
  type: 'asset/resource',
};

// Fix for ESM modules that don't specify extensions
const esmFixConfiguration = {
  test: /\.m?js/,
  resolve: {
    fullySpecified: false,
  },
};

module.exports = {
  entry: './index.web.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.[contenthash].js',
    publicPath: '/',
    clean: true,
  },
  resolve: {
    extensions: ['.web.tsx', '.web.ts', '.web.js', '.tsx', '.ts', '.js', '.json'],
    alias: {
      'react-native$': 'react-native-web',
      'react-native-linear-gradient': 'react-native-web-linear-gradient',
      // AsyncStorage web shim
      '@react-native-async-storage/async-storage': path.resolve(__dirname, 'src/utils/asyncStorageWeb.ts'),
    },
  },
  module: {
    rules: [
      babelLoaderConfiguration,
      nodeModulesConfiguration,
      imageLoaderConfiguration,
      fontLoaderConfiguration,
      esmFixConfiguration,
    ],
  },
  plugins: [
    new webpack.DefinePlugin({
      __DEV__: process.env.NODE_ENV !== 'production',
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    }),
    new HtmlWebpackPlugin({
      template: './public/index.html',
      favicon: './public/favicon.ico',
    }),
  ],
  devServer: {
    static: {
      directory: path.join(__dirname, 'public'),
    },
    port: 3000,
    hot: true,
    historyApiFallback: true,
    open: true,
  },
  performance: {
    hints: false,
  },
};
