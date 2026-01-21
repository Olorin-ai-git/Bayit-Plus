/**
 * Service Adapter Factory
 * Provides convenient factory functions for accessing adapters
 * Feature: Simplified adapter access
 */

import { ServiceAdapterRegistry } from '../registry/ServiceAdapterRegistry';
import type { InvestigationAdapter } from '../services/InvestigationAdapter';
import type { AgentAnalyticsAdapter } from '../services/AgentAnalyticsAdapter';
import type { RAGIntelligenceAdapter } from '../services/RAGIntelligenceAdapter';
import type { VisualizationAdapter } from '../services/VisualizationAdapter';
import type { ReportingAdapter } from '../services/ReportingAdapter';
import type { CoreUIAdapter } from '../services/CoreUIAdapter';
import type { DesignSystemAdapter } from '../services/DesignSystemAdapter';

/**
 * Factory functions for easy access to service adapters
 * Each function returns the singleton instance of the corresponding adapter
 */
export const ServiceAdapters = {
  /** Get Investigation service adapter */
  investigation: () => ServiceAdapterRegistry.getInstance().getAdapter<InvestigationAdapter>('investigation')!,

  /** Get Agent Analytics service adapter */
  agentAnalytics: () => ServiceAdapterRegistry.getInstance().getAdapter<AgentAnalyticsAdapter>('agent-analytics')!,

  /** Get RAG Intelligence service adapter */
  ragIntelligence: () => ServiceAdapterRegistry.getInstance().getAdapter<RAGIntelligenceAdapter>('rag-intelligence')!,

  /** Get Visualization service adapter */
  visualization: () => ServiceAdapterRegistry.getInstance().getAdapter<VisualizationAdapter>('visualization')!,

  /** Get Reporting service adapter */
  reporting: () => ServiceAdapterRegistry.getInstance().getAdapter<ReportingAdapter>('reporting')!,

  /** Get Core UI service adapter */
  coreUI: () => ServiceAdapterRegistry.getInstance().getAdapter<CoreUIAdapter>('core-ui')!,

  /** Get Design System service adapter */
  designSystem: () => ServiceAdapterRegistry.getInstance().getAdapter<DesignSystemAdapter>('design-system')!
};
