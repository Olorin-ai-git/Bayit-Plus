const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

module.exports = (env, argv) => {
  const isDevelopment = argv.mode === 'development';

  return {
    mode: isDevelopment ? 'development' : 'production',

    entry: './src/shell/index.tsx',

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
        'process.env.NODE_ENV': JSON.stringify(argv.mode || 'development'),
        'process.env.SERVICE_NAME': JSON.stringify('shell'),
        'process.env.SERVICE_PORT': JSON.stringify(3000),
        'process.env.REACT_APP_API_BASE_URL': JSON.stringify(process.env.REACT_APP_API_BASE_URL || 'http://localhost:8090'),
        'process.env.REACT_APP_WS_URL': JSON.stringify(process.env.REACT_APP_WS_URL || 'ws://localhost:8090')
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