/**
 * LEGACY service-adapters.ts
 * This file has been SUPERSEDED by the new modular service adapters architecture
 * Feature: Event-driven microservices communication
 *
 * REFACTORED FROM: 683 lines (341% over 200-line limit!)
 * NEW ARCHITECTURE: 11 focused modules under adapters/ directory
 *
 * NEW MODULES (all < 200 lines):
 * ✅ types/adapter-types.ts (61 lines) - Type definitions
 * ✅ base/BaseServiceAdapter.ts (155 lines) - Abstract base class
 * ✅ services/InvestigationAdapter.ts (139 lines) - Investigation service
 * ✅ services/AgentAnalyticsAdapter.ts (87 lines) - Agent analytics with Phase 1.2 mock comments
 * ✅ services/RAGIntelligenceAdapter.ts (61 lines) - RAG intelligence service
 * ✅ services/VisualizationAdapter.ts (48 lines) - Visualization service
 * ✅ services/ReportingAdapter.ts (56 lines) - Reporting service
 * ✅ services/CoreUIAdapter.ts (77 lines) - Core UI service
 * ✅ services/DesignSystemAdapter.ts (67 lines) - Design system service
 * ✅ registry/ServiceAdapterRegistry.ts (71 lines) - Registry singleton
 * ✅ factory/adapter-factory.ts (45 lines) - Factory functions
 *
 * Backward compatibility: All exports maintained via re-exports below
 */

// Re-export all types and classes from the modular architecture
export type {
  AdapterMessage,
  EventSubscription,
  AdapterConfig,
  ServiceHealthStatus,
  IServiceAdapter,
  IAdapterRegistry
} from './adapters';

export {
  BaseServiceAdapter,
  InvestigationAdapter,
  AgentAnalyticsAdapter,
  RAGIntelligenceAdapter,
  VisualizationAdapter,
  ReportingAdapter,
  CoreUIAdapter,
  DesignSystemAdapter,
  ServiceAdapterRegistry,
  ServiceAdapters
} from './adapters';

export { default } from './adapters';
