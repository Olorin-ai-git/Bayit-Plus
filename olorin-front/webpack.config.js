const ModuleFederationPlugin = require('webpack').container.ModuleFederationPlugin;
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

// Microservice configurations
const microservices = {
  shell: {
    name: 'shell',
    port: 3000,
    exposes: {
      './App': './src/shell/App.tsx',
      './Router': './src/shell/Router.tsx'
    },
    remotes: {
      coreUi: 'coreUi@http://localhost:3006/remoteEntry.js',
      investigation: 'investigation@http://localhost:3001/remoteEntry.js',
      agentAnalytics: 'agentAnalytics@http://localhost:3002/remoteEntry.js',
      ragIntelligence: 'ragIntelligence@http://localhost:3003/remoteEntry.js',
      visualization: 'visualization@http://localhost:3004/remoteEntry.js',
      reporting: 'reporting@http://localhost:3005/remoteEntry.js',
      designSystem: 'designSystem@http://localhost:3007/remoteEntry.js'
    }
  },
  investigation: {
    name: 'investigation',
    port: 3001,
    exposes: {
      './InvestigationDashboard': './src/microservices/investigation/components/InvestigationDashboard.tsx',
      './AutonomousInvestigation': './src/microservices/investigation/components/AutonomousInvestigation.tsx',
      './ManualInvestigationDetails': './src/microservices/investigation/components/ManualInvestigationDetails.tsx',
      './InvestigationWizard': './src/microservices/investigation/components/InvestigationWizard.tsx',
      './EvidenceManager': './src/microservices/investigation/components/EvidenceManager.tsx',
      './InvestigationStepTracker': './src/microservices/investigation/components/InvestigationStepTracker.tsx',
      './CollaborationPanel': './src/microservices/investigation/components/CollaborationPanel.tsx'
    },
    remotes: {
      coreUi: 'coreUi@http://localhost:3006/remoteEntry.js',
      designSystem: 'designSystem@http://localhost:3007/remoteEntry.js'
    }
  },
  agentAnalytics: {
    name: 'agentAnalytics',
    port: 3002,
    exposes: {
      './AgentAnalyticsDashboard': './src/microservices/agent-analytics/components/AgentAnalyticsDashboard.tsx',
      './PerformanceMetrics': './src/microservices/agent-analytics/components/PerformanceMetrics.tsx',
      './ModelAnalytics': './src/microservices/agent-analytics/components/ModelAnalytics.tsx',
      './UsageTracking': './src/microservices/agent-analytics/components/UsageTracking.tsx',
      './CostAnalytics': './src/microservices/agent-analytics/components/CostAnalytics.tsx'
    },
    remotes: {
      coreUi: 'coreUi@http://localhost:3006/remoteEntry.js',
      designSystem: 'designSystem@http://localhost:3007/remoteEntry.js',
      visualization: 'visualization@http://localhost:3004/remoteEntry.js'
    }
  },
  ragIntelligence: {
    name: 'ragIntelligence',
    port: 3003,
    exposes: {
      './KnowledgeBase': './src/microservices/rag-intelligence/components/KnowledgeBase.tsx',
      './DocumentRetrieval': './src/microservices/rag-intelligence/components/DocumentRetrieval.tsx',
      './IntelligentSearch': './src/microservices/rag-intelligence/components/IntelligentSearch.tsx',
      './VectorDatabase': './src/microservices/rag-intelligence/components/VectorDatabase.tsx'
    },
    remotes: {
      coreUi: 'coreUi@http://localhost:3006/remoteEntry.js',
      designSystem: 'designSystem@http://localhost:3007/remoteEntry.js'
    }
  },
  visualization: {
    name: 'visualization',
    port: 3004,
    exposes: {
      './ChartBuilder': './src/microservices/visualization/components/ChartBuilder.tsx',
      './DataVisualization': './src/microservices/visualization/components/DataVisualization.tsx',
      './NetworkGraph': './src/microservices/visualization/components/NetworkGraph.tsx',
      './TimelineVisualization': './src/microservices/visualization/components/TimelineVisualization.tsx'
    },
    remotes: {
      coreUi: 'coreUi@http://localhost:3006/remoteEntry.js',
      designSystem: 'designSystem@http://localhost:3007/remoteEntry.js'
    }
  },
  reporting: {
    name: 'reporting',
    port: 3005,
    exposes: {
      './ReportBuilder': './src/microservices/reporting/components/ReportBuilder.tsx',
      './ReportDashboard': './src/microservices/reporting/components/ReportDashboard.tsx',
      './ReportViewer': './src/microservices/reporting/components/ReportViewer.tsx'
    },
    remotes: {
      coreUi: 'coreUi@http://localhost:3006/remoteEntry.js',
      designSystem: 'designSystem@http://localhost:3007/remoteEntry.js',
      visualization: 'visualization@http://localhost:3004/remoteEntry.js'
    }
  },
  coreUi: {
    name: 'coreUi',
    port: 3006,
    exposes: {
      './Navigation': './src/microservices/core-ui/components/Navigation.tsx',
      './Header': './src/microservices/core-ui/components/Header.tsx',
      './Sidebar': './src/microservices/core-ui/components/Sidebar.tsx',
      './Layout': './src/microservices/core-ui/components/Layout.tsx',
      './EventBus': './src/microservices/core-ui/services/eventBus.ts',
      './AuthProvider': './src/microservices/core-ui/providers/AuthProvider.tsx'
    },
    remotes: {
      designSystem: 'designSystem@http://localhost:3007/remoteEntry.js'
    }
  },
  designSystem: {
    name: 'designSystem',
    port: 3007,
    exposes: {
      './DesignSystemFoundation': './src/microservices/design-system/components/DesignSystemFoundation.tsx',
      './DesignTokens': './src/microservices/design-system/types/design.ts'
    },
    remotes: {}
  }
};

