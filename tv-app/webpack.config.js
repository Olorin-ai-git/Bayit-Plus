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
    path.resolve(__dirname, '../shared'),
  ],
  use: {
    loader: 'babel-loader',
    options: {
      // Don't use babel.config.js (it has NativeWind which is native-only)
      babelrc: false,
      configFile: false,
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
  include: /node_modules\/(react-native-web|react-native-safe-area-context|react-native-screens|@react-native|@expo|expo-linear-gradient|expo-font|expo-asset|expo-modules-core)/,
  exclude: /node_modules\/@react-navigation/,
  use: {
    loader: 'babel-loader',
    options: {
      babelrc: false,
      configFile: false,
      presets: [
        ['@babel/preset-env', {
          loose: true,
          modules: false,
          targets: { browsers: ['last 2 versions'] }
        }],
        ['@babel/preset-react', { runtime: 'automatic' }],
        '@babel/preset-typescript',
        '@babel/preset-flow',
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

const videoLoaderConfiguration = {
  test: /\.(mp4|webm|ogg|mp3|wav|flac|aac)$/,
  type: 'asset/resource',
  generator: {
    filename: 'media/[name][ext]',
  },
};

const cssLoaderConfiguration = {
  test: /\.css$/,
  use: ['style-loader', 'css-loader', 'postcss-loader'],
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
      // Sentry web shim - @sentry/react-native doesn't work on web
      '@sentry/react-native': path.resolve(__dirname, 'src/utils/sentryWebShim.ts'),
      // Shared packages - exact matches with $ suffix, specific paths without
      '@bayit/shared/components/ErrorBoundary': path.resolve(__dirname, '../shared/components/ErrorBoundary'),
      '@bayit/shared/components/ai': path.resolve(__dirname, '../shared/components/ai'),
      '@bayit/shared/components/ui': path.resolve(__dirname, '../shared/components/ui'),
      '@bayit/shared/components/support': path.resolve(__dirname, '../shared/components/support'),
      '@bayit/shared/components$': path.resolve(__dirname, '../shared/components'),
      '@bayit/shared/components': path.resolve(__dirname, '../shared/components'),
      '@bayit/shared/utils/logger$': path.resolve(__dirname, '../shared/utils/logger.ts'),
      '@bayit/shared/utils/logger': path.resolve(__dirname, '../shared/utils/logger.ts'),
      '@bayit/shared/utils$': path.resolve(__dirname, '../shared/utils'),
      '@bayit/shared/utils': path.resolve(__dirname, '../shared/utils'),
      '@bayit/shared/ui': path.resolve(__dirname, '../shared/components/ui'),
      '@bayit/shared/theme': path.resolve(__dirname, '../shared/theme'),
      '@bayit/shared/stores': path.resolve(__dirname, '../shared/stores'),
      '@bayit/shared/services': path.resolve(__dirname, '../shared/services'),
      '@bayit/shared/hooks$': path.resolve(__dirname, '../shared/hooks'),
      '@bayit/shared/hooks': path.resolve(__dirname, '../shared/hooks'),
      '@bayit/shared/admin': path.resolve(__dirname, '../shared/components/admin'),
      '@bayit/shared$': path.resolve(__dirname, '../shared/components'),
      '@bayit/shared/chat': path.resolve(__dirname, '../shared/components/chat'),
      '@bayit/shared/watchparty': path.resolve(__dirname, '../shared/components/watchparty'),
      '@bayit/shared-screens': path.resolve(__dirname, '../shared/screens'),
      '@bayit/shared-assets': path.resolve(__dirname, '../shared/assets'),
      '@bayit/shared-services': path.resolve(__dirname, '../shared/services'),
      '@bayit/shared-stores': path.resolve(__dirname, '../shared/stores'),
      '@bayit/shared-hooks': path.resolve(__dirname, '../shared/hooks'),
      '@bayit/shared-contexts': path.resolve(__dirname, '../shared/contexts'),
      '@bayit/shared-i18n': path.resolve(__dirname, '../shared/i18n'),
      '@bayit/shared-config': path.resolve(__dirname, '../shared/config'),
      '@bayit/shared-utils': path.resolve(__dirname, '../shared/utils'),
    },
    // Allow shared components to resolve node_modules from this directory
    modules: [
      path.resolve(__dirname, 'node_modules'),
      'node_modules',
    ],
  },
  module: {
    rules: [
      // Media assets first - before any other loaders
      videoLoaderConfiguration,
      imageLoaderConfiguration,
      fontLoaderConfiguration,
      // Code transpilation
      babelLoaderConfiguration,
      nodeModulesConfiguration,
      cssLoaderConfiguration,
      esmFixConfiguration,
    ],
  },
  plugins: [
    new webpack.DefinePlugin({
      __DEV__: process.env.NODE_ENV !== 'production',
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
      'process.env': JSON.stringify({}),
    }),
    new webpack.ProvidePlugin({
      process: 'process/browser',
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
    port: 3001,
    hot: true,
    historyApiFallback: true,
    open: true,
    // Explicitly set permissive headers to avoid COEP blocking external images
    // Note: SharedArrayBuffer won't work without COEP, but Porcupine falls back to ArrayBuffer
    headers: {
      'Cross-Origin-Opener-Policy': 'unsafe-none',
      'Cross-Origin-Embedder-Policy': 'unsafe-none',
    },
    proxy: [
      {
        context: ['/api', '/uploads'],
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    ],
  },
  performance: {
    hints: false,
  },
};
