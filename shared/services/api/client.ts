/**
 * API Client Configuration
 *
 * Platform-agnostic axios client setup, interceptors, authentication handling,
 * and correlation ID propagation for end-to-end request tracing.
 * Works on web, iOS, Android, and tvOS.
 */

import axios, {
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import { useAuthStore } from "../../stores/authStore";
import {
  getCorrelationId,
  generateCorrelationId,
  setCorrelationId,
} from "../../utils/logger";
import logger from "../../utils/logger";
import { isWebPlatform } from "../../utils/storage";

// Correlation ID header name (matches backend)
const CORRELATION_ID_HEADER = "X-Correlation-ID";

// Detect platform and environment
const isWeb = isWebPlatform();
const isDev = typeof process !== 'undefined'
  ? process.env?.NODE_ENV === 'development'
  : typeof __DEV__ !== 'undefined' ? __DEV__ : false;

// Detect Android (React Native specific)
const isAndroid = typeof navigator !== 'undefined' &&
  navigator.product === 'ReactNative' &&
  typeof global !== 'undefined' &&
  (global as any).nativeModuleProxy?.Platform?.OS === 'android';

/**
 * Resolve the env var name for the API base URL based on the platform bundler.
 * Vite exposes VITE_*, Metro/Webpack expose REACT_APP_* or process.env.*.
 */
const getEnvApiUrl = (): string | undefined => {
  if (typeof process !== 'undefined' && process.env) {
    return (
      process.env.REACT_APP_API_BASE_URL ||
      process.env.BAYIT_API_URL
    );
  }
  // Vite (import.meta.env) is handled at the web layer, not here
  return undefined;
};

// Get correct API URL based on platform
const getApiBaseUrl = () => {
  // Prefer explicit env var on all platforms
  const envUrl = getEnvApiUrl();
  if (envUrl) {
    return envUrl;
  }

  // Production builds
  if (!isDev) {
    // Web uses relative path (Firebase Hosting rewrites to Cloud Run)
    if (isWeb) {
      return "/api/v1";
    }
    // Native apps must have REACT_APP_API_BASE_URL or BAYIT_API_URL set at build time
    throw new Error(
      '[Shared API Client] REACT_APP_API_BASE_URL or BAYIT_API_URL environment variable ' +
      'is required for native production builds.',
    );
  }

  // In development:
  if (isWeb) {
    return "http://localhost:8000/api/v1";
  }

  if (isAndroid) {
    return "http://10.0.2.2:8000/api/v1";
  }

  return "http://localhost:8000/api/v1";
};

export const API_BASE_URL = getApiBaseUrl();

// Create scoped logger for API client
const apiLogger = logger.scope("API");

// Security headers for all API requests
const SECURITY_HEADERS = {
  "Content-Type": "application/json",
  "X-Content-Type-Options": "nosniff", // Prevent MIME type sniffing
  "X-Frame-Options": "DENY", // Prevent clickjacking
  "X-XSS-Protection": "1; mode=block", // XSS protection
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains", // Force HTTPS
};

// Timeout values from env, with dev defaults
const getTimeout = (envKey: string, devDefault: number): number => {
  const raw = typeof process !== 'undefined' ? process.env?.[envKey] : undefined;
  if (raw) {
    const parsed = Number(raw);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return devDefault;
};

const API_TIMEOUT_MS = getTimeout('BAYIT_API_TIMEOUT_MS', 15000);
const CONTENT_API_TIMEOUT_MS = getTimeout('BAYIT_CONTENT_API_TIMEOUT_MS', 30000);

// Main API instance with security hardening
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
  headers: SECURITY_HEADERS,
  withCredentials: true, // Enable cookies for CSRF token handling
});

// Separate API instance for content endpoints that involve web scraping
export const contentApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: CONTENT_API_TIMEOUT_MS,
  headers: SECURITY_HEADERS,
  withCredentials: true, // Enable cookies for CSRF token handling
});

// Passkey session header name
const PASSKEY_SESSION_HEADER = "X-Passkey-Session";

// CSRF token header and cookie names (matches backend)
const CSRF_HEADER_NAME = "X-CSRF-Token";
const CSRF_CLIENT_COOKIE_NAME = "csrf_token_client"; // Client-readable cookie (non-HttpOnly)

/**
 * Get CSRF token from cookie
 *
 * CSRF Flow (Cross-Site Request Forgery Protection):
 * 1. On first GET request, server generates CSRF token and sets TWO cookies:
 *    - csrf_token (httpOnly=true) - secure, cannot be read by JavaScript
 *    - csrf_token_client (httpOnly=false) - readable by JavaScript
 * 2. For state-changing requests (POST, PUT, PATCH, DELETE):
 *    - Client reads token from csrf_token_client cookie
 *    - Client sends token in X-CSRF-Token header
 *    - Server validates header token matches csrf_token (the httpOnly cookie)
 * 3. If tokens don't match or are missing, server returns 403 Forbidden
 *
 * This dual-cookie approach provides defense-in-depth:
 * - HttpOnly cookie prevents XSS attacks from stealing token
 * - Client-readable cookie allows legitimate JavaScript to send token in header
 * - SameSite attribute prevents CSRF attacks from other origins
 */
const getCsrfToken = (): string | null => {
  if (isWeb && typeof document !== 'undefined') {
    const cookies = document.cookie.split(";");
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split("=");
      if (name === CSRF_CLIENT_COOKIE_NAME) {
        return decodeURIComponent(value);
      }
    }
  }
  // For native platforms, cookies are handled by the HTTP client
  // Token will be automatically included via withCredentials
  return null;
};

