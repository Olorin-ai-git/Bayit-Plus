/**
 * Sentry Web Shim for TV App Web Build
 *
 * Provides a no-op implementation of @sentry/react-native for web builds.
 * The TV app web build doesn't require full Sentry integration.
 */

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */

type SeverityLevel = 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug';

interface User {
  id?: string;
  email?: string;
  username?: string;
}

interface CaptureOptions {
  extra?: Record<string, unknown>;
  level?: SeverityLevel;
}

// No-op implementations
export const init = (_options?: any): void => {
  console.info('[Sentry] Web shim - error tracking disabled in TV web build');
};

export const captureException = (_error: unknown, _options?: CaptureOptions): string => {
  return '';
};

export const captureMessage = (_message: string, _options?: CaptureOptions): string => {
  return '';
};

export const setUser = (_user: User | null): void => {
  // No-op
};

export const setTag = (_key: string, _value: string): void => {
  // No-op
};

export const addBreadcrumb = (_breadcrumb: any): void => {
  // No-op
};

export const setContext = (_name: string, _context: any): void => {
  // No-op
};

// Wrap function - returns component as-is
export const wrap = <T>(component: T): T => component;

// ErrorBoundary - simple passthrough
export const ErrorBoundary = ({ children }: { children: React.ReactNode }) => children;

export default {
  init,
  captureException,
  captureMessage,
  setUser,
  setTag,
  addBreadcrumb,
  setContext,
  wrap,
  ErrorBoundary,
};
