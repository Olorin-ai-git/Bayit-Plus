/**
 * API Configuration for Mobile App
 *
 * Use this file to configure the backend API connection
 */

import { Platform } from 'react-native';

/**
 * Environment Configuration
 */
export const Config = {
  // Set to true to use demo data (no backend required)
  // Set to false to connect to live backend API
  USE_DEMO_MODE: false,

  // Backend API URLs
  API_URLS: {
    // Production API (Firebase Hosting -> Cloud Run)
    production: 'https://api.bayit.tv/api/v1',

    // Development - Local backend
    // Make sure your backend is running on http://localhost:8000
    development: {
      ios: 'http://localhost:8000/api/v1',
      android: 'http://10.0.2.2:8000/api/v1', // Android emulator special address
    },
  },

  // API timeout (milliseconds)
  API_TIMEOUT: 5000, // 5 seconds - will fallback to demo data on timeout
};

/**
 * Get the API base URL based on current environment and platform
 */
export const getApiBaseUrl = (): string => {
  // Production mode
  if (!__DEV__) {
    return Config.API_URLS.production;
  }

  // Development mode - platform specific
  if (Platform.OS === 'android') {
    return Config.API_URLS.development.android;
  }

  return Config.API_URLS.development.ios;
};

/**
 * Check if app should use demo mode
 */
export const shouldUseDemoMode = (): boolean => {
  return Config.USE_DEMO_MODE;
};

export default Config;