/**
 * Validate request URL to prevent SSRF and open redirect attacks.
 * For web production builds using relative URLs, validation is simplified
 * since requests go through same-origin Firebase Hosting rewrites.
 */
const validateRequestUrl = (url: string): boolean => {
  try {
    // For web production with relative base URL, requests are same-origin
    // Firebase Hosting rewrites handle routing to Cloud Run
    const isRelativeBaseUrl = API_BASE_URL.startsWith("/");
    if (isRelativeBaseUrl) {
      // Only allow relative paths (no absolute URLs that could redirect elsewhere)
      if (url.startsWith("http://") || url.startsWith("https://")) {
        apiLogger.warn(`Absolute URL blocked with relative base: ${url}`);
        return false;
      }
      return true;
    }

    // For absolute base URLs, perform full validation
    const parsedUrl = new URL(url, API_BASE_URL);

    // Only allow HTTPS in production
    if (!isDev && parsedUrl.protocol !== "https:") {
      apiLogger.warn(`Non-HTTPS URL blocked in production: ${url}`);
      return false;
    }

    // Block requests to localhost in production
    if (
      !isDev &&
      (parsedUrl.hostname === "localhost" || parsedUrl.hostname === "127.0.0.1")
    ) {
      apiLogger.warn(`Localhost URL blocked in production: ${url}`);
      return false;
    }

    return true;
  } catch (error) {
    apiLogger.error(`Invalid URL: ${url}`, { error });
    return false;
  }
};

/**
 * Add correlation ID, auth token, passkey session, and CSRF token to request.
 * Validates URLs and prevents credential leakage.
 */
const addRequestHeaders = (
  config: InternalAxiosRequestConfig,
): InternalAxiosRequestConfig => {
  // Validate URL to prevent SSRF attacks
  if (!validateRequestUrl(config.url || "")) {
    throw new Error("Invalid request URL");
  }

  // Add auth token (never in URL or query params)
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Add passkey session token if available (never in URL)
  const passkeySessionToken = useAuthStore.getState().passkeySessionToken;
  if (passkeySessionToken) {
    config.headers[PASSKEY_SESSION_HEADER] = passkeySessionToken;
  }

  // Add CSRF token for state-changing methods (POST, PUT, PATCH, DELETE)
  const method = config.method?.toUpperCase();
  const stateMethods = ["POST", "PUT", "PATCH", "DELETE"];
  if (method && stateMethods.includes(method)) {
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      config.headers[CSRF_HEADER_NAME] = csrfToken;
    }
  }

  // Add correlation ID - use existing or generate new one
  let correlationId = getCorrelationId();
  if (!correlationId) {
    correlationId = generateCorrelationId();
    setCorrelationId(correlationId);
  }
  config.headers[CORRELATION_ID_HEADER] = correlationId;

  // Log request start (without sensitive data)
  apiLogger.debug(`Request: ${config.method?.toUpperCase()} ${config.url}`, {
    correlationId,
    method: config.method,
    url: config.url,
    // Never log auth tokens or sensitive data
  });

  return config;
};

/**
 * Log response timing and extract correlation ID from response.
 */
const handleResponseSuccess = (
  response: AxiosResponse,
): AxiosResponse["data"] => {
  // Extract correlation ID from response (may be different if server generated it)
  const responseCorrelationId =
    response.headers[CORRELATION_ID_HEADER.toLowerCase()];
  const durationMs = response.headers["x-request-duration-ms"];

  apiLogger.debug(`Response: ${response.status} ${response.config.url}`, {
    status: response.status,
    correlationId: responseCorrelationId,
    durationMs: durationMs ? parseInt(durationMs, 10) : undefined,
  });

  return response.data;
};

// Request interceptor to add auth token and correlation ID
api.interceptors.request.use(addRequestHeaders);

/**
 * Handle response errors and log them.
 */
const handleResponseError = (error: unknown): Promise<never> => {
  const axiosError = error as {
    response?: AxiosResponse;
    config?: AxiosRequestConfig;
  };

  // Log error with correlation ID
  const correlationId = getCorrelationId();
  apiLogger.error(`Request failed: ${axiosError.config?.url}`, {
    correlationId,
    status: axiosError.response?.status,
    error: axiosError.response?.data || error,
  });

  if (axiosError.response?.status === 401) {
    const errorDetail =
      (axiosError.response?.data as { detail?: string })?.detail || "";
    const requestUrl = axiosError.config?.url || "";

    const isCriticalAuthEndpoint = [
      "/auth/me",
      "/auth/login",
      "/auth/refresh",
    ].some((path) => requestUrl.includes(path));

    const isTokenError = [
      "Could not validate credentials",
      "Invalid authentication credentials",
      "Token has expired",
      "Invalid token",
      "Signature has expired",
    ].some((msg) => errorDetail.toLowerCase().includes(msg.toLowerCase()));

    if (isCriticalAuthEndpoint || isTokenError) {
      useAuthStore.getState().logout();
    }
  }
  return Promise.reject(axiosError.response?.data || error);
};

// Response interceptor for error handling
api.interceptors.response.use(handleResponseSuccess, handleResponseError);

// Content API interceptors
contentApi.interceptors.request.use(addRequestHeaders);
contentApi.interceptors.response.use(
  handleResponseSuccess,
  handleResponseError,
);

export default api;
