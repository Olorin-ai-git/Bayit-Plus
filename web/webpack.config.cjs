const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

// Paths - use absolute paths to avoid resolution issues
const sharedPath = path.resolve(__dirname, '../shared');
const srcPath = path.resolve(__dirname, 'src');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  // Demo mode is controlled by VITE_APP_MODE env var, not webpack mode
  const isDemoMode = process.env.VITE_APP_MODE === 'demo';
  // TV platform targets
  const isWebOS = process.env.TARGET === 'webos';
  const isTizen = process.env.TARGET === 'tizen';
  const isTV = isWebOS || isTizen;

  // Determine output path based on target
  const getOutputPath = () => {
    if (isWebOS) return path.resolve(__dirname, '../webos/dist');
    if (isTizen) return path.resolve(__dirname, '../tizen/dist');
    return path.resolve(__dirname, 'dist');
  };

  return {
    entry: path.resolve(__dirname, 'index.web.js'),
    output: {
      path: getOutputPath(),
      filename: isProduction ? 'bundle.[contenthash].js' : 'bundle.js',
      // Use relative paths for TV apps (packaged), absolute for web
      publicPath: isTV ? './' : '/',
      clean: true,
    },
    // Set the context to web folder
    context: __dirname,
    resolve: {
      extensions: ['.web.tsx', '.web.ts', '.web.jsx', '.web.js', '.tsx', '.ts', '.jsx', '.js', '.json'],
      modules: [
        path.resolve(__dirname, 'node_modules'),
        'node_modules',
      ],
      alias: {
        // React Native Web
        'react-native$': 'react-native-web',
        'react-native-linear-gradient': 'react-native-web-linear-gradient',
        // Native module shims
        '@react-native-async-storage/async-storage': path.resolve(__dirname, 'src/utils/asyncStorageWeb.ts'),
        '@react-native-clipboard/clipboard': path.resolve(__dirname, 'src/utils/clipboardWeb.ts'),
        '@react-native/assets-registry/registry': path.resolve(__dirname, 'src/utils/assetsRegistryShim.js'),
        '@react-native/assets-registry': path.resolve(__dirname, 'src/utils/assetsRegistryShim.js'),
        // Local path aliases
        '@': srcPath,
        '@components': path.resolve(srcPath, 'components'),
        '@pages': path.resolve(srcPath, 'pages'),
        '@hooks': path.resolve(srcPath, 'hooks'),
        '@services': path.resolve(srcPath, 'services'),
        '@stores': path.resolve(srcPath, 'stores'),
        '@utils': path.resolve(srcPath, 'utils'),
        // Shared library aliases
        '@bayit/shared': path.resolve(sharedPath, 'components'),
        '@bayit/shared/components': path.resolve(sharedPath, 'components'),
        '@bayit/shared/components/ai': path.resolve(sharedPath, 'components/ai'),
        '@bayit/shared/components/flows': path.resolve(sharedPath, 'components/flows'),
        '@bayit/shared/ui': path.resolve(sharedPath, 'components/ui'),
        '@bayit/shared/theme': path.resolve(sharedPath, 'theme'),
        '@bayit/shared/stores': path.resolve(sharedPath, 'stores'),
        '@bayit/shared/services': path.resolve(sharedPath, 'services'),
        '@bayit/shared/hooks': path.resolve(sharedPath, 'hooks'),
        '@bayit/shared/watchparty': path.resolve(sharedPath, 'components/watchparty'),
        '@bayit/shared/chat': path.resolve(sharedPath, 'components/chat'),
        '@bayit/shared/admin': path.resolve(sharedPath, 'components/admin'),
        '@bayit/shared-hooks': path.resolve(sharedPath, 'hooks'),
        '@bayit/shared-services': path.resolve(sharedPath, 'services'),
        '@bayit/shared-stores': path.resolve(sharedPath, 'stores'),
        '@bayit/shared-contexts': path.resolve(sharedPath, 'contexts'),
        '@bayit/shared-i18n': path.resolve(sharedPath, 'i18n'),
        '@bayit/shared-styles/globals.css': path.resolve(sharedPath, 'styles/globals.css'),
        '@bayit/shared-styles': path.resolve(sharedPath, 'styles'),
        '@bayit/shared-config': path.resolve(sharedPath, 'config'),
        '@bayit/shared-types': path.resolve(sharedPath, 'types'),
        '@bayit/shared-utils': path.resolve(sharedPath, 'utils'),
      },
      symlinks: true,
    },
    // Prevent webpack from treating shared folder as immutable
    snapshot: {
      managedPaths: [],
    },
    module: {
      // Don't parse @react-native packages (they use Flow types)
      noParse: /node_modules\/@react-native/,
      rules: [
        // Process all TypeScript and JavaScript files with babel
        {
          test: /\.(ts|tsx|js|jsx)$/,
          exclude: /node_modules/,
          type: 'javascript/auto',
          use: {
            loader: 'babel-loader',
            options: {
              babelrc: false,
              configFile: false,
              cacheDirectory: true,
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
        },
        // Process specific node_modules that need transpilation
        {
          test: /\.(js|jsx|ts|tsx)$/,
          include: /node_modules\/(react-native-web|react-native-safe-area-context|react-native-screens|@expo|expo-linear-gradient|expo-font|expo-asset|expo-modules-core)/,
          exclude: /node_modules\/@react-native/,
          type: 'javascript/auto',
          use: {
            loader: 'babel-loader',
            options: {
              babelrc: false,
              configFile: false,
              cacheDirectory: true,
              presets: [
                ['@babel/preset-env', { loose: true, modules: false }],
                ['@babel/preset-react', { runtime: 'automatic' }],
                '@babel/preset-typescript',
              ],
              plugins: ['react-native-web'],
              sourceType: 'unambiguous',
            },
          },
        },
        // Images
        {
          test: /\.(gif|jpe?g|png|svg)$/,
          type: 'asset/resource',
        },
        // Fonts
        {
          test: /\.(woff|woff2|eot|ttf|otf)$/,
          type: 'asset/resource',
        },
        // CSS
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader', 'postcss-loader'],
        },
        // Fix ESM modules
        {
          test: /\.m?js/,
          resolve: {
            fullySpecified: false,
          },
        },
      ],
    },
    plugins: [
      new webpack.DefinePlugin({
        // Use isDemoMode to control demo data, not just webpack mode
        __DEV__: isDemoMode || !isProduction,
        // TV platform build flags for conditional code
        __WEBOS__: isWebOS,
        __TIZEN__: isTizen,
        __TV__: isTV,
        'process.env.NODE_ENV': JSON.stringify(isProduction ? 'production' : 'development'),
        'process.env.VITE_APP_MODE': JSON.stringify(process.env.VITE_APP_MODE || 'demo'),
        'process.env.TARGET': JSON.stringify(process.env.TARGET || 'web'),
      }),
      new webpack.ProvidePlugin({
        process: 'process/browser',
      }),
      new HtmlWebpackPlugin({
        template: path.resolve(__dirname, 'public/index.html'),
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
    // Disable persistent caching in dev to avoid stale issues
    cache: isProduction ? {
      type: 'filesystem',
      buildDependencies: {
        config: [__filename],
      },
    } : false,
  };
};
