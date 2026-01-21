const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

module.exports = (env, argv) => {
  const isDevelopment = argv.mode === 'development';

  return {
    mode: isDevelopment ? 'development' : 'production',

    entry: './src/index.tsx',

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
          type: 'asset/resource'
        }
      ]
    },

    plugins: [
      new HtmlWebpackPlugin({
        template: './public/index.simple.html',
        title: 'Olorin Shell',
        favicon: './public/favicon.ico',
        inject: true,
        minify: false
      }),

      new (require('webpack').DefinePlugin)({
        'process.env.NODE_ENV': JSON.stringify(argv.mode || 'development'),
        'process.env.SERVICE_NAME': JSON.stringify('shell'),
        'process.env.SERVICE_PORT': JSON.stringify(3000)
      })
    ],

    devServer: {
      port: 3000,
      hot: true,
      historyApiFallback: true,
      allowedHosts: 'all',
      headers: {
        'Access-Control-Allow-Origin': '*',
        'X-Service-Name': 'shell'
      },
      client: {
        overlay: {
          errors: true,
          warnings: false
        }
      },
      static: {
        directory: path.join(__dirname, 'public'),
        publicPath: '/'
      },
      compress: true
    },

    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].js',
      publicPath: '/',
      clean: true
    }
  };
};