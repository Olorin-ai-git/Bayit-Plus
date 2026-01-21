/**
 * Service Adapter Registry
 * Singleton registry managing all microservice adapters
 * Feature: Centralized adapter lifecycle management
 */

import { InvestigationAdapter } from '../services/InvestigationAdapter';
import { AgentAnalyticsAdapter } from '../services/AgentAnalyticsAdapter';
import { RAGIntelligenceAdapter } from '../services/RAGIntelligenceAdapter';
import { VisualizationAdapter } from '../services/VisualizationAdapter';
import { ReportingAdapter } from '../services/ReportingAdapter';
import { CoreUIAdapter } from '../services/CoreUIAdapter';
import { DesignSystemAdapter } from '../services/DesignSystemAdapter';
import type { BaseServiceAdapter } from '../base/BaseServiceAdapter';
import type { IAdapterRegistry } from '../types/adapter-types';

/**
 * Service Adapter Registry
 * Manages lifecycle and access to all service adapters
 */
export class ServiceAdapterRegistry implements IAdapterRegistry {
  private static instance: ServiceAdapterRegistry;
  private adapters: Map<string, BaseServiceAdapter> = new Map();

  private constructor() {
    this.initializeAdapters();
  }

  public static getInstance(): ServiceAdapterRegistry {
    if (!ServiceAdapterRegistry.instance) {
      ServiceAdapterRegistry.instance = new ServiceAdapterRegistry();
    }
    return ServiceAdapterRegistry.instance;
  }

  /** Initialize all service adapters */
  private initializeAdapters(): void {
    this.adapters.set('investigation', new InvestigationAdapter());
    this.adapters.set('agent-analytics', new AgentAnalyticsAdapter());
    this.adapters.set('rag-intelligence', new RAGIntelligenceAdapter());
    this.adapters.set('visualization', new VisualizationAdapter());
    this.adapters.set('reporting', new ReportingAdapter());
    this.adapters.set('core-ui', new CoreUIAdapter());
    this.adapters.set('design-system', new DesignSystemAdapter());

    console.log('🔧 Service adapters initialized for all 7 microservices');
  }

  /** Get service adapter */
  public getAdapter<T extends BaseServiceAdapter = BaseServiceAdapter>(serviceName: string): T | undefined {
    return this.adapters.get(serviceName) as T;
  }

  /** Get all adapters */
  public getAllAdapters(): Map<string, BaseServiceAdapter> {
    return new Map(this.adapters);
  }

  /** Cleanup all adapters */
  public cleanup(): void {
    this.adapters.forEach(adapter => adapter.cleanup());
    this.adapters.clear();
  }

  /** Get adapter health status */
  public getHealthStatus(): Record<string, any> {
    const health: Record<string, any> = {};
    this.adapters.forEach((adapter, name) => {
      health[name] = adapter.getHealthStatus();
    });
    return health;
  }
}
