/**
 * Service Type Definitions
 * Centralized types for service architecture
 */

// Import canonical types
export type { APIResponse } from '../../types/api/response.types';
export type { ServiceConfig, ServiceHealth } from '../../types/api/config.types';

export interface ServiceRegistration {
  config: ServiceConfig;
  instance?: any;
  health?: ServiceHealth;
}

export type ServiceName =
  | 'investigation'
  | 'agent-analytics'
  | 'rag-intelligence'
  | 'visualization'
  | 'reporting'
  | 'core-ui'
  | 'design-system';

export interface ServiceError {
  service: string;
  error: Error;
  timestamp: Date;
  retryCount?: number;
}
