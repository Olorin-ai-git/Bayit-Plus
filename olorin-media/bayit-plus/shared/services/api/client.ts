/**
 * API Client Configuration
 *
 * Axios client setup, interceptors, authentication handling,
 * and correlation ID propagation for end-to-end request tracing.
 */

import axios, {
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import { Platform } from "react-native";
import { useAuthStore } from "../../stores/authStore";
import {
  getCorrelationId,
  generateCorrelationId,
  setCorrelationId,
} from "../../utils/logger";
import logger from "../../utils/logger";

// Correlation ID header name (matches backend)
const CORRELATION_ID_HEADER = "X-Correlation-ID";

// Cloud Run production API URL
const CLOUD_RUN_API_URL =
  "https://bayit-plus-backend-534446777606.us-east1.run.app/api/v1";

// Get correct API URL based on platform
const getApiBaseUrl = () => {
  // Production builds
  if (!__DEV__) {
    // Web uses relative path (Firebase Hosting rewrites to Cloud Run)
    if (Platform.OS === "web") {
      return "/api/v1";
    }
    // Native apps use api.bayit.tv
    return "https://api.bayit.tv/api/v1";
  }

  // In development:
  // Web and iOS simulator can use localhost
  if (Platform.OS === "web" || Platform.OS === "ios") {
    return "http://localhost:8000/api/v1";
  }

  // Android emulator uses special address for localhost
  if (Platform.OS === "android") {
    return "http://10.0.2.2:8000/api/v1";
  }

  // tvOS and other platforms use Cloud Run API in development
  return CLOUD_RUN_API_URL;
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

// Main API instance with security hardening
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: SECURITY_HEADERS,
  withCredentials: true, // Enable cookies for CSRF token handling
  validateStatus: (status) => status >= 200 && status < 500, // Don't throw on 4xx/5xx
});

// Separate API instance for content endpoints that involve web scraping
export const contentApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: SECURITY_HEADERS,
  withCredentials: true, // Enable cookies for CSRF token handling
  validateStatus: (status) => status >= 200 && status < 500,
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
  if (Platform.OS === "web") {
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
 * Validate request URL to prevent SSRF and open redirect attacks
 */
const validateRequestUrl = (url: string): boolean => {
  try {
    const parsedUrl = new URL(url, API_BASE_URL);

    // Only allow HTTPS in production
    if (!__DEV__ && parsedUrl.protocol !== "https:") {
      apiLogger.warn(`Non-HTTPS URL blocked in production: ${url}`);
      return false;
    }

    // Block requests to localhost in production
    if (
      !__DEV__ &&
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
