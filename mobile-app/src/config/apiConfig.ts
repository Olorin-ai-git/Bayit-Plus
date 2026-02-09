/**
 * API Configuration for Mobile App
 *
 * Use this file to configure the backend API connection.
 * All environment-dependent values come from process.env.
 */

import { Platform } from "react-native";
import { logger } from "../utils/logger";

const configLogger = logger.scope("ApiConfig");

/**
 * Reads a required environment variable. In production, throws if missing.
 * In development (__DEV__), returns the provided devDefault.
 */
function requireEnvOrDev(name: string, devDefault: string): string {
  const value = process.env[name];
  if (value) {
    return value;
  }
  if (__DEV__) {
    return devDefault;
  }
  throw new Error(
    `[ApiConfig] Missing required environment variable: ${name}. ` +
      "Set this variable before building for production.",
  );
}

/**
 * Reads a required numeric environment variable. In production, throws if
 * missing or not a valid number. In development, returns devDefault.
 */
function requireNumericEnvOrDev(name: string, devDefault: number): number {
  const raw = process.env[name];
  if (raw) {
    const parsed = Number(raw);
    if (isNaN(parsed)) {
      throw new Error(
        `[ApiConfig] Environment variable ${name} must be a number, got: "${raw}"`,
      );
    }
    return parsed;
  }
  if (__DEV__) {
    return devDefault;
  }
  throw new Error(
    `[ApiConfig] Missing required environment variable: ${name}. ` +
      "Set this variable before building for production.",
  );
}

/**
 * Environment Configuration
 */
export const Config = {
  API_URLS: {
    production: requireEnvOrDev(
      "BAYIT_API_URL",
      "http://localhost:8000/api/v1",
    ),
    development: {
      ios: process.env.IOS_DEV_API_URL || "http://localhost:8000/api/v1",
      android:
        process.env.ANDROID_DEV_API_URL || "http://10.0.2.2:8000/api/v1",
    },
  },

  API_TIMEOUT: requireNumericEnvOrDev("BAYIT_API_TIMEOUT_MS", 5000),
};

/**
 * Get the API base URL based on current environment and platform
 */
export const getApiBaseUrl = (): string => {
  const useLocalDev =
    __DEV__ && process.env.BAYIT_USE_LOCAL_DEV === "true";

  if (!useLocalDev) {
    return Config.API_URLS.production;
  }

  configLogger.debug("Using local dev API", { platform: Platform.OS });

  if (Platform.OS === "android") {
    return Config.API_URLS.development.android;
  }

  return Config.API_URLS.development.ios;
};

export default Config;
