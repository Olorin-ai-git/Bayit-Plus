// Configuration schema with environment variable validation
export interface AppConfig {
  appName: string;
  appEnv: 'development' | 'staging' | 'production';
  api: {
    baseUrl: string;
    wsBaseUrl: string;
  };
  firebase: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
  };
  features: {
    voiceInput: boolean;
    offlineMode: boolean;
    analytics: boolean;
  };
  performance: {
    budgets: {
      '3G': {
        fcp: number;
        lcp: number;
      };
      '4G': {
        fcp: number;
        lcp: number;
      };
    };
  };
}

// Load configuration from environment variables
export function loadConfig(): AppConfig {
  const getEnv = (key: string, defaultValue?: string): string => {
    const value = import.meta.env[key] || defaultValue;
    if (!value) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
  };

  const getBoolEnv = (key: string, defaultValue: boolean = false): boolean => {
    const value = import.meta.env[key];
    if (value === undefined) return defaultValue;
    return value === 'true' || value === '1';
  };

  const getNumberEnv = (key: string, defaultValue: number): number => {
    const value = import.meta.env[key];
    return value ? parseInt(value, 10) : defaultValue;
  };

  return {
    appName: getEnv('VITE_APP_NAME', 'CVPlus'),
    appEnv: getEnv('VITE_APP_ENV', 'development') as AppConfig['appEnv'],
    api: {
      baseUrl: getEnv('VITE_API_BASE_URL'),
      wsBaseUrl: getEnv('VITE_WS_BASE_URL'),
    },
    firebase: {
      apiKey: getEnv('VITE_FIREBASE_API_KEY'),
      authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN'),
      projectId: getEnv('VITE_FIREBASE_PROJECT_ID'),
      storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET'),
      messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
      appId: getEnv('VITE_FIREBASE_APP_ID'),
    },
    features: {
      voiceInput: getBoolEnv('VITE_FEATURE_VOICE_INPUT', false),
      offlineMode: getBoolEnv('VITE_FEATURE_OFFLINE_MODE', true),
      analytics: getBoolEnv('VITE_FEATURE_ANALYTICS', true),
    },
    performance: {
      budgets: {
        '3G': {
          fcp: getNumberEnv('VITE_PERFORMANCE_BUDGET_3G_FCP', 3000),
          lcp: getNumberEnv('VITE_PERFORMANCE_BUDGET_3G_LCP', 5000),
        },
        '4G': {
          fcp: getNumberEnv('VITE_PERFORMANCE_BUDGET_4G_FCP', 1500),
          lcp: getNumberEnv('VITE_PERFORMANCE_BUDGET_4G_LCP', 2500),
        },
      },
    },
  };
}

// Singleton config instance
let config: AppConfig | null = null;

export function getConfig(): AppConfig {
  if (!config) {
    config = loadConfig();
  }
  return config;
}
