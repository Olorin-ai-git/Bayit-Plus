/**
 * API Module Entry Point
 * Re-exports all API methods and types for backward compatibility
 */

export { apiClient } from './client';
export * from './types';
export { cvAPI } from './cv';
export { profileAPI } from './profile';
export { analyticsAPI } from './analytics';
export { authAPI } from './auth';

export default apiClient;
