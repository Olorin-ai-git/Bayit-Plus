/**
 * Shared Utils Index
 * Feature: 002-visualization-microservice
 *
 * Central export for all shared utility functions.
 */

// Remote loader utilities
export {
  loadRemoteModule,
  loadRemoteModules,
  checkServiceHealth,
  checkServicesHealth
} from './remoteLoader';

export type { RemoteServiceConfig, LoadRemoteResult } from './remoteLoader';

// Storage utility
export { storage } from './storage';
