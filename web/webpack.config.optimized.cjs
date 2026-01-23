const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const webpack = require('webpack');

// Paths - use absolute paths to avoid resolution issues
const sharedPath = path.resolve(__dirname, '../shared');
const packagesPath = path.resolve(__dirname, '../packages/ui');
const olorinCorePackagesPath = path.resolve(__dirname, '../../../olorin-core/packages');
const srcPath = path.resolve(__dirname, 'src');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  // Load environment variables based on mode
  require('dotenv').config({
    path: path.resolve(__dirname, isProduction ? '.env.production' : '.env')
  });
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
      filename: isProduction ? '[name].[contenthash].js' : '[name].js',
      chunkFilename: isProduction ? '[name].[contenthash].chunk.js' : '[name].chunk.js',
      // Use relative paths for TV apps (packaged), absolute for web
      publicPath: isTV ? './' : '/',
      clean: true,
    },
    // Enable source maps for debugging
    devtool: isProduction ? 'source-map' : 'eval-source-map',
    // Set the context to web folder
    context: __dirname,
    resolve: {
      extensions: ['.web.tsx', '.web.ts', '.web.jsx', '.web.js', '.tsx', '.ts', '.jsx', '.js', '.json'],
      modules: [
        path.resolve(__dirname, 'node_modules'),
        path.resolve(__dirname, '../node_modules'),
        'node_modules',
      ],
      alias: {
        // @olorin packages from olorin-core packages directory
        '@olorin/design-tokens': path.resolve(olorinCorePackagesPath, 'design-tokens/dist'),
        '@olorin/shared-hooks': path.resolve(packagesPath, 'shared-hooks'),
        '@olorin/shared-i18n': path.resolve(packagesPath, 'shared-i18n'),
        '@olorin/shared-services': path.resolve(packagesPath, 'shared-services'),
        '@olorin/shared-stores': path.resolve(packagesPath, 'shared-stores'),
        // Legacy alias for backwards compatibility (redirect to design-tokens)
        '@olorin/shared': path.resolve(olorinCorePackagesPath, 'design-tokens/dist'),
        // React Native Web
        'react-native$': 'react-native-web',
        'react-native-linear-gradient': 'react-native-web-linear-gradient',
        // Voice detection
        'vosk-browser': path.resolve(__dirname, '../node_modules/vosk-browser/dist/vosk.js'),
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
        // Shared library aliases (longer paths first for correct resolution)
        '@bayit/shared-hooks/voice': path.resolve(sharedPath, 'hooks/voice'),
        '@bayit/shared-hooks': path.resolve(sharedPath, 'hooks'),
        '@bayit/shared-screens/admin': path.resolve(sharedPath, 'screens/admin'),
        '@bayit/shared-screens': path.resolve(sharedPath, 'screens'),
        '@bayit/shared-services': path.resolve(sharedPath, 'services'),
        '@bayit/shared-stores': path.resolve(sharedPath, 'stores'),
        '@bayit/shared-contexts': path.resolve(sharedPath, 'contexts'),
        '@bayit/shared-i18n': path.resolve(sharedPath, 'i18n'),
        '@bayit/shared-styles/globals.css': path.resolve(sharedPath, 'styles/globals.css'),
        '@bayit/shared-styles': path.resolve(sharedPath, 'styles'),
        '@bayit/shared-config': path.resolve(sharedPath, 'config'),
        '@bayit/shared-types': path.resolve(sharedPath, 'types'),
        '@bayit/shared-utils': path.resolve(sharedPath, 'utils'),
        '@bayit/shared/search': path.resolve(sharedPath, 'components/search'),
        '@bayit/shared/components/ai': path.resolve(sharedPath, 'components/ai'),
        '@bayit/shared/components/flows': path.resolve(sharedPath, 'components/flows'),
        '@bayit/shared/components/watchparty': path.resolve(sharedPath, 'components/watchparty'),
        '@bayit/shared/components/chat': path.resolve(sharedPath, 'components/chat'),
        '@bayit/shared/components/admin': path.resolve(sharedPath, 'components/admin'),
        '@bayit/shared/components': path.resolve(sharedPath, 'components'),
        '@bayit/shared/ui/web': path.resolve(sharedPath, 'components/ui/web'),
        '@bayit/shared/ui': path.resolve(sharedPath, 'components/ui'),
        '@bayit/shared/theme': path.resolve(sharedPath, 'theme'),
        '@bayit/shared/stores': path.resolve(sharedPath, 'stores'),
        '@bayit/shared/services': path.resolve(sharedPath, 'services'),
        '@bayit/shared/hooks': path.resolve(sharedPath, 'hooks'),
        '@bayit/shared/watchparty': path.resolve(sharedPath, 'components/watchparty'),
        '@bayit/shared/chat': path.resolve(sharedPath, 'components/chat'),
        '@bayit/shared/admin': path.resolve(sharedPath, 'components/admin'),
        '@bayit/shared': path.resolve(sharedPath, 'components'),
        '@bayit/shared-assets': path.resolve(sharedPath, 'assets'),
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
          include: /node_modules\/(react-native-web|react-native-safe-area-context|react-native-screens|@expo|expo-linear-gradient|expo-font|expo-asset|expo-modules-core|vosk-browser)/,
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
          use: [
            'style-loader',
            'css-loader',
            {
              loader: 'postcss-loader',
              options: {
                postcssOptions: {
                  config: path.resolve(__dirname, 'postcss.config.cjs'),
                },
              },
            },
          ],
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
        // Single source of truth: .env file. TV builds now use same mode as web.
        'process.env.VITE_APP_MODE': JSON.stringify(process.env.VITE_APP_MODE),
        'process.env.TARGET': JSON.stringify(process.env.TARGET || 'web'),
        // Also support import.meta.env syntax
        'import.meta.env.VITE_APP_MODE': JSON.stringify(isTV ? 'demo' : process.env.VITE_APP_MODE),
        // Use environment variable for API URL (Firebase Hosting rewrites handle routing)
        'import.meta.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL || '/api/v1'),
        // Picovoice Porcupine wake word access key
        'import.meta.env.VITE_PICOVOICE_ACCESS_KEY': JSON.stringify(process.env.VITE_PICOVOICE_ACCESS_KEY || ''),
      }),
      new webpack.ProvidePlugin({
        process: 'process/browser',
      }),
      new HtmlWebpackPlugin({
        template: path.resolve(__dirname, 'public/index.html'),
      }),
      // Copy Vosk WebAssembly files for wake word detection (all builds)
      // Note: Vosk model (~10-50MB) must be downloaded separately from https://alphacephei.com/vosk/models
      // and placed in shared/models/vosk-model-wakeword-en-us/
      new CopyWebpackPlugin({
        patterns: [
          {
            // Copy all assets from shared location (images, audio, video, games)
            from: path.resolve(sharedPath, 'assets'),
            to: path.resolve(getOutputPath(), 'assets'),
            noErrorOnMissing: true,
          },
          {
            // Copy favicon files from shared assets to root
            from: '*.{png,ico}',
            to: path.resolve(getOutputPath(), '[name][ext]'),
            context: path.resolve(sharedPath, 'assets/images/icons'),
            noErrorOnMissing: true,
          },
          {
            // Copy Apple touch icon from shared assets
            from: 'apple-touch-icon.png',
            to: path.resolve(getOutputPath(), 'apple-touch-icon.png'),
            context: path.resolve(sharedPath, 'assets/images/icons'),
            noErrorOnMissing: true,
          },
          {
            // Copy Vosk WebAssembly files from root node_modules
            from: path.resolve(__dirname, '../node_modules/vosk-browser/dist'),
            to: path.resolve(getOutputPath(), 'vosk'),
            noErrorOnMissing: true,
          },
          {
            // Copy Vosk model if available (needs to be downloaded manually)
            from: path.resolve(__dirname, '../shared/models/vosk-model-wakeword-en-us'),
            to: path.resolve(getOutputPath(), 'vosk/model'),
            noErrorOnMissing: true,
          },
          {
            // Copy Porcupine WebAssembly files for wake word detection
            from: path.resolve(__dirname, '../node_modules/@picovoice/porcupine-web/dist'),
            to: path.resolve(getOutputPath(), 'porcupine'),
            noErrorOnMissing: true,
          },
          {
            // Copy custom Porcupine wake word model if available
            // Needs to be trained at https://console.picovoice.ai/ and downloaded
            from: path.resolve(__dirname, '../shared/models/porcupine'),
            to: path.resolve(getOutputPath(), 'porcupine'),
            noErrorOnMissing: true,
          },
        ],
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
      // Note: COEP/COOP headers are needed for SharedArrayBuffer (Porcupine WASM)
      // but they block cross-origin resources (like GCS images) without CORP headers.
      // For production, use Cloud CDN to add 'Cross-Origin-Resource-Policy: cross-origin'
      // For development, we disable these headers to allow GCS images to load.
      // headers: {
      //   'Cross-Origin-Opener-Policy': 'same-origin',
      //   'Cross-Origin-Embedder-Policy': 'require-corp',
      // },
      proxy: [
        {
          context: ['/api', '/uploads'],
          target: 'http://localhost:8000',
          changeOrigin: true,
        },
        {
          // Proxy GCS images to add CORP headers for COEP compatibility
          context: ['/gcs-proxy'],
          target: 'https://storage.googleapis.com',
          changeOrigin: true,
          pathRewrite: { '^/gcs-proxy': '' },
          onProxyRes: (proxyRes) => {
            proxyRes.headers['Cross-Origin-Resource-Policy'] = 'cross-origin';
          },
        },
      ],
    },
    optimization: {
      splitChunks: {
        chunks: 'all',
        // OPTIMIZATION: Reduce max size to encourage more splitting
        maxSize: isProduction ? 400000 : undefined, // 400 KB max chunk size
        cacheGroups: {
          // OPTIMIZATION: Split React ecosystem into separate bundle
          react: {
            test: /[\\/]node_modules[\\/](react|react-dom|react-router-dom|scheduler)[\\/]/,
            name: 'react',
            chunks: 'all',
            priority: 30,
            enforce: true,
          },
          // OPTIMIZATION: Split React Native Web separately
          reactNativeWeb: {
            test: /[\\/]node_modules[\\/](react-native-web|react-native-safe-area-context|react-native-screens)[\\/]/,
            name: 'react-native-web',
            chunks: 'all',
            priority: 29,
            enforce: true,
          },
          // OPTIMIZATION: Split UI libraries
          uiLibraries: {
            test: /[\\/]node_modules[\\/](lucide-react|@tanstack|zustand)[\\/]/,
            name: 'ui-libraries',
            chunks: 'all',
            priority: 28,
            enforce: true,
          },
          // OPTIMIZATION: Split date/time libraries
          datetime: {
            test: /[\\/]node_modules[\\/](date-fns|date-fns-tz|luxon)[\\/]/,
            name: 'datetime',
            chunks: 'all',
            priority: 27,
            enforce: true,
          },
          // OPTIMIZATION: Split i18n libraries
          i18n: {
            test: /[\\/]node_modules[\\/](i18next|react-i18next)[\\/]/,
            name: 'i18n',
            chunks: 'all',
            priority: 26,
            enforce: true,
          },
          // OPTIMIZATION: Split validation/forms
          forms: {
            test: /[\\/]node_modules[\\/](react-hook-form|zod)[\\/]/,
            name: 'forms',
            chunks: 'all',
            priority: 25,
            enforce: true,
          },
          // OPTIMIZATION: Split media libraries
          media: {
            test: /[\\/]node_modules[\\/](hls\.js|livekit-client)[\\/]/,
            name: 'media',
            chunks: 'all',
            priority: 24,
            enforce: true,
          },
          // Admin pages in separate chunk (lazy loaded)
          admin: {
            test: /[\\/]pages[\\/]admin[\\/]/,
            name: 'admin',
            chunks: 'all',
            priority: 20,
            enforce: true,
          },
          // Chess/games in separate chunk
          games: {
            test: /[\\/](pages[\\/]Chess|components[\\/]chess)[\\/]/,
            name: 'games',
            chunks: 'all',
            priority: 19,
            enforce: true,
          },
          // Watch party components in separate chunk
          watchparty: {
            test: /[\\/]components[\\/]watchparty[\\/]/,
            name: 'watchparty',
            chunks: 'all',
            priority: 18,
            enforce: true,
          },
          // OPTIMIZATION: Remaining vendor libraries split by package
          vendorsCore: {
            test: /[\\/]node_modules[\\/](axios|isomorphic-dompurify|clsx|tsparticles)[\\/]/,
            name: 'vendors-core',
            chunks: 'all',
            priority: 15,
            enforce: true,
          },
          // OPTIMIZATION: Stripe/Payment libraries
          payment: {
            test: /[\\/]node_modules[\\/](@stripe|@simplewebauthn)[\\/]/,
            name: 'payment',
            chunks: 'all',
            priority: 14,
            enforce: true,
          },
          // OPTIMIZATION: Olorin packages
          olorin: {
            test: /[\\/]node_modules[\\/]@olorin[\\/]/,
            name: 'olorin-packages',
            chunks: 'all',
            priority: 13,
            enforce: true,
          },
          // OPTIMIZATION: Default vendors (anything else from node_modules)
          // Split into max 500KB chunks
          defaultVendors: {
            test: /[\\/]node_modules[\\/]/,
            name(module) {
              // Get the package name
              const packageName = module.context.match(/[\\/]node_modules[\\/](.*?)([\\/]|$)/);
              if (!packageName) return 'vendors';

              // Clean package name for use in filename
              const cleaned = packageName[1].replace(/[@/]/g, '-');
              return `vendor-${cleaned}`;
            },
            chunks: 'all',
            priority: 10,
            maxSize: 500000, // 500 KB max per vendor chunk
          },
        },
      },
      // Keep runtime chunk separate for better caching
      runtimeChunk: 'single',
      // OPTIMIZATION: Enable module concatenation (scope hoisting)
      concatenateModules: true,
      // OPTIMIZATION: Mark side-effect-free modules for better tree shaking
      sideEffects: true,
      // OPTIMIZATION: Use more aggressive minimizer settings
      minimize: isProduction,
      minimizer: isProduction ? [
        new (require('terser-webpack-plugin'))({
          terserOptions: {
            compress: {
              drop_console: true, // Remove console.log in production
              drop_debugger: true,
              pure_funcs: ['console.info', 'console.debug', 'console.warn'],
            },
            mangle: true,
            output: {
              comments: false,
            },
          },
          extractComments: false,
        }),
      ] : [],
    },
    performance: {
      // OPTIMIZATION: Enable performance hints in production
      hints: isProduction ? 'warning' : false,
      maxEntrypointSize: 2000000, // 2 MB
      maxAssetSize: 500000, // 500 KB
    },
    // Enable persistent caching for faster rebuilds
    cache: isProduction ? {
      type: 'filesystem',
      buildDependencies: {
        config: [__filename],
      },
    } : false,
  };
};
