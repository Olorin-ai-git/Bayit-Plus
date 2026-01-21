/**
 * Service Adapters - Public API
 * Main entry point with backward-compatible exports
 * Feature: Event-driven microservices communication
 *
 * REFACTORED FROM: service-adapters.ts (683 lines, 341% over 200-line limit!)
 * NEW ARCHITECTURE: Modular structure with focused modules
 *
 * MODULES (all < 200 lines):
 * - types/adapter-types.ts (61 lines) - Type definitions
 * - base/BaseServiceAdapter.ts (155 lines) - Abstract base class
 * - services/InvestigationAdapter.ts (139 lines) - Investigation service
 * - services/AgentAnalyticsAdapter.ts (87 lines) - Agent analytics service
 * - services/RAGIntelligenceAdapter.ts (61 lines) - RAG intelligence service
 * - services/VisualizationAdapter.ts (48 lines) - Visualization service
 * - services/ReportingAdapter.ts (56 lines) - Reporting service
 * - services/CoreUIAdapter.ts (77 lines) - Core UI service
 * - services/DesignSystemAdapter.ts (67 lines) - Design system service
 * - registry/ServiceAdapterRegistry.ts (71 lines) - Registry singleton
 * - factory/adapter-factory.ts (45 lines) - Factory functions
 */

// Type Definitions
export type {
  AdapterMessage,
  EventSubscription,
  AdapterConfig,
  ServiceHealthStatus,
  IServiceAdapter,
  IAdapterRegistry
} from './types/adapter-types';

// Base Adapter
export { BaseServiceAdapter } from './base/BaseServiceAdapter';

// Service Adapters
export { InvestigationAdapter } from './services/InvestigationAdapter';
export { AgentAnalyticsAdapter } from './services/AgentAnalyticsAdapter';
export { RAGIntelligenceAdapter } from './services/RAGIntelligenceAdapter';
export { VisualizationAdapter } from './services/VisualizationAdapter';
export { ReportingAdapter } from './services/ReportingAdapter';
export { CoreUIAdapter } from './services/CoreUIAdapter';
export { DesignSystemAdapter } from './services/DesignSystemAdapter';

// Registry
export { ServiceAdapterRegistry } from './registry/ServiceAdapterRegistry';

// Factory Functions
export { ServiceAdapters } from './factory/adapter-factory';
