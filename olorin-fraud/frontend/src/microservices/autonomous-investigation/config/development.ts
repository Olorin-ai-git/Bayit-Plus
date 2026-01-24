export const developmentConfig = {
  // API Configuration - CRITICAL: No fallbacks allowed for security
  api: {
    baseUrl: process.env.REACT_APP_API_URL || (() => {
      throw new Error('CRITICAL: REACT_APP_API_URL is not set. Set it in your .env file. No fallback allowed for security.');
    })(),
    timeout: 30000,
    retryAttempts: 3,
  },

  // WebSocket Configuration - CRITICAL: No fallbacks allowed for security
  websocket: {
    url: process.env.REACT_APP_WS_URL || (() => {
      throw new Error('CRITICAL: REACT_APP_WS_URL is not set. Set it in your .env file. No fallback allowed for security.');
    })(),
    reconnectInterval: 5000,
    maxReconnectAttempts: 10,
  },

  // Investigation Configuration
  investigation: {
    defaultUpdateInterval: 1000,
    maxNodeCount: 1000,
    maxEdgeCount: 5000,
    autoSaveInterval: 30000,
  },

  // UI Configuration
  ui: {
    animations: {
      enabled: true,
      duration: 300,
    },
    graph: {
      defaultZoom: 1.0,
      minZoom: 0.1,
      maxZoom: 5.0,
      nodeSize: {
        min: 20,
        max: 100,
        default: 40,
      },
    },
    concepts: {
      powerGrid: {
        energyFlowSpeed: 2000,
        gridStabilityThreshold: 0.8,
      },
      commandCenter: {
        updateInterval: 5000,
        alertTimeout: 10000,
      },
      evidenceTrail: {
        stepAnimationDelay: 500,
        maxStepsVisible: 50,
      },
      networkExplorer: {
        clusteringEnabled: true,
        pathHighlightDuration: 3000,
      },
    },
  },

  // Development Features
  development: {
    enableDebugging: true,
    enablePerformanceLogging: true,
    enableHotReload: true,
    mockDataEnabled: false,
    verboseLogging: true,
  },

  // Performance Configuration
  performance: {
    enableVirtualization: true,
    chunkSize: 100,
    debounceDelay: 300,
    throttleDelay: 100,
  },

  // Feature Flags
  features: {
    powerGridConcept: true,
    commandCenterConcept: true,
    evidenceTrailConcept: true,
    networkExplorerConcept: true,
    realTimeUpdates: true,
    exportFunctionality: true,
    advancedFiltering: true,
  },
};

export type DevelopmentConfig = typeof developmentConfig;
