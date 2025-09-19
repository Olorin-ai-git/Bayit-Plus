const { ModuleFederationPlugin } = require('@module-federation/webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const path = require('path');

const serviceName = process.env.SERVICE || 'shell';
const isAnalyzing = process.env.ANALYZE === 'true';

// Service-specific configurations
const serviceConfigs = {
  shell: {
    name: 'shell',
    filename: 'remoteEntry.js',
    port: 3000,
    remotes: {
      investigation: 'investigation@http://localhost:3001/remoteEntry.js',
      agentAnalytics: 'agentAnalytics@http://localhost:3002/remoteEntry.js',
      ragIntelligence: 'ragIntelligence@http://localhost:3003/remoteEntry.js',
      visualization: 'visualization@http://localhost:3004/remoteEntry.js',
      reporting: 'reporting@http://localhost:3005/remoteEntry.js',
      coreUi: 'coreUi@http://localhost:3006/remoteEntry.js',
      designSystem: 'designSystem@http://localhost:3007/remoteEntry.js'
    },
    exposes: {
      './ShellApp': './src/shell/App',
      './ShellRouter': './src/shell/Router',
      './ServiceDiscovery': './src/shell/services/ServiceDiscovery',
      './HealthMonitor': './src/shell/services/ServiceHealthMonitor'
    }
  },
  investigation: {
    name: 'investigation',
    filename: 'remoteEntry.js',
    port: 3001,
    exposes: {
      './InvestigationApp': './src/microservices/investigation/InvestigationApp',
      './InvestigationDashboard': './src/microservices/investigation/components/InvestigationDashboard',
      './InvestigationDetails': './src/microservices/investigation/components/InvestigationDetails',
      './InvestigationList': './src/microservices/investigation/components/InvestigationList'
    }
  },
  agentAnalytics: {
    name: 'agentAnalytics',
    filename: 'remoteEntry.js',
    port: 3002,
    exposes: {
      './AgentAnalyticsApp': './src/microservices/agent-analytics/AgentAnalyticsApp',
      './AgentAnalyticsDashboard': './src/microservices/agent-analytics/components/AgentAnalyticsDashboard',
      './AgentMetrics': './src/microservices/agent-analytics/components/AgentMetrics',
      './AgentLogs': './src/microservices/agent-analytics/components/AgentLogs'
    }
  },
  ragIntelligence: {
    name: 'ragIntelligence',
    filename: 'remoteEntry.js',
    port: 3003,
    exposes: {
      './RagIntelligenceApp': './src/microservices/rag-intelligence/RagIntelligenceApp',
      './KnowledgeBase': './src/microservices/rag-intelligence/components/KnowledgeBase',
      './DocumentSearch': './src/microservices/rag-intelligence/components/DocumentSearch',
      './QueryInterface': './src/microservices/rag-intelligence/components/QueryInterface'
    }
  },
  visualization: {
    name: 'visualization',
    filename: 'remoteEntry.js',
    port: 3004,
    exposes: {
      './VisualizationApp': './src/microservices/visualization/VisualizationApp',
      './DataVisualization': './src/microservices/visualization/components/DataVisualization',
      './NetworkGraph': './src/microservices/visualization/components/NetworkGraph',
      './RiskChart': './src/microservices/visualization/components/RiskChart'
    }
  },
  reporting: {
    name: 'reporting',
    filename: 'remoteEntry.js',
    port: 3005,
    exposes: {
      './ReportingApp': './src/microservices/reporting/ReportingApp',
      './ReportDashboard': './src/microservices/reporting/components/ReportDashboard',
      './ReportGenerator': './src/microservices/reporting/components/ReportGenerator',
      './ReportViewer': './src/microservices/reporting/components/ReportViewer'
    }
  },
  coreUi: {
    name: 'coreUi',
    filename: 'remoteEntry.js',
    port: 3006,
    exposes: {
      './CoreUiApp': './src/microservices/core-ui/CoreUiApp',
      './Layout': './src/microservices/core-ui/components/Layout',
      './Navigation': './src/microservices/core-ui/components/Navigation',
      './Header': './src/microservices/core-ui/components/Header',
      './Sidebar': './src/microservices/core-ui/components/Sidebar'
    }
  },
  designSystem: {
    name: 'designSystem',
    filename: 'remoteEntry.js',
    port: 3007,
    exposes: {
      './DesignSystemApp': './src/microservices/design-system/DesignSystemApp',
      './DesignSystemFoundation': './src/microservices/design-system/components/DesignSystemFoundation',
      './Button': './src/shared/components/ui/Button',
      './Input': './src/shared/components/ui/Input',
      './Card': './src/shared/components/ui/Card',
      './Modal': './src/shared/components/ui/Modal'
    }
  }
};

const config = serviceConfigs[serviceName];

module.exports = {
  mode: 'production',

  entry: './src/index.tsx',

  target: 'web',

  resolve: {
    extensions: ['.tsx', '.ts', '.jsx', '.js', '.json'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@microservices': path.resolve(__dirname, 'src/microservices'),
      '@shell': path.resolve(__dirname, 'src/shell'),
      '@components': path.resolve(__dirname, 'src/shared/components'),
      '@services': path.resolve(__dirname, 'src/shared/services'),
      '@types': path.resolve(__dirname, 'src/shared/types'),
      '@utils': path.resolve(__dirname, 'src/shared/utils'),
      '@hooks': path.resolve(__dirname, 'src/shared/hooks')
    }
  },

  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'thread-loader',
            options: {
              workers: require('os').cpus().length - 1
            }
          },
          {
            loader: 'ts-loader',
            options: {
              happyPackMode: true,
              transpileOnly: true,
              configFile: 'tsconfig.json'
            }
          }
        ]
      },
      {
        test: /\.css$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              importLoaders: 1,
              modules: false
            }
          },
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
        test: /\.(png|jpg|jpeg|gif|svg|ico)$/i,
        use: [
          {
            loader: 'image-webpack-loader',
            options: {
              mozjpeg: {
                progressive: true,
                quality: 80
              },
              optipng: {
                enabled: false
              },
              pngquant: {
                quality: [0.65, 0.90],
                speed: 4
              },
              gifsicle: {
                interlaced: false
              },
              webp: {
                quality: 75
              },
              svgo: {
                plugins: [
                  {
                    name: 'removeViewBox',
                    active: false
                  }
                ]
              }
            }
          }
        ],
        type: 'asset/resource',
        generator: {
          filename: 'assets/images/[name].[hash:8][ext]'
        }
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'assets/fonts/[name].[hash:8][ext]'
        }
      }
    ]
  },

  plugins: [
    new CleanWebpackPlugin(),

    new ModuleFederationPlugin({
      name: config.name,
      filename: config.filename,
      remotes: config.remotes || {},
      exposes: config.exposes || {},
      shared: {
        react: {
          singleton: true,
          requiredVersion: '^18.2.0',
          eager: serviceName === 'shell'
        },
        'react-dom': {
          singleton: true,
          requiredVersion: '^18.2.0',
          eager: serviceName === 'shell'
        },
        'react-router-dom': {
          singleton: true,
          requiredVersion: '^6.11.0',
          eager: serviceName === 'shell'
        },
        '@headlessui/react': {
          singleton: true,
          requiredVersion: '^2.2.8'
        },
        'lucide-react': {
          singleton: true,
          requiredVersion: '^0.263.0'
        },
        axios: {
          singleton: true,
          requiredVersion: '^1.4.0'
        },
        mitt: {
          singleton: true,
          requiredVersion: '3.0.1'
        }
      }
    }),

    new HtmlWebpackPlugin({
      template: './public/index.html',
      filename: 'index.html',
      minify: {
        removeComments: true,
        collapseWhitespace: true,
        removeRedundantAttributes: true,
        useShortDoctype: true,
        removeEmptyAttributes: true,
        removeStyleLinkTypeAttributes: true,
        keepClosingSlash: true,
        minifyJS: true,
        minifyCSS: true,
        minifyURLs: true
      },
      inject: 'body',
      scriptLoading: 'defer'
    }),

    new CompressionPlugin({
      algorithm: 'gzip',
      test: /\.(js|css|html|svg)$/,
      threshold: 8192,
      minRatio: 0.8,
      deleteOriginalAssets: false
    }),

    ...(isAnalyzing ? [
      new BundleAnalyzerPlugin({
        analyzerMode: 'static',
        openAnalyzer: false,
        reportFilename: `bundle-analysis-${serviceName}.html`,
        generateStatsFile: true,
        statsFilename: `stats-${serviceName}.json`
      })
    ] : [])
  ],

  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: true,
            drop_debugger: true,
            pure_funcs: ['console.log', 'console.info', 'console.debug'],
            passes: 2
          },
          mangle: {
            safari10: true
          },
          format: {
            comments: false
          }
        },
        extractComments: false,
        parallel: true
      }),
      new CssMinimizerPlugin({
        minimizerOptions: {
          preset: [
            'default',
            {
              discardComments: { removeAll: true },
              normalizeWhitespace: true,
              colormin: true,
              convertValues: true,
              discardDuplicates: true,
              discardEmpty: true,
              mergeIdents: false,
              reduceIdents: false,
              safe: true,
              sortValues: true
            }
          ]
        }
      })
    ],

    splitChunks: {
      chunks: 'all',
      minSize: 20000,
      maxSize: 244000,
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
          priority: 10,
          reuseExistingChunk: true
        },
        shared: {
          test: /[\\/]src[\\/]shared[\\/]/,
          name: 'shared',
          chunks: 'all',
          priority: 5,
          reuseExistingChunk: true,
          minChunks: 2
        },
        common: {
          name: 'common',
          chunks: 'all',
          priority: 1,
          reuseExistingChunk: true,
          minChunks: 2
        }
      }
    },

    moduleIds: 'deterministic',
    chunkIds: 'deterministic',

    runtimeChunk: {
      name: 'runtime'
    },

    usedExports: true,
    sideEffects: false
  },

  output: {
    path: path.resolve(__dirname, `dist/${serviceName}`),
    filename: 'assets/js/[name].[contenthash:8].js',
    chunkFilename: 'assets/js/[name].[contenthash:8].chunk.js',
    assetModuleFilename: 'assets/media/[name].[hash:8][ext]',
    publicPath: serviceName === 'shell' ? '/' : `http://localhost:${config.port}/`,
    clean: true,
    crossOriginLoading: 'anonymous'
  },

  performance: {
    maxAssetSize: 512000,
    maxEntrypointSize: 512000,
    hints: 'warning',
    assetFilter: function(assetFilename) {
      return assetFilename.endsWith('.js') || assetFilename.endsWith('.css');
    }
  },

  stats: {
    colors: true,
    modules: false,
    children: false,
    chunks: false,
    chunkModules: false,
    entrypoints: false,
    excludeAssets: /\.(map|txt|html|jpg|png|svg)$/,
    warningsFilter: [
      /Critical dependency: the request of a dependency is an expression/,
      /Module not found: Error: Can't resolve/
    ]
  },

  cache: {
    type: 'filesystem',
    buildDependencies: {
      config: [__filename]
    },
    cacheDirectory: path.resolve(__dirname, '.webpack-cache'),
    compression: 'gzip'
  },

  devtool: false
};