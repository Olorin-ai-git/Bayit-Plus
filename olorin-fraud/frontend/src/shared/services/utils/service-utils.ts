/**
 * Service Utilities
 * Helper functions for service operations
 */

import type { APIResponse } from '../types/service-types';
import { ServiceRegistry } from '../registry/ServiceRegistry';

/**
 * Create service URL
 */
export function createServiceURL(
  registry: ServiceRegistry,
  serviceName: string,
  path: string
): string {
  const config = registry.getConfig(serviceName as any);
  if (!config) {
    throw new Error(`Service ${serviceName} not registered`);
  }
  return `${config.baseURL}${path.startsWith('/') ? path : '/' + path}`;
}

/**
 * Retry function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  retries: number = 3,
  delay: number = 1000
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0) {
      throw error;
    }

    await new Promise((resolve) => setTimeout(resolve, delay));
    return retry(fn, retries - 1, delay * 2);
  }
}

/**
 * Validate service response
 */
export function validateResponse<T>(response: APIResponse<T>): boolean {
  return response.status >= 200 && response.status < 300;
}

/**
 * Format service error
 */
export function formatServiceError(error: any): string {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.message) {
    return error.message;
  }
  return 'An unknown error occurred';
}

/**
 * Check service availability
 */
export async function checkServiceAvailability(
  serviceUrl: string
): Promise<boolean> {
  try {
    const response = await fetch(`${serviceUrl}/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    return response.ok;
  } catch {
    return false;
  }
}

export const ServiceUtils = {
  createServiceURL,
  retry,
  validateResponse,
  formatServiceError,
  checkServiceAvailability,
};
