const ModuleFederationPlugin = require('webpack').container.ModuleFederationPlugin;
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

// Required environment variables for Running Investigations monitoring.
// Fail fast during bundling to avoid hidden runtime configuration issues.
const requiredMonitoringEnv = [
  'REACT_APP_INVESTIGATION_POLLING_INTERVAL_MS',
  'REACT_APP_INVESTIGATION_POLLING_RETRY_MAX_ATTEMPTS',
  'REACT_APP_INVESTIGATION_POLLING_RETRY_BASE_DELAY_MS',
];

for (const key of requiredMonitoringEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

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
      investigationsManagement: 'investigationsManagement@http://localhost:3008/remoteEntry.js',
      // Uncomment when implementing these microservices
      // structuredInvestigation: 'structuredInvestigation@http://localhost:3009/remoteEntry.js',
      // manualInvestigation: 'manualInvestigation@http://localhost:3010/remoteEntry.js',
      designSystem: 'designSystem@http://localhost:3007/remoteEntry.js'
    }
  },
  investigation: {
    name: 'investigation',
    port: 3001,
    exposes: {
      './App': './src/microservices/investigation/InvestigationApp.tsx',
      './StructuredInvestigation': './src/microservices/investigation/components/AutonomousInvestigation.tsx',
      './ManualInvestigationDetails': './src/microservices/investigation/components/ManualInvestigationDetails.tsx',
      './InvestigationWizard': './src/microservices/investigation/containers/InvestigationWizard.tsx',
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
      './App': './src/microservices/agent-analytics/AgentAnalyticsApp.tsx',
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
      './App': './src/microservices/rag-intelligence/RagIntelligenceApp.tsx',
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
      './App': './src/microservices/visualization/VisualizationApp.tsx',
      './ChartBuilder': './src/microservices/visualization/components/ChartBuilder.tsx',
      './DataVisualization': './src/microservices/visualization/components/DataVisualization.tsx',
      './NetworkGraph': './src/microservices/visualization/components/NetworkGraph.tsx',
      './TimelineVisualization': './src/microservices/visualization/components/TimelineVisualization.tsx',
      './LineChart': './src/microservices/visualization/components/charts/LineChart.tsx',
      './BarChart': './src/microservices/visualization/components/charts/BarChart.tsx',
      './PieChart': './src/microservices/visualization/components/charts/PieChart.tsx'
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
      './App': './src/microservices/reporting/ReportingApp.tsx',
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
  financialAnalysis: {
    name: 'financialAnalysis',
    port: 3009,
    exposes: {
      './App': './src/microservices/financial-analysis/FinancialAnalysisApp.tsx',
      './Dashboard': './src/microservices/financial-analysis/pages/FinancialDashboardPage.tsx',
      './InvestigationDetail': './src/microservices/financial-analysis/pages/InvestigationFinancialPage.tsx'
    },
    remotes: {
      coreUi: 'coreUi@http://localhost:3006/remoteEntry.js',
      designSystem: 'designSystem@http://localhost:3007/remoteEntry.js'
    }
  },
  coreUi: {
    name: 'coreUi',
    port: 3006,
    exposes: {
      './App': './src/microservices/core-ui/CoreUIApp.tsx',
      './Navigation': './src/microservices/core-ui/components/Navigation.tsx',
      './Header': './src/microservices/core-ui/components/Header.tsx',
      './Sidebar': './src/microservices/core-ui/components/Sidebar.tsx',
      './Layout': './src/microservices/core-ui/components/Layout.tsx',
      './EventBus': './src/shared/events/UnifiedEventBus.tsx',
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
      './App': './src/microservices/design-system/DesignSystemApp.tsx',
      './DesignSystemFoundation': './src/microservices/design-system/components/DesignSystemFoundation.tsx',
      './DesignTokens': './src/microservices/design-system/types/design.ts'
    },
    remotes: {}
  },
  investigationsManagement: {
    name: 'investigationsManagement',
    port: 3008,
    exposes: {
      './App': './src/microservices/investigations-management/InvestigationsManagementApp.tsx'
    },
    remotes: {
      coreUi: 'coreUi@http://localhost:3006/remoteEntry.js',
      designSystem: 'designSystem@http://localhost:3007/remoteEntry.js'
    }
  }
  // Uncomment when implementing these microservices
  // structuredInvestigation: {
  //   name: 'structuredInvestigation',
  //   port: 3008,
  //   exposes: {
  //     './App': './src/microservices/structured-investigation/StructuredInvestigationApp.tsx'
  //   },
  //   remotes: {
  //     coreUi: 'coreUi@http://localhost:3006/remoteEntry.js',
  //     designSystem: 'designSystem@http://localhost:3007/remoteEntry.js'
  //   }
  // },
  // manualInvestigation: {
  //   name: 'manualInvestigation',
  //   port: 3009,
  //   exposes: {
  //     './App': './src/microservices/manual-investigation/MinimalApp.js'
  //   },
  //   remotes: {}
  // }
};

// Get current service from environment or default to shell
const currentService = process.env.SERVICE || 'shell';
const serviceConfig = microservices[currentService];

if (!serviceConfig) {
  throw new Error(`Unknown service: ${currentService}`);
}

// Get entry point for each service
const getEntryPoint = (service) => {
  switch (service) {
    case 'shell':
      return './src/shell/bootstrap.tsx';
    case 'investigation':
      return './src/microservices/investigation/index.tsx';
    case 'agentAnalytics':
      return './src/microservices/agent-analytics/index.tsx';
    case 'ragIntelligence':
      return './src/microservices/rag-intelligence/index.tsx';
    case 'visualization':
      return './src/microservices/visualization/index.tsx';
    case 'reporting':
      return './src/microservices/reporting/index.tsx';
    case 'financialAnalysis':
      return './src/microservices/financial-analysis/index.tsx';
    case 'coreUi':
      return './src/microservices/core-ui/index.tsx';
    case 'designSystem':
      return './src/microservices/design-system/index.tsx';
    case 'investigationsManagement':
      return './src/microservices/investigations-management/index.tsx';
    // Uncomment when implementing these microservices
    // case 'structuredInvestigation':
    //   return './src/microservices/structured-investigation/index.tsx';
    // case 'manualInvestigation':
    //   return './src/microservices/manual-investigation/index.tsx';
    default:
      return './src/bootstrap.tsx';
  }
};

// Service-specific optimization configurations
const serviceOptimizations = {
  shell: {
    eager: ['react', 'react-dom', 'react-router-dom'],
    priority: ['routing', 'authentication', 'service-discovery']
  },
  investigation: {
    eager: ['react', 'react-dom'],
    priority: ['investigation-core', 'data-processing', 'polling']
  },
  agentAnalytics: {
    eager: ['react', 'react-dom', 'chart.js'],
    priority: ['analytics', 'charting', 'metrics']
  },
  ragIntelligence: {
    eager: ['react', 'react-dom'],
    priority: ['rag-core', 'search', 'ai-processing']
  },
  visualization: {
    eager: ['react', 'react-dom', 'chart.js'],
    priority: ['charts', 'graphs', 'data-viz']
  },
  reporting: {
    eager: ['react', 'react-dom'],
    priority: ['reports', 'pdf-generation', 'export']
  },
  financialAnalysis: {
    eager: ['react', 'react-dom'],
    priority: ['financial-metrics', 'dashboard', 'analysis']
  },
  coreUi: {
    eager: ['react', 'react-dom', '@headlessui/react'],
    priority: ['ui-components', 'layout', 'design-system']
  },
  designSystem: {
    eager: ['react', 'react-dom', '@headlessui/react'],
    priority: ['design-tokens', 'components', 'figma-sync']
  },
  structuredInvestigation: {
    eager: ['react', 'react-dom'],
    priority: ['structured-agents', 'ai-processing', 'investigation']
  },
  manualInvestigation: {
    eager: ['react', 'react-dom'],
    priority: ['manual-workflow', 'collaboration', 'investigation']
  }
};

// Enhanced shared dependencies with service-specific eager loading
const getSharedDependencies = (service) => {
  const serviceOpts = serviceOptimizations[service] || serviceOptimizations.shell;

  // No shared dependencies for manualInvestigation to debug Module Federation issue
  if (service === 'manualInvestigation') {
    return {};
  }

  return {
    react: {
      singleton: true,
      requiredVersion: '^18.2.0',
      eager: true // React should always be eager for proper initialization
    },
    'react-dom': {
      singleton: true,
      requiredVersion: '^18.2.0',
      eager: true // React-dom should always be eager for proper initialization
    },
    'react-router-dom': {
      singleton: true,
      requiredVersion: '^6.11.0',
      eager: service === 'shell' || service === 'structuredInvestigation' || service === 'manualInvestigation' // Shell, structured, and manual investigation need eager router
    },
    '@headlessui/react': {
      singleton: true,
      requiredVersion: '^2.2.8',
      eager: false // Never eager to prevent loading issues
    },
    '@heroicons/react': {
      singleton: true,
      requiredVersion: '^2.0.18',
      eager: false
    },
    'chart.js': {
      singleton: true,
      requiredVersion: '^4.2.1',
      eager: false // Charts are not critical for initial load
    },
    'react-chartjs-2': {
      singleton: true,
      requiredVersion: '^5.2.0',
      eager: false
    },
    axios: {
      singleton: true,
      requiredVersion: '^1.4.0',
      eager: service === 'shell' // Make axios eager for shell to prevent consumption errors
    },
    zod: {
      singleton: true,
      requiredVersion: '^3.22.0',
      eager: service === 'shell' // Make zod eager for shell to prevent validation errors
    },
    zustand: {
      singleton: true,
      requiredVersion: '>=4.4.0',
      eager: service === 'shell', // Make zustand eager for shell state management
      strictVersion: false // Allow version flexibility for zustand
    },
    'date-fns': {
      singleton: true,
      requiredVersion: '^2.29.3',
      eager: false
    },
    'lucide-react': {
      singleton: true,
      requiredVersion: '^0.263.0',
      eager: service === 'structuredInvestigation' || service === 'shell' // Make eager for structured investigation
    },
    mitt: {
      singleton: true,
      requiredVersion: '3.0.1',
      eager: true, // Make mitt eager to prevent consumption errors
      strictVersion: false // Allow version flexibility
    },
    'react-hot-toast': {
      singleton: true,
      requiredVersion: '2.6.0',
      eager: false
    }
  };
};

module.exports = (env, argv) => {
  const isDevelopment = argv.mode === 'development';
  const isProduction = argv.mode === 'production';

  return {
    mode: isDevelopment ? 'development' : 'production',

    entry: getEntryPoint(currentService),

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
        shared: getSharedDependencies(currentService)
      }),

      new HtmlWebpackPlugin({
        template: currentService === 'shell'
          ? './public/index.html'
          : './public/service.html',
        title: `Olorin ${serviceConfig.name.charAt(0).toUpperCase() + serviceConfig.name.slice(1)} Service`,
        favicon: './public/favicon.ico'
      }),

      // Environment variables with service-specific configurations
      new (require('webpack').DefinePlugin)({
        'process.env.NODE_ENV': JSON.stringify(argv.mode || 'development'),
        'process.env.REACT_APP_ENV': JSON.stringify(process.env.REACT_APP_ENV || argv.mode || 'development'),
        'process.env.SERVICE_NAME': JSON.stringify(serviceConfig.name),
        'process.env.SERVICE_PORT': JSON.stringify(serviceConfig.port),
        'process.env.REACT_APP_FRONTEND_PORT': JSON.stringify(process.env.REACT_APP_FRONTEND_PORT || '3000'),
        'process.env.REACT_APP_VERSION': JSON.stringify(process.env.REACT_APP_VERSION || '1.0.0'),

        // API Configuration
        'process.env.REACT_APP_API_BASE_URL': JSON.stringify(process.env.REACT_APP_API_BASE_URL || 'http://localhost:8090'),
        'process.env.REACT_APP_WS_URL': JSON.stringify(process.env.REACT_APP_WS_URL || 'ws://localhost:8090'),
        'process.env.REACT_APP_WS_BASE_URL': JSON.stringify(process.env.REACT_APP_WS_BASE_URL || process.env.REACT_APP_WS_URL || 'ws://localhost:8090'),
        'process.env.REACT_APP_REQUEST_TIMEOUT_MS': JSON.stringify(process.env.REACT_APP_REQUEST_TIMEOUT_MS || '30000'),

        // Polling Configuration
        'process.env.REACT_APP_POLLING_BASE_INTERVAL_MS': JSON.stringify(process.env.REACT_APP_POLLING_BASE_INTERVAL_MS || '30000'),
        'process.env.REACT_APP_POLLING_FAST_INTERVAL_MS': JSON.stringify(process.env.REACT_APP_POLLING_FAST_INTERVAL_MS || '30000'),
        'process.env.REACT_APP_POLLING_SLOW_INTERVAL_MS': JSON.stringify(process.env.REACT_APP_POLLING_SLOW_INTERVAL_MS || '10000'),
        'process.env.REACT_APP_POLLING_MAX_RETRIES': JSON.stringify(process.env.REACT_APP_POLLING_MAX_RETRIES || '3'),
        'process.env.REACT_APP_POLLING_BACKOFF_MULTIPLIER': JSON.stringify(process.env.REACT_APP_POLLING_BACKOFF_MULTIPLIER || '2'),
        'process.env.REACT_APP_POLLING_MAX_BACKOFF_MS': JSON.stringify(process.env.REACT_APP_POLLING_MAX_BACKOFF_MS || '60000'),

        // Feature flags
        'process.env.REACT_APP_FEATURE_ENABLE_RAG': JSON.stringify(process.env.REACT_APP_FEATURE_ENABLE_RAG || 'true'),
        'process.env.REACT_APP_FEATURE_ENABLE_REAL_TIME_UPDATES': JSON.stringify(process.env.REACT_APP_FEATURE_ENABLE_REAL_TIME_UPDATES || 'true'),
        'process.env.REACT_APP_FEATURE_ENABLE_MICROSERVICES': JSON.stringify(process.env.REACT_APP_FEATURE_ENABLE_MICROSERVICES || 'true'),
        'process.env.REACT_APP_FEATURE_ENABLE_WIZARD': JSON.stringify(process.env.REACT_APP_FEATURE_ENABLE_WIZARD || 'true'),
        'process.env.REACT_APP_FEATURE_ENABLE_TEMPLATES': JSON.stringify(process.env.REACT_APP_FEATURE_ENABLE_TEMPLATES || 'true'),
        'process.env.REACT_APP_FEATURE_ENABLE_MULTI_ENTITY': JSON.stringify(process.env.REACT_APP_FEATURE_ENABLE_MULTI_ENTITY || 'true'),
        'process.env.REACT_APP_FEATURE_ENABLE_LLM_INSIGHTS': JSON.stringify(process.env.REACT_APP_FEATURE_ENABLE_LLM_INSIGHTS || 'false'),
        'process.env.REACT_APP_FEATURE_ENABLE_RELATIONSHIP_GRAPH': JSON.stringify(process.env.REACT_APP_FEATURE_ENABLE_RELATIONSHIP_GRAPH || 'true'),
        'process.env.REACT_APP_FEATURE_ENABLE_STATE_PERSISTENCE': JSON.stringify(process.env.REACT_APP_FEATURE_ENABLE_STATE_PERSISTENCE || 'true'),
        'process.env.REACT_APP_FEATURE_ENABLE_OPTIMISTIC_LOCKING': JSON.stringify(process.env.REACT_APP_FEATURE_ENABLE_OPTIMISTIC_LOCKING || 'true'),
        'process.env.REACT_APP_FEATURE_ENABLE_AUDIT_LOG': JSON.stringify(process.env.REACT_APP_FEATURE_ENABLE_AUDIT_LOG || 'true'),
        'process.env.REACT_APP_FEATURE_ENABLE_POLLING': JSON.stringify(process.env.REACT_APP_FEATURE_ENABLE_POLLING || 'true'),
        'process.env.REACT_APP_FEATURE_ENABLE_HYBRID_GRAPH': JSON.stringify(process.env.REACT_APP_FEATURE_ENABLE_HYBRID_GRAPH || 'true'),
        'process.env.REACT_APP_FEATURE_ENABLE_AUTONOMOUS_MODE': JSON.stringify(process.env.REACT_APP_FEATURE_ENABLE_AUTONOMOUS_MODE || 'false'),
        'process.env.REACT_APP_FEATURE_ENABLE_MOCK_DATA': JSON.stringify(process.env.REACT_APP_FEATURE_ENABLE_MOCK_DATA || 'false'),

        // Service Configuration
        'process.env.REACT_APP_SERVICE_NAME': JSON.stringify(serviceConfig.name),

        // Firebase Configuration (optional)
        'process.env.REACT_APP_FIREBASE_API_KEY': JSON.stringify(process.env.REACT_APP_FIREBASE_API_KEY || ''),
        'process.env.REACT_APP_FIREBASE_AUTH_DOMAIN': JSON.stringify(process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || ''),
        'process.env.REACT_APP_FIREBASE_PROJECT_ID': JSON.stringify(process.env.REACT_APP_FIREBASE_PROJECT_ID || ''),
        'process.env.REACT_APP_FIREBASE_STORAGE_BUCKET': JSON.stringify(process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || ''),
        'process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || ''),
        'process.env.REACT_APP_FIREBASE_APP_ID': JSON.stringify(process.env.REACT_APP_FIREBASE_APP_ID || ''),
        'process.env.REACT_APP_FIREBASE_MEASUREMENT_ID': JSON.stringify(process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || ''),

        // UI Configuration
        'process.env.REACT_APP_PAGINATION_SIZE': JSON.stringify(process.env.REACT_APP_PAGINATION_SIZE || '20'),

        // Running Investigations (monitoring) configuration
        'process.env.REACT_APP_INVESTIGATION_POLLING_INTERVAL_MS': JSON.stringify(process.env.REACT_APP_INVESTIGATION_POLLING_INTERVAL_MS),
        'process.env.REACT_APP_INVESTIGATION_POLLING_RETRY_MAX_ATTEMPTS': JSON.stringify(process.env.REACT_APP_INVESTIGATION_POLLING_RETRY_MAX_ATTEMPTS),
        'process.env.REACT_APP_INVESTIGATION_POLLING_RETRY_BASE_DELAY_MS': JSON.stringify(process.env.REACT_APP_INVESTIGATION_POLLING_RETRY_BASE_DELAY_MS),

        // Wizard Configuration
        'process.env.REACT_APP_MAX_ENTITIES': JSON.stringify(process.env.REACT_APP_MAX_ENTITIES || '10'),
        'process.env.REACT_APP_MAX_TOOLS': JSON.stringify(process.env.REACT_APP_MAX_TOOLS || '20'),
        'process.env.REACT_APP_DEFAULT_RISK_THRESHOLD': JSON.stringify(process.env.REACT_APP_DEFAULT_RISK_THRESHOLD || '50'),
        'process.env.REACT_APP_DEFAULT_CORRELATION_MODE': JSON.stringify(process.env.REACT_APP_DEFAULT_CORRELATION_MODE || 'OR'),
        'process.env.REACT_APP_DEFAULT_EXECUTION_MODE': JSON.stringify(process.env.REACT_APP_DEFAULT_EXECUTION_MODE || 'parallel'),
        'process.env.REACT_APP_WIZARD_AUTO_SAVE_INTERVAL_MS': JSON.stringify(process.env.REACT_APP_WIZARD_AUTO_SAVE_INTERVAL_MS || '30000'),
        'process.env.REACT_APP_WIZARD_VALIDATION_DEBOUNCE_MS': JSON.stringify(process.env.REACT_APP_WIZARD_VALIDATION_DEBOUNCE_MS || '500'),
        'process.env.REACT_APP_WIZARD_PROGRESS_UPDATE_INTERVAL_MS': JSON.stringify(process.env.REACT_APP_WIZARD_PROGRESS_UPDATE_INTERVAL_MS || '1000'),

        // Event Bus Configuration
        'process.env.REACT_APP_EVENT_BUS_MAX_QUEUE_SIZE': JSON.stringify(process.env.REACT_APP_EVENT_BUS_MAX_QUEUE_SIZE || '1000'),
        'process.env.REACT_APP_EVENT_BUS_ENABLE_LOGGING': JSON.stringify(process.env.REACT_APP_EVENT_BUS_ENABLE_LOGGING || 'false'),

        // Investigation ID Generation
        'process.env.REACT_APP_INVESTIGATION_ID_PREFIX': JSON.stringify(process.env.REACT_APP_INVESTIGATION_ID_PREFIX || 'inv'),
        'process.env.REACT_APP_INVESTIGATION_ID_TIMESTAMP': JSON.stringify(process.env.REACT_APP_INVESTIGATION_ID_TIMESTAMP || 'true'),
        'process.env.REACT_APP_INVESTIGATION_ID_CRYPTO_RANDOM': JSON.stringify(process.env.REACT_APP_INVESTIGATION_ID_CRYPTO_RANDOM || 'true'),
        'process.env.REACT_APP_INVESTIGATION_ID_RANDOM_LENGTH': JSON.stringify(process.env.REACT_APP_INVESTIGATION_ID_RANDOM_LENGTH || '8'),

        // Cache Configuration
        'process.env.REACT_APP_CACHE_CLEAR_LOCAL_STORAGE': JSON.stringify(process.env.REACT_APP_CACHE_CLEAR_LOCAL_STORAGE || 'true'),
        'process.env.REACT_APP_CACHE_CLEAR_SESSION_STORAGE': JSON.stringify(process.env.REACT_APP_CACHE_CLEAR_SESSION_STORAGE || 'true'),
        'process.env.REACT_APP_CACHE_CLEAR_HTTP_CACHE': JSON.stringify(process.env.REACT_APP_CACHE_CLEAR_HTTP_CACHE || 'true'),
        'process.env.REACT_APP_CACHE_PRESERVE_LOCAL_STORAGE': JSON.stringify(process.env.REACT_APP_CACHE_PRESERVE_LOCAL_STORAGE || 'auth-,user-profile,theme-preference'),
        'process.env.REACT_APP_CACHE_PRESERVE_SESSION_STORAGE': JSON.stringify(process.env.REACT_APP_CACHE_PRESERVE_SESSION_STORAGE || 'csrf-token,session-id'),
        'process.env.REACT_APP_CACHE_CLEAR_INDEXED_DB': JSON.stringify(process.env.REACT_APP_CACHE_CLEAR_INDEXED_DB || 'false'),
        'process.env.REACT_APP_CACHE_CLEAR_COOKIES': JSON.stringify(process.env.REACT_APP_CACHE_CLEAR_COOKIES || 'false'),
        'process.env.REACT_APP_CACHE_CLEAR_CACHE_STORAGE': JSON.stringify(process.env.REACT_APP_CACHE_CLEAR_CACHE_STORAGE || 'false'),

        // Hybrid Graph Configuration
        'process.env.REACT_APP_MAX_CONCURRENT_INVESTIGATIONS': JSON.stringify(process.env.REACT_APP_MAX_CONCURRENT_INVESTIGATIONS || '5'),
        'process.env.REACT_APP_MAX_INVESTIGATION_HISTORY': JSON.stringify(process.env.REACT_APP_MAX_INVESTIGATION_HISTORY || '50'),
        'process.env.REACT_APP_INVESTIGATION_HISTORY_STORAGE_KEY': JSON.stringify(process.env.REACT_APP_INVESTIGATION_HISTORY_STORAGE_KEY || 'olorin_investigation_history'),
        'process.env.REACT_APP_MAX_LOG_ENTRIES_DISPLAY': JSON.stringify(process.env.REACT_APP_MAX_LOG_ENTRIES_DISPLAY || '100'),
        'process.env.REACT_APP_MAX_FINDINGS_PER_PAGE': JSON.stringify(process.env.REACT_APP_MAX_FINDINGS_PER_PAGE || '20'),
        'process.env.REACT_APP_MAX_EVIDENCE_PER_FINDING': JSON.stringify(process.env.REACT_APP_MAX_EVIDENCE_PER_FINDING || '10'),
        'process.env.REACT_APP_MAX_TOOL_EXECUTIONS_DISPLAY': JSON.stringify(process.env.REACT_APP_MAX_TOOL_EXECUTIONS_DISPLAY || '50'),

        // Module Federation URLs
        'process.env.REACT_APP_MF_SHELL_URL': JSON.stringify('http://localhost:3000'),
        'process.env.REACT_APP_MF_INVESTIGATION_URL': JSON.stringify('http://localhost:3001'),
        'process.env.REACT_APP_MF_AGENT_ANALYTICS_URL': JSON.stringify('http://localhost:3002'),
        'process.env.REACT_APP_MF_RAG_INTELLIGENCE_URL': JSON.stringify('http://localhost:3003'),
        'process.env.REACT_APP_MF_VISUALIZATION_URL': JSON.stringify('http://localhost:3004'),
        'process.env.REACT_APP_MF_REPORTING_URL': JSON.stringify('http://localhost:3005'),
        'process.env.REACT_APP_MF_CORE_UI_URL': JSON.stringify('http://localhost:3006'),
        'process.env.REACT_APP_MF_DESIGN_SYSTEM_URL': JSON.stringify('http://localhost:3007'),
        'process.env.REACT_APP_MF_AUTONOMOUS_INVESTIGATION_URL': JSON.stringify('http://localhost:3008'),
        'process.env.REACT_APP_MF_MANUAL_INVESTIGATION_URL': JSON.stringify('http://localhost:3009'),
        'process.env.REACT_APP_SERVICE_OPTIMIZATION': JSON.stringify(serviceOptimizations[currentService]?.priority || []),
        'process.env.REACT_APP_BUILD_TIMESTAMP': JSON.stringify(new Date().toISOString()),
        'process.env.REACT_APP_BUILD_HASH': JSON.stringify(require('crypto').randomBytes(8).toString('hex'))
      })
    ],

    devServer: {
      port: serviceConfig.port,
      host: 'localhost',
      hot: true,
      liveReload: false, // Disable liveReload when hot is enabled to prevent conflicts
      historyApiFallback: true,
      allowedHosts: 'all',
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization',
        'X-Service-Name': serviceConfig.name,
        'X-Service-Version': '1.0.0',
        'X-Build-Timestamp': new Date().toISOString()
      },
      webSocketServer: {
        type: 'ws'
      },
      client: {
        overlay: {
          errors: true,
          warnings: isDevelopment && currentService === 'shell' // Only show warnings for shell in dev
        },
        logging: 'none', // Suppress webpack-dev-server logs
        progress: true,
        reconnect: 5, // Number of reconnection attempts
        webSocketURL: {
          protocol: process.env.WS_PROTOCOL || 'ws',
          hostname: process.env.WS_HOSTNAME || 'localhost',
          port: process.env.WS_PORT || serviceConfig.port
        }
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
          assets: currentService === 'shell' // Only show assets for shell
        },
        writeToDisk: false
      },
      // Service-specific proxy configurations for API calls
      // Convert to array format for webpack dev server v5
      proxy: currentService === 'shell' ? [
        {
          context: ['/api'],
          target: process.env.REACT_APP_API_BASE_URL || 'http://localhost:8090',
          changeOrigin: true,
          secure: false,
          logLevel: 'warn',
          pathRewrite: {
            '^/api': ''
          }
        }
      ] : undefined,
      compress: true,
      open: currentService === 'shell' ? 'http://localhost:3000' : false // Auto-open shell with explicit URL
    },

    optimization: {
      minimize: isProduction,
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
          },
          shared: {
            test: /[\\/]src[\\/]shared[\\/]/,
            name: `shared-${currentService}`,
            chunks: 'all',
            priority: 8,
            reuseExistingChunk: true,
            minChunks: 1
          },
          serviceSpecific: {
            test: new RegExp(`[\\\\/]src[\\\\/]microservices[\\\\/]${currentService.replace(/([A-Z])/g, '-$1').toLowerCase()}[\\\\/]`),
            name: `${currentService}-core`,
            chunks: 'all',
            priority: 6,
            reuseExistingChunk: true,
            minChunks: 1
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
      moduleIds: isDevelopment ? 'named' : 'deterministic',
      chunkIds: isDevelopment ? 'named' : 'deterministic'
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