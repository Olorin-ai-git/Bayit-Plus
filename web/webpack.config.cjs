const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');

// Main source code configuration
const babelLoaderConfiguration = {
  test: /\.(js|jsx|ts|tsx)$/,
  include: [
    path.resolve(__dirname, 'src'),
    path.resolve(__dirname, 'index.web.js'),
    // Include shared components
    path.resolve(__dirname, '../shared/components'),
  ],
  use: {
    loader: 'babel-loader',
    options: {
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

// Node modules that need transpilation for react-native-web
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

// CSS with PostCSS for Tailwind (during migration)
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

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
  entry: './index.web.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: isProduction ? 'bundle.[contenthash].js' : 'bundle.js',
    publicPath: '/',
    clean: true,
  },
  resolve: {
    extensions: ['.web.tsx', '.web.ts', '.web.jsx', '.web.js', '.tsx', '.ts', '.jsx', '.js', '.json'],
    // Allow shared components to resolve node_modules from this directory
    modules: [
      path.resolve(__dirname, 'node_modules'),
      'node_modules',
    ],
    alias: {
      // React Native Web
      'react-native$': 'react-native-web',
      'react-native-linear-gradient': 'react-native-web-linear-gradient',
      // AsyncStorage web shim
      '@react-native-async-storage/async-storage': path.resolve(__dirname, 'src/utils/asyncStorageWeb.ts'),
      // Path aliases (from vite.config.js)
      '@': path.resolve(__dirname, 'src'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@pages': path.resolve(__dirname, 'src/pages'),
      '@hooks': path.resolve(__dirname, 'src/hooks'),
      '@services': path.resolve(__dirname, 'src/services'),
      '@stores': path.resolve(__dirname, 'src/stores'),
      '@utils': path.resolve(__dirname, 'src/utils'),
      // Shared components
      '@bayit/shared': path.resolve(__dirname, '../shared/components'),
    },
  },
  module: {
    rules: [
      babelLoaderConfiguration,
      nodeModulesConfiguration,
      imageLoaderConfiguration,
      fontLoaderConfiguration,
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
    }),
  ],
  devServer: {
    static: {
      directory: path.join(__dirname, 'public'),
      publicPath: '/',
    },
    port: 3000,
    hot: true,
    historyApiFallback: {
      disableDotRule: true,
      rewrites: [
        { from: /\.js$/, to: context => context.parsedUrl.pathname },
        { from: /\.css$/, to: context => context.parsedUrl.pathname },
        { from: /\.json$/, to: context => context.parsedUrl.pathname },
        { from: /./, to: '/index.html' },
      ],
    },
    open: true,
    proxy: [
      {
        context: ['/api'],
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    ],
  },
  performance: {
    hints: false,
  },
};
};
