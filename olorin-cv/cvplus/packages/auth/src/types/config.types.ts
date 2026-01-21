/**
 * Configuration Types
 * 
 * Type definitions for authentication module configuration.
  */

export interface AuthModuleConfig {
  firebase: FirebaseConfig;
  providers: ProvidersConfig;
  session: SessionConfig;
  security: SecurityConfig;
  features: FeaturesConfig;
  ui: UIConfig;
  storage: StorageConfig;
  monitoring: MonitoringConfig;
}

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  measurementId?: string;
  
  // Emulator settings (for development)
  emulatorHost?: string;
  emulatorPort?: number;
  useEmulator?: boolean;
}

export interface ProvidersConfig {
  google: GoogleProviderConfig;
  email: EmailProviderConfig;
  anonymous: AnonymousProviderConfig;
}

export interface GoogleProviderConfig {
  enabled: boolean;
  clientId?: string;
  scopes: string[];
  hostedDomain?: string;
  customParameters?: Record<string, string>;
  
  // Calendar integration
  calendarScopes: string[];
  requestCalendarOnSignIn: boolean;
}

export interface EmailProviderConfig {
  enabled: boolean;
  requireEmailVerification: boolean;
  passwordPolicy: PasswordPolicyConfig;
  allowSignUp: boolean;
  customDomain?: string;
}

export interface AnonymousProviderConfig {
  enabled: boolean;
  allowInProduction: boolean;
  autoUpgrade: boolean;
}

export interface PasswordPolicyConfig {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  forbidCommonPasswords: boolean;
  customValidator?: (password: string) => boolean;
}

export interface SessionConfig {
  // Timeout settings
  timeout: number; // milliseconds
  refreshThreshold: number; // milliseconds before expiry
  gracePeriod: number; // milliseconds after expiry
  
  // Cross-tab synchronization
  enableCrossTabSync: boolean;
  syncInterval: number; // milliseconds
  
  // Persistence
  persistSession: boolean;
  storageType: 'localStorage' | 'sessionStorage' | 'indexedDB';
  encryptStorage: boolean;
  
  // Concurrent sessions
  maxConcurrentSessions: number;
  enforceSessionLimit: boolean;
  
  // Monitoring
  trackActivity: boolean;
  idleTimeout: number; // milliseconds
  requireRecentAuth: number; // milliseconds
}

export interface SecurityConfig {
  // Authentication requirements
  requireEmailVerification: boolean;
  enforcePasswordPolicy: boolean;
  enableMFA: boolean;
  
  // Rate limiting
  enableRateLimit: boolean;
  maxLoginAttempts: number;
  lockoutDuration: number; // milliseconds
  
  // Session security
  enableCSRFProtection: boolean;
  validateOrigin: boolean;
  allowedOrigins: string[];
  
  // Token security
  tokenEncryption: boolean;
  tokenRotation: boolean;
  jwtSecretRotation: number; // milliseconds
  
  // Monitoring
  logSecurityEvents: boolean;
  alertOnSuspiciousActivity: boolean;
  ipWhitelist?: string[];
  ipBlacklist?: string[];
}

export interface FeaturesConfig {
  // Core features
  enableGoogleAuth: boolean;
  enableEmailAuth: boolean;
  enableAnonymousAuth: boolean;
  
  // Premium features
  enablePremiumFeatures: boolean;
  premiumFeatureGates: string[];
  
  // Calendar integration
  enableCalendarIntegration: boolean;
  calendarProvider: 'google' | 'outlook' | 'both';
  
  // Profile management
  enableProfileManagement: boolean;
  requiredProfileFields: string[];
  
  // Social features
  enableUserDirectory: boolean;
  enableTeamFeatures: boolean;
  
  // API access
  enableAPIAccess: boolean;
  defaultAPIQuota: number;
}

export interface UIConfig {
  // Authentication UI
  showRememberMe: boolean;
  showForgotPassword: boolean;
  showSignUp: boolean;
  showGoogleSignIn: boolean;
  
  // Branding
  customBranding: BrandingConfig;
  
  // Themes
  theme: 'light' | 'dark' | 'auto';
  customCSS?: string;
  
  // Localization
  defaultLanguage: string;
  supportedLanguages: string[];
  
  // Error handling
  showDetailedErrors: boolean;
  customErrorMessages?: Record<string, string>;
}

export interface BrandingConfig {
  logo?: string;
  logoAlt?: string;
  companyName?: string;
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
  textColor?: string;
  linkColor?: string;
  borderRadius?: string;
  fontFamily?: string;
}

export interface StorageConfig {
  // Local storage
  enableLocalStorage: boolean;
  localStoragePrefix: string;
  
  // Session storage
  enableSessionStorage: boolean;
  sessionStoragePrefix: string;
  
  // IndexedDB
  enableIndexedDB: boolean;
  indexedDBName: string;
  indexedDBVersion: number;
  
  // Encryption
  encryptionKey?: string;
  encryptSensitiveData: boolean;
  
  // Cleanup
  autoCleanup: boolean;
  cleanupInterval: number; // milliseconds
  dataRetentionPeriod: number; // milliseconds
}

export interface MonitoringConfig {
  // Analytics
  enableAnalytics: boolean;
  analyticsProvider?: 'google' | 'mixpanel' | 'amplitude' | 'custom';
  
  // Logging
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  enableConsoleLogging: boolean;
  enableRemoteLogging: boolean;
  logEndpoint?: string;
  
  // Performance monitoring
  enablePerformanceMonitoring: boolean;
  trackUserJourney: boolean;
  
  // Error reporting
  enableErrorReporting: boolean;
  errorReportingService?: 'sentry' | 'bugsnag' | 'rollbar' | 'custom';
  errorReportingDSN?: string;
  
  // Metrics
  collectMetrics: boolean;
  metricsEndpoint?: string;
  batchSize: number;
  flushInterval: number; // milliseconds
}

export interface EnvironmentConfig {
  development: Partial<AuthModuleConfig>;
  staging: Partial<AuthModuleConfig>;
  production: Partial<AuthModuleConfig>;
}

export interface ConfigValidator {
  validate: (config: AuthModuleConfig) => ConfigValidationResult;
}

export interface ConfigValidationResult {
  isValid: boolean;
  errors: ConfigValidationError[];
  warnings: ConfigValidationWarning[];
}

export interface ConfigValidationError {
  path: string;
  message: string;
  value?: any;
}

export interface ConfigValidationWarning {
  path: string;
  message: string;
  recommendation?: string;
}