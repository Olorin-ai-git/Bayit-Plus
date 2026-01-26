/**
 * Centralized Firebase Configuration for Bayit+ Ecosystem
 *
 * SECURITY: This shared package prevents Firebase config duplication across
 * web, mobile-app, and partner-portal platforms. All platforms use the same
 * configuration source with fail-fast validation.
 *
 * NO hardcoded values, NO fallbacks - configuration must come from environment.
 */

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

/**
 * Get Firebase configuration from environment variables.
 *
 * Supports multiple environment variable formats:
 * - Vite (web): VITE_FIREBASE_API_KEY, import.meta.env
 * - React Native (mobile): FIREBASE_API_KEY, process.env
 * - Next.js (partner): NEXT_PUBLIC_FIREBASE_API_KEY, process.env
 *
 * @throws {Error} If any required Firebase configuration is missing or invalid
 * @returns {FirebaseConfig} Validated Firebase configuration object
 */
export function getFirebaseConfig(): FirebaseConfig {
  /**
   * Get environment variable with platform-specific fallbacks
   */
  const getEnv = (key: string): string => {
    // Try different naming conventions based on platform
    const viteKey = `VITE_FIREBASE_${key}`;
    const nextKey = `NEXT_PUBLIC_FIREBASE_${key}`;
    const plainKey = `FIREBASE_${key}`;

    // Note: import.meta is not supported by Hermes (React Native)
    // For web builds, Vite injects env vars into process.env via define config
    // Check process.env (Node/React Native/Next.js/Vite)
    if (typeof process !== 'undefined' && process.env) {
      // Try Next.js public format first
      if (process.env[nextKey]) return process.env[nextKey];
      // Try Vite format
      if (process.env[viteKey]) return process.env[viteKey];
      // Try plain format
      if (process.env[plainKey]) return process.env[plainKey];
    }

    return '';
  };

  // Build configuration object
  const config: FirebaseConfig = {
    apiKey: getEnv('API_KEY'),
    authDomain: getEnv('AUTH_DOMAIN'),
    projectId: getEnv('PROJECT_ID'),
    storageBucket: getEnv('STORAGE_BUCKET'),
    messagingSenderId: getEnv('MESSAGING_SENDER_ID'),
    appId: getEnv('APP_ID'),
    measurementId: getEnv('MEASUREMENT_ID'), // Optional
  };

  // Required fields for Firebase SDK
  const requiredFields: Array<keyof FirebaseConfig> = [
    'apiKey',
    'authDomain',
    'projectId',
    'storageBucket',
    'messagingSenderId',
    'appId',
  ];

  // Validate required fields
  const missingFields = requiredFields.filter(field => !config[field]);

  if (missingFields.length > 0) {
    const errorMessage = [
      '🔥 FIREBASE CONFIGURATION ERROR',
      '',
      'Missing required Firebase configuration fields:',
      ...missingFields.map(field => {
        const envVarName = field.replace(/([A-Z])/g, '_$1').toUpperCase();
        return `  ❌ ${field}`;
      }),
      '',
      'Set these environment variables:',
      '',
      'Web (Vite):',
      '  VITE_FIREBASE_API_KEY=...',
      '  VITE_FIREBASE_AUTH_DOMAIN=...',
      '  VITE_FIREBASE_PROJECT_ID=...',
      '  VITE_FIREBASE_STORAGE_BUCKET=...',
      '  VITE_FIREBASE_MESSAGING_SENDER_ID=...',
      '  VITE_FIREBASE_APP_ID=...',
      '  VITE_FIREBASE_MEASUREMENT_ID=... (optional)',
      '',
      'Mobile (React Native):',
      '  FIREBASE_API_KEY=...',
      '  FIREBASE_AUTH_DOMAIN=...',
      '  FIREBASE_PROJECT_ID=...',
      '  FIREBASE_STORAGE_BUCKET=...',
      '  FIREBASE_MESSAGING_SENDER_ID=...',
      '  FIREBASE_APP_ID=...',
      '  FIREBASE_MEASUREMENT_ID=... (optional)',
      '',
      'Partner Portal (Next.js):',
      '  NEXT_PUBLIC_FIREBASE_API_KEY=...',
      '  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...',
      '  NEXT_PUBLIC_FIREBASE_PROJECT_ID=...',
      '  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...',
      '  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...',
      '  NEXT_PUBLIC_FIREBASE_APP_ID=...',
      '  NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=... (optional)',
      '',
      'See: packages/firebase-config/README.md for details',
    ].join('\n');

    throw new Error(errorMessage);
  }

  // Validate apiKey format (Firebase API keys should start with certain patterns)
  if (config.apiKey && !config.apiKey.match(/^[A-Za-z0-9_-]+$/)) {
    throw new Error(
      `Invalid Firebase API key format: "${config.apiKey}". ` +
      `Expected alphanumeric string with hyphens and underscores.`
    );
  }

  // Validate projectId format
  if (config.projectId && !config.projectId.match(/^[a-z0-9-]+$/)) {
    throw new Error(
      `Invalid Firebase project ID format: "${config.projectId}". ` +
      `Expected lowercase alphanumeric string with hyphens.`
    );
  }

  // Validate authDomain format (should be a Firebase auth domain or custom domain)
  if (config.authDomain && !config.authDomain.includes('.')) {
    throw new Error(
      `Invalid Firebase auth domain format: "${config.authDomain}". ` +
      `Expected domain name (e.g., "bayit-plus.firebaseapp.com").`
    );
  }

  return config;
}

/**
 * Get Firebase configuration with optional override for testing.
 *
 * @param overrides - Partial configuration to override environment values (testing only)
 * @returns {FirebaseConfig} Firebase configuration object
 */
export function getFirebaseConfigWithOverrides(
  overrides?: Partial<FirebaseConfig>
): FirebaseConfig {
  const config = getFirebaseConfig();
  return { ...config, ...overrides };
}
