/**
 * Service Adapter Type Definitions
 * Common types used across all service adapters
 * Feature: Event-driven microservices communication
 */

/**
 * Message delivery mechanism
 * Post spec 005: Polling-based instead of WebSocket
 */
export interface AdapterMessage {
  type: string;
  payload: any;
  target?: string;
  serviceName: string;
  timestamp: Date;
}

/**
 * Event subscription handler
 */
export type EventSubscription = () => void;

/**
 * Adapter initialization configuration
 */
export interface AdapterConfig {
  serviceName: string;
  enableLogging?: boolean;
  messageQueueSize?: number;
  pollingInterval?: number;
}

/**
 * Service health status
 */
export interface ServiceHealthStatus {
  serviceName: string;
  healthy: boolean;
  lastCheck: Date;
  errorCount: number;
  averageResponseTime: number;
}

/**
 * Base adapter interface
 */
export interface IServiceAdapter {
  cleanup(): void;
  getServiceName(): string;
  getHealthStatus(): ServiceHealthStatus;
}

/**
 * Adapter registry interface
 */
export interface IAdapterRegistry {
  getAdapter<T = any>(serviceName: string): T | undefined;
  getAllAdapters(): Map<string, any>;
  cleanup(): void;
}