// Get current service from environment or default to shell
const currentService = process.env.SERVICE || 'shell';
const serviceConfig = microservices[currentService];

if (!serviceConfig) {
  throw new Error(`Unknown service: ${currentService}`);
}

// Shared dependencies configuration
const sharedDependencies = {
  react: {
    singleton: true,
    requiredVersion: '^18.2.0',
    eager: true
  },
  'react-dom': {
    singleton: true,
    requiredVersion: '^18.2.0',
    eager: true
  },
  'react-router-dom': {
    singleton: true,
    requiredVersion: '^6.8.1'
  },
  '@headlessui/react': {
    singleton: true,
    requiredVersion: '^1.7.17'
  },
  '@heroicons/react': {
    singleton: true,
    requiredVersion: '^2.0.18'
  },
  'chart.js': {
    singleton: true,
    requiredVersion: '^4.2.1'
  },
  'react-chartjs-2': {
    singleton: true,
    requiredVersion: '^5.2.0'
  },
  axios: {
    singleton: true,
    requiredVersion: '^1.6.7'
  },
  'date-fns': {
    singleton: true,
    requiredVersion: '^2.29.3'
  }
};

module.exports = (env, argv) => {
  const isDevelopment = argv.mode === 'development';
  const isProduction = argv.mode === 'production';

  return {
    mode: isDevelopment ? 'development' : 'production',

    entry: currentService === 'shell'
      ? './src/shell/index.tsx'
      : './src/bootstrap.tsx',

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

      new ModuleFederationPlugin({
        name: serviceConfig.name,
        filename: 'remoteEntry.js',
        exposes: serviceConfig.exposes || {},
        remotes: serviceConfig.remotes || {},
        shared: sharedDependencies
      }),

      new HtmlWebpackPlugin({
        template: currentService === 'shell'
          ? './public/index.html'
          : './public/service.html',
        title: `Olorin ${serviceConfig.name.charAt(0).toUpperCase() + serviceConfig.name.slice(1)} Service`,
        favicon: './public/favicon.ico'
      }),

      // Environment variables
      new (require('webpack').DefinePlugin)({
        'process.env.NODE_ENV': JSON.stringify(argv.mode || 'development'),
        'process.env.SERVICE_NAME': JSON.stringify(serviceConfig.name),
        'process.env.SERVICE_PORT': JSON.stringify(serviceConfig.port),
        'process.env.REACT_APP_API_BASE_URL': JSON.stringify(process.env.REACT_APP_API_BASE_URL || 'http://localhost:8090'),
        'process.env.REACT_APP_WS_URL': JSON.stringify(process.env.REACT_APP_WS_URL || 'ws://localhost:8090')
      })
    ],

    devServer: {
      port: serviceConfig.port,
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
          warnings: false
        }
      },
      static: {
        directory: path.join(__dirname, 'public'),
        publicPath: '/'
      }
    },

    optimization: {
      minimize: isProduction,
      splitChunks: {
        chunks: 'async',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            enforce: true
          }
        }
      }
    },

    output: {
      path: path.resolve(__dirname, 'dist', serviceConfig.name),
      filename: isDevelopment ? '[name].js' : '[name].[contenthash].js',
      chunkFilename: isDevelopment ? '[name].chunk.js' : '[name].[contenthash].chunk.js',
      publicPath: isDevelopment
        ? `http://localhost:${serviceConfig.port}/`
        : `/${serviceConfig.name}/`,
      clean: true
    },

    externals: {
      // Mark certain packages as external to reduce bundle size
      'moment': 'moment'
    },

    performance: {
      hints: isProduction ? 'warning' : false,
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