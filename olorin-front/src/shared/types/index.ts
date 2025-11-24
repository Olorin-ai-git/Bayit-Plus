/**
 * Shared Types - Central Export
 *
 * Re-exports from focused type modules for backward compatibility
 * All type definitions are now in focused, single-purpose modules
 */

// Core types
export * from './core/base.types';
export * from './core/user.types';
export * from './core/notification.types';

// API types
export * from './api/response.types';
export * from './api/config.types';

// Investigation types (Feature: 004-new-olorin-frontend)
export * from './entities.types';
export * from './agent.types';
export * from './wizard.types';
export * from './radar.types';

// Investigation types (legacy)
export * from './investigation/investigation.types';
export * from './investigation/structured.types';
export * from './investigation/manual.types';

// WebSocket types
export * from './websocket/websocket.types';

// Agent types
export * from './agent/agent.types';

// RAG Intelligence types - moved to /src/microservices/rag-intelligence/types/ragIntelligence.ts

// Visualization types - moved to /src/microservices/visualization/types/visualization.ts

// Reporting types - moved to /src/microservices/reporting/types/reporting.ts

// UI and Theme types
export * from './ui/theme.types';

// Event types
export * from './events.types';
export * from './common.types';

// Legacy namespace export for backward compatibility
export namespace OlorinTypes {
  export type { User as TUser } from './core/user.types';
  export type { Investigation as TInvestigation } from './investigation/investigation.types';
  export type { StructuredInvestigation as TStructuredInvestigation } from './investigation/structured.types';
  export type { ManualInvestigation as TManualInvestigation } from './investigation/manual.types';
  export type { AgentMetrics as TAgentMetrics } from './agent/agent.types';
  // RAG types moved to microservices/rag-intelligence/types/ragIntelligence.ts
  // Visualization types moved to microservices/visualization/types/visualization.types.ts
  // Report types moved to microservices/reporting/types/reporting.ts
  export type { Theme as TTheme } from './ui/theme.types';
  export type { Notification as TNotification } from './core/notification.types';
  export type { APIResponse as TAPIResponse } from './api/response.types';
  export type { PaginatedResponse as TPaginatedResponse } from './api/response.types';
}

export default OlorinTypes;
