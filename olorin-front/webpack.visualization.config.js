const ModuleFederationPlugin = require('webpack').container.ModuleFederationPlugin;
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

const SERVICE_NAME = 'visualization';

if (!process.env.REACT_APP_VISUALIZATION_PORT) {
  throw new Error('REACT_APP_VISUALIZATION_PORT is required but not set');
}
const SERVICE_PORT = parseInt(process.env.REACT_APP_VISUALIZATION_PORT, 10);

if (!process.env.REACT_APP_HOST) {
  throw new Error('REACT_APP_HOST is required but not set');
}
const DEV_HOST = process.env.REACT_APP_HOST;

const SHARED_DEPS = {
  react: { singleton: true, requiredVersion: '^18.2.0', eager: true },
  'react-dom': { singleton: true, requiredVersion: '^18.2.0', eager: true },
  d3: { singleton: true, requiredVersion: '7.9.0', eager: false },
  'chart.js': { singleton: true, requiredVersion: '^4.2.1', eager: false },
  'react-chartjs-2': { singleton: true, requiredVersion: '^5.2.0', eager: false },
  'react-flow-renderer': { singleton: true, requiredVersion: '10.3.17', eager: false },
  axios: { singleton: true, requiredVersion: '^1.4.0', eager: false },
  zod: { singleton: true, requiredVersion: '^3.22.0', eager: false }
};

const EXPOSED_COMPONENTS = {
  './bootstrap': './src/microservices/visualization/bootstrap.tsx',
  './App': './src/microservices/visualization/App.tsx',
  './RiskGauge': './src/microservices/visualization/components/risk/RiskGauge.tsx',
  './NetworkGraph': './src/microservices/visualization/components/network/NetworkGraph.tsx',
  './LocationMap': './src/microservices/visualization/components/maps/LocationMap.tsx',
  './Timeline': './src/microservices/visualization/components/timeline/Timeline.tsx',
  './EKGMonitor': './src/microservices/visualization/components/monitoring/EKGMonitor.tsx',
  './ChartBuilder': './src/microservices/visualization/components/charts/ChartBuilder.tsx',
  './DataVisualization': './src/microservices/visualization/components/DataVisualization.tsx'
};

if (!process.env.REACT_APP_MF_CORE_UI_URL) {
  throw new Error('REACT_APP_MF_CORE_UI_URL is required but not set');
}
if (!process.env.REACT_APP_MF_DESIGN_SYSTEM_URL) {
  throw new Error('REACT_APP_MF_DESIGN_SYSTEM_URL is required but not set');
}

const REMOTE_APPS = {
  coreUi: `coreUi@\${process.env.REACT_APP_MF_CORE_UI_URL}/remoteEntry.js`,
  designSystem: `designSystem@\${process.env.REACT_APP_MF_DESIGN_SYSTEM_URL}/remoteEntry.js`
};

const PATH_ALIASES = {
  '@': path.resolve(__dirname, 'src'),
  '@visualization': path.resolve(__dirname, 'src/microservices/visualization'),
  '@shared': path.resolve(__dirname, 'src/shared'),
  '@components': path.resolve(__dirname, 'src/shared/components'),
  '@hooks': path.resolve(__dirname, 'src/shared/hooks'),
  '@types': path.resolve(__dirname, 'src/shared/types'),
  '@utils': path.resolve(__dirname, 'src/shared/utils'),
  '@services': path.resolve(__dirname, 'src/shared/services')
};

const tsConfigPath = path.resolve(__dirname, 'src/microservices/visualization/tsconfig.json');

module.exports = (env, argv) => {
  const isDevelopment = argv.mode === 'development';
  const isProduction = argv.mode === 'production';
  const mode = isDevelopment ? 'development' : 'production';
  const currentEnv = process.env.REACT_APP_ENV || argv.mode || 'development';
  const publicPath = isDevelopment
    ? `http://${DEV_HOST}:${SERVICE_PORT}/`
    : process.env.REACT_APP_PUBLIC_PATH || `/${SERVICE_NAME}/`;

  return {
    mode,
    entry: './src/microservices/visualization/index.tsx',
    devtool: isDevelopment ? 'eval-source-map' : 'source-map',

    resolve: {
      extensions: ['.tsx', '.ts', '.jsx', '.js', '.json'],
      plugins: [new TsconfigPathsPlugin({ configFile: tsConfigPath })],
      alias: PATH_ALIASES
    },

    module: {
      rules: [
        {
          test: /\.tsx?$/,
          exclude: /node_modules/,
          use: [{
            loader: 'ts-loader',
            options: { transpileOnly: true, configFile: tsConfigPath }
          }]
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
                  plugins: [require('tailwindcss'), require('autoprefixer')]
                }
              }
            }
          ]
        },
        {
          test: /\.(png|jpe?g|gif|svg|ico)$/i,
          type: 'asset/resource',
          generator: { filename: 'assets/images/[name].[hash][ext]' }
        },
        {
          test: /\.(woff|woff2|eot|ttf|otf)$/i,
          type: 'asset/resource',
          generator: { filename: 'assets/fonts/[name].[hash][ext]' }
        }
      ]
    },

    plugins: [
      new CleanWebpackPlugin(),
      new ModuleFederationPlugin({
        name: 'visualizationApp',
        filename: 'remoteEntry.js',
        exposes: EXPOSED_COMPONENTS,
        remotes: REMOTE_APPS,
        shared: SHARED_DEPS
      }),
      new HtmlWebpackPlugin({
        template: './public/service.html',
        title: 'Olorin Visualization Service',
        favicon: './public/favicon.ico'
      }),
      new (require('webpack').DefinePlugin)({
        'process.env.NODE_ENV': JSON.stringify(mode),
        'process.env.REACT_APP_ENV': JSON.stringify(currentEnv),
        'process.env.SERVICE_NAME': JSON.stringify(SERVICE_NAME),
        'process.env.SERVICE_PORT': JSON.stringify(SERVICE_PORT)
      })
    ],

    devServer: {
      port: SERVICE_PORT,
      host: DEV_HOST,
      hot: true,
      liveReload: false,
      historyApiFallback: true,
      allowedHosts: 'all',
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization',
        'X-Service-Name': SERVICE_NAME
      },
      client: {
        overlay: { errors: true, warnings: false },
        logging: 'warn',
        progress: true
      }
    },

    output: {
      path: path.resolve(__dirname, 'dist', SERVICE_NAME),
      filename: isDevelopment ? '[name].js' : '[name].[contenthash].js',
      chunkFilename: isDevelopment ? '[name].chunk.js' : '[name].[contenthash].chunk.js',
      publicPath,
      clean: true
    },

    performance: {
      hints: isProduction ? 'warning' : false,
      maxAssetSize: parseInt(process.env.REACT_APP_MAX_ASSET_SIZE || '512000', 10),
      maxEntrypointSize: parseInt(process.env.REACT_APP_MAX_ENTRYPOINT_SIZE || '512000', 10)
    }
  };
};
