/**
 * Status and State Types
 * 
 * Common status and state management types for the CVPlus platform.
 * Provides consistency across different services and components.
 * 
 * @author Gil Klainert
 * @version 1.0.0
  */

// ============================================================================
// GENERAL STATUS TYPES
// ============================================================================

export type Status = 'idle' | 'loading' | 'success' | 'error';

export type ProcessingStatus = 
  | 'pending' 
  | 'queued'
  | 'initializing'
  | 'processing' 
  | 'analyzing'
  | 'generating'
  | 'validating'
  | 'finalizing'
  | 'completed' 
  | 'failed'
  | 'cancelled'
  | 'timeout';

// Alias for backward compatibility
export type JobStatus = ProcessingStatus;

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

// ============================================================================
// PROCESSING STATE INTERFACES
// ============================================================================

export interface ProcessingState {
  status: ProcessingStatus;
  progress: number; // 0-100
  stage?: string;
  message?: string;
  startedAt: number;
  updatedAt: number;
  estimatedCompletion?: number;
  metadata?: Record<string, any>;
}

export interface ProcessingStep {
  id: string;
  name: string;
  description?: string;
  status: ProcessingStatus;
  progress: number;
  startedAt?: number;
  completedAt?: number;
  duration?: number;
  error?: string;
  dependencies?: string[];
  metadata?: Record<string, any>;
}

export interface ProcessingPipeline {
  id: string;
  name: string;
  steps: ProcessingStep[];
  currentStep?: string;
  overallProgress: number;
  status: ProcessingStatus;
  startedAt: number;
  completedAt?: number;
  totalDuration?: number;
}

// ============================================================================
// SERVICE STATUS TYPES
// ============================================================================

export interface ServiceHealth {
  service: string;
  status: HealthStatus;
  version: string;
  uptime: number;
  responseTime: number;
  lastCheck: number;
  issues?: string[];
  metrics?: {
    cpu: number;
    memory: number;
    requests: number;
    errors: number;
  };
}

export interface SystemStatus {
  overall: HealthStatus;
  services: Record<string, ServiceHealth>;
  dependencies: Record<string, ServiceHealth>;
  alerts: Array<{
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    timestamp: number;
    resolved?: boolean;
  }>;
  lastUpdated: number;
}

// ============================================================================
// FEATURE FLAGS AND AVAILABILITY
// ============================================================================

export type FeatureStatus = 'enabled' | 'disabled' | 'beta' | 'maintenance';

export interface FeatureFlag {
  key: string;
  status: FeatureStatus;
  description?: string;
  rolloutPercentage?: number;
  conditions?: {
    userRoles?: string[];
    userIds?: string[];
    regions?: string[];
    environment?: string[];
  };
  enabledAt?: number;
  disabledAt?: number;
}

export interface ServiceAvailability {
  service: string;
  available: boolean;
  status: FeatureStatus;
  message?: string;
  maintenanceWindow?: {
    start: number;
    end: number;
    description: string;
  };
  degradation?: {
    level: 'minor' | 'major';
    affectedFeatures: string[];
    workarounds?: string[];
  };
}

// ============================================================================
// LOADING AND ASYNC OPERATION STATES
// ============================================================================

export interface LoadingState<T = any> {
  isLoading: boolean;
  data?: T;
  error?: string;
  lastUpdated?: number;
  refreshing?: boolean;
}

export interface AsyncState<T = any> extends LoadingState<T> {
  status: Status;
  progress?: number;
  operationId?: string;
}

export interface CacheState<T = any> {
  data: T;
  timestamp: number;
  expiresAt: number;
  isStale: boolean;
  isValidating: boolean;
  version?: string;
}

// ============================================================================
// QUEUE AND BATCH PROCESSING STATUS
// ============================================================================

export interface QueueStatus {
  name: string;
  size: number;
  processing: number;
  completed: number;
  failed: number;
  avgProcessingTime: number;
  lastProcessed?: number;
  isPaused: boolean;
  workers: {
    active: number;
    idle: number;
    total: number;
  };
}

export interface BatchJobStatus {
  id: string;
  name?: string;
  status: ProcessingStatus;
  progress: {
    total: number;
    completed: number;
    failed: number;
    inProgress: number;
  };
  startedAt: number;
  estimatedCompletion?: number;
  results?: {
    successful: any[];
    failed: Array<{
      item: any;
      error: string;
    }>;
  };
}

// ============================================================================
// CONNECTION AND NETWORK STATUS
// ============================================================================

export type ConnectionStatus = 'online' | 'offline' | 'reconnecting' | 'slow';

export interface NetworkStatus {
  status: ConnectionStatus;
  latency?: number;
  bandwidth?: number;
  lastConnected?: number;
  retryAttempts?: number;
  isReconnecting?: boolean;
}

export interface WebSocketStatus {
  connected: boolean;
  url: string;
  readyState: 0 | 1 | 2 | 3; // WebSocket ready states
  lastMessage?: number;
  reconnectAttempts: number;
  heartbeatInterval?: number;
}

// ============================================================================
// USER SESSION STATUS
// ============================================================================

export interface SessionStatus {
  isActive: boolean;
  userId?: string;
  sessionId: string;
  startedAt: number;
  lastActivity: number;
  expiresAt?: number;
  isExpired: boolean;
  deviceInfo?: {
    type: 'desktop' | 'mobile' | 'tablet';
    browser?: string;
    os?: string;
  };
}

// ============================================================================
// RESOURCE UTILIZATION STATUS
// ============================================================================

export interface ResourceStatus {
  cpu: {
    usage: number; // percentage
    cores: number;
  };
  memory: {
    used: number; // bytes
    total: number; // bytes
    usage: number; // percentage
  };
  storage: {
    used: number; // bytes
    total: number; // bytes
    usage: number; // percentage
  };
  network: {
    bytesIn: number;
    bytesOut: number;
    connectionsActive: number;
  };
}