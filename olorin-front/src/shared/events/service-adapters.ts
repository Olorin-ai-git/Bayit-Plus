/**
 * Service-Specific Event Bus Adapters for Olorin Microservices
 * Provides specialized event handling for each of the 8 microservices
 */

import { EventBusManager } from './eventBus';
import { WebSocketManager } from './websocket-manager';
import type {
  AutonomousInvestigation,
  ManualInvestigation,
  AIDecision,
  RiskFactor,
  Evidence,
  Collaborator,
  AgentExecution,
  AgentPerformanceMetrics,
  AgentAnomaly,
  RAGInsight,
  Location,
  User,
  Notification,
  ThemeConfig,
  DesignTokens,
  ComponentDefinition,
  ValidationError,
  ServiceHealth
} from './eventBus';

/**
 * Base Service Adapter
 */
export abstract class BaseServiceAdapter {
  protected eventBus: EventBusManager;
  protected webSocketManager: WebSocketManager;
  protected serviceName: string;
  protected subscriptions: (() => void)[] = [];

  constructor(serviceName: string) {
    this.serviceName = serviceName;
    this.eventBus = EventBusManager.getInstance();
    this.webSocketManager = WebSocketManager.getInstance();
    this.initialize();
  }

  /**
   * Initialize adapter and set up subscriptions
   */
  protected abstract initialize(): void;

  /**
   * Clean up all subscriptions
   */
  public cleanup(): void {
    this.subscriptions.forEach(unsubscribe => unsubscribe());
    this.subscriptions = [];
  }

  /**
   * Subscribe to event bus event
   */
  protected subscribeToEvent<K extends keyof import('./eventBus').EventBusEvents>(
    event: K,
    handler: (data: import('./eventBus').EventBusEvents[K]) => void
  ): void {
    const unsubscribe = this.eventBus.subscribe(event, handler, this.serviceName);
    this.subscriptions.push(unsubscribe);
  }

  /**
   * Emit event to event bus
   */
  protected emitEvent<K extends keyof import('./eventBus').EventBusEvents>(
    event: K,
    data: import('./eventBus').EventBusEvents[K]
  ): void {
    this.eventBus.emit(event, data);
  }

  /**
   * Send WebSocket message
   */
  protected sendWebSocketMessage(type: string, payload: any, target?: string): void {
    this.webSocketManager.send({
      type,
      service: this.serviceName,
      target,
      payload
    });
  }
}

/**
 * Autonomous Investigation Service Adapter
 */
export class AutonomousInvestigationAdapter extends BaseServiceAdapter {
  constructor() {
    super('autonomous-investigation');
  }

  protected initialize(): void {
    // Subscribe to autonomous investigation events
    this.subscribeToEvent('auto:investigation:started', (data) => {
      this.sendWebSocketMessage('investigation-started', data);
      console.log(`🤖 Autonomous investigation started: ${data.investigation.id}`);
    });

    this.subscribeToEvent('auto:investigation:completed', (data) => {
      this.sendWebSocketMessage('investigation-completed', data);
      console.log(`✅ Autonomous investigation completed: ${data.investigationId}`);
    });

    this.subscribeToEvent('auto:investigation:escalated', (data) => {
      this.sendWebSocketMessage('investigation-escalated', data);
      this.emitEvent('manual:investigation:started', {
        investigation: this.convertToManualInvestigation(data)
      });
      console.log(`⬆️ Investigation escalated to manual: ${data.id}`);
    });

    this.subscribeToEvent('auto:ai:decision', (data) => {
      this.sendWebSocketMessage('ai-decision', data);
    });

    this.subscribeToEvent('auto:risk:calculated', (data) => {
      this.sendWebSocketMessage('risk-calculated', data);
      this.emitEvent('viz:graph:updated', {
        investigationId: data.investigationId,
        nodes: this.generateRiskNodes(data.score, data.factors),
        edges: this.generateRiskEdges(data.factors)
      });
    });
  }

  /**
   * Start new autonomous investigation
   */
  public startInvestigation(investigation: AutonomousInvestigation): void {
    this.emitEvent('auto:investigation:started', { investigation });
  }

  /**
   * Complete autonomous investigation
   */
  public completeInvestigation(investigationId: string, result: any): void {
    this.emitEvent('auto:investigation:completed', { investigationId, result });
  }

  /**
   * Make AI decision
   */
  public makeAIDecision(investigationId: string, decision: AIDecision): void {
    this.emitEvent('auto:ai:decision', { investigationId, decision });
  }

  /**
   * Update risk score
   */
  public updateRiskScore(investigationId: string, score: number, factors: RiskFactor[]): void {
    this.emitEvent('auto:risk:calculated', { investigationId, score, factors });
  }

  /**
   * Private: Convert autonomous to manual investigation
   */
  private convertToManualInvestigation(data: any): ManualInvestigation {
    return {
      id: data.id,
      investigatorId: 'system',
      userId: data.userId || 'unknown',
      entityType: data.entityType || 'user_id',
      status: 'draft',
      created: new Date()
    } as ManualInvestigation;
  }

  /**
   * Private: Generate risk visualization nodes
   */
  private generateRiskNodes(score: number, factors: RiskFactor[]): any[] {
    return [
      { id: 'risk-score', label: `Risk Score: ${score}`, type: 'score' },
      ...factors.map(factor => ({
        id: factor.id,
        label: factor.description,
        type: 'factor',
        score: factor.score
      }))
    ];
  }

  /**
   * Private: Generate risk visualization edges
   */
  private generateRiskEdges(factors: RiskFactor[]): any[] {
    return factors.map(factor => ({
      source: 'risk-score',
      target: factor.id,
      weight: factor.score
    }));
  }
}

/**
 * Manual Investigation Service Adapter
 */
export class ManualInvestigationAdapter extends BaseServiceAdapter {
  constructor() {
    super('manual-investigation');
  }

  protected initialize(): void {
    this.subscribeToEvent('manual:investigation:started', (data) => {
      this.sendWebSocketMessage('investigation-started', data);
    });

    this.subscribeToEvent('manual:investigation:completed', (data) => {
      this.sendWebSocketMessage('investigation-completed', data);
    });

    this.subscribeToEvent('manual:workflow:updated', (data) => {
      this.sendWebSocketMessage('workflow-updated', data);
    });

    this.subscribeToEvent('manual:evidence:added', (data) => {
      this.sendWebSocketMessage('evidence-added', data);
      this.emitEvent('viz:graph:updated', {
        investigationId: data.investigationId,
        nodes: [{ id: data.evidence.id, label: data.evidence.title, type: 'evidence' }],
        edges: [{ source: data.investigationId, target: data.evidence.id }]
      });
    });

    this.subscribeToEvent('manual:collaboration:invited', (data) => {
      this.sendWebSocketMessage('collaborator-invited', data);
      this.emitEvent('ui:notification:show', {
        notification: {
          id: `collab-${Date.now()}`,
          type: 'info',
          title: 'New Collaborator',
          message: `${data.collaborator.name} has been invited to collaborate`,
          duration: 5000
        } as Notification
      });
    });
  }

  /**
   * Start manual investigation
   */
  public startInvestigation(investigation: ManualInvestigation): void {
    this.emitEvent('manual:investigation:started', { investigation });
  }

  /**
   * Update workflow step
   */
  public updateWorkflow(investigationId: string, step: number): void {
    this.emitEvent('manual:workflow:updated', { investigationId, step });
  }

  /**
   * Add evidence
   */
  public addEvidence(investigationId: string, evidence: Evidence): void {
    this.emitEvent('manual:evidence:added', { investigationId, evidence });
  }

  /**
   * Invite collaborator
   */
  public inviteCollaborator(investigationId: string, collaborator: Collaborator): void {
    this.emitEvent('manual:collaboration:invited', { investigationId, collaborator });
  }
}

/**
 * Agent Analytics Service Adapter
 */
export class AgentAnalyticsAdapter extends BaseServiceAdapter {
  constructor() {
    super('agent-analytics');
  }

  protected initialize(): void {
    this.subscribeToEvent('agent:execution:started', (data) => {
      this.sendWebSocketMessage('agent-execution', data);
    });

    this.subscribeToEvent('agent:execution:completed', (data) => {
      this.sendWebSocketMessage('agent-completed', data);
      this.updatePerformanceMetrics(data.agentId);
    });

    this.subscribeToEvent('agent:performance:updated', (data) => {
      this.sendWebSocketMessage('performance-updated', data);
    });

    this.subscribeToEvent('agent:anomaly:detected', (data) => {
      this.sendWebSocketMessage('anomaly-detected', data);
      this.emitEvent('ui:notification:show', {
        notification: {
          id: `anomaly-${Date.now()}`,
          type: 'warning',
          title: 'Agent Anomaly Detected',
          message: data.anomaly.description,
          duration: 10000
        } as Notification
      });
    });
  }

  /**
   * Start agent execution
   */
  public startExecution(agentId: string, execution: AgentExecution): void {
    this.emitEvent('agent:execution:started', { agentId, execution });
  }

  /**
   * Complete agent execution
   */
  public completeExecution(agentId: string, executionId: string, result: any): void {
    this.emitEvent('agent:execution:completed', { agentId, executionId, result });
  }

  /**
   * Update performance metrics
   */
  public updatePerformance(agentId: string, metrics: AgentPerformanceMetrics): void {
    this.emitEvent('agent:performance:updated', { agentId, metrics });
  }

  /**
   * Detect anomaly
   */
  public detectAnomaly(agentId: string, anomaly: AgentAnomaly): void {
    this.emitEvent('agent:anomaly:detected', { agentId, anomaly });
  }

  /**
   * Private: Update performance metrics based on execution
   */
  private updatePerformanceMetrics(agentId: string): void {
    // Simulate performance metrics calculation
    const metrics: AgentPerformanceMetrics = {
      id: `metrics-${Date.now()}`,
      agentId,
      averageExecutionTime: Math.random() * 1000 + 500,
      successRate: Math.random() * 20 + 80,
      errorRate: Math.random() * 5
    };
    this.updatePerformance(agentId, metrics);
  }
}

/**
 * RAG Intelligence Service Adapter
 */
export class RAGIntelligenceAdapter extends BaseServiceAdapter {
  constructor() {
    super('rag-intelligence');
  }

  protected initialize(): void {
    this.subscribeToEvent('rag:query:executed', (data) => {
      this.sendWebSocketMessage('query-executed', data);
    });

    this.subscribeToEvent('rag:knowledge:updated', (data) => {
      this.sendWebSocketMessage('knowledge-updated', data);
    });

    this.subscribeToEvent('rag:insight:generated', (data) => {
      this.sendWebSocketMessage('insight-generated', data);
      this.emitEvent('viz:chart:data:updated', {
        chartId: `insight-${data.investigationId}`,
        data: this.formatInsightData(data.insight)
      });
    });
  }

  /**
   * Execute RAG query
   */
  public executeQuery(queryId: string, query: string, results: any[]): void {
    this.emitEvent('rag:query:executed', { queryId, query, results });
  }

  /**
   * Update knowledge base
   */
  public updateKnowledge(source: string): void {
    this.emitEvent('rag:knowledge:updated', { source, timestamp: new Date() });
  }

  /**
   * Generate insight
   */
  public generateInsight(investigationId: string, insight: RAGInsight): void {
    this.emitEvent('rag:insight:generated', { investigationId, insight });
  }

  /**
   * Private: Format insight data for visualization
   */
  private formatInsightData(insight: RAGInsight): any {
    return {
      confidence: insight.confidence,
      sources: insight.sources.length,
      content_length: insight.content.length
    };
  }
}

/**
 * Visualization Service Adapter
 */
export class VisualizationAdapter extends BaseServiceAdapter {
  constructor() {
    super('visualization');
  }

  protected initialize(): void {
    this.subscribeToEvent('viz:graph:updated', (data) => {
      this.sendWebSocketMessage('graph-updated', data);
    });

    this.subscribeToEvent('viz:map:location:added', (data) => {
      this.sendWebSocketMessage('location-added', data);
    });

    this.subscribeToEvent('viz:chart:data:updated', (data) => {
      this.sendWebSocketMessage('chart-updated', data);
    });
  }

  /**
   * Update graph visualization
   */
  public updateGraph(investigationId: string, nodes: any[], edges: any[]): void {
    this.emitEvent('viz:graph:updated', { investigationId, nodes, edges });
  }

  /**
   * Add map location
   */
  public addLocation(investigationId: string, location: Location): void {
    this.emitEvent('viz:map:location:added', { investigationId, location });
  }

  /**
   * Update chart data
   */
  public updateChart(chartId: string, data: any): void {
    this.emitEvent('viz:chart:data:updated', { chartId, data });
  }
}

/**
 * Reporting Service Adapter
 */
export class ReportingAdapter extends BaseServiceAdapter {
  constructor() {
    super('reporting');
  }

  protected initialize(): void {
    this.subscribeToEvent('report:generated', (data) => {
      this.sendWebSocketMessage('report-generated', data);
    });

    this.subscribeToEvent('report:export:started', (data) => {
      this.sendWebSocketMessage('export-started', data);
    });

    this.subscribeToEvent('report:export:completed', (data) => {
      this.sendWebSocketMessage('export-completed', data);
      this.emitEvent('ui:notification:show', {
        notification: {
          id: `export-${Date.now()}`,
          type: 'success',
          title: 'Export Complete',
          message: `Report export is ready for download`,
          duration: 5000
        } as Notification
      });
    });
  }

  /**
   * Generate report
   */
  public generateReport(reportId: string, type: string, url: string): void {
    this.emitEvent('report:generated', { reportId, type, url });
  }

  /**
   * Start export
   */
  public startExport(reportId: string, format: string): void {
    this.emitEvent('report:export:started', { reportId, format });
  }

  /**
   * Complete export
   */
  public completeExport(reportId: string, downloadUrl: string): void {
    this.emitEvent('report:export:completed', { reportId, downloadUrl });
  }
}

/**
 * Core UI Service Adapter
 */
export class CoreUIAdapter extends BaseServiceAdapter {
  constructor() {
    super('core-ui');
  }

  protected initialize(): void {
    this.subscribeToEvent('ui:navigation:changed', (data) => {
      this.sendWebSocketMessage('navigation-changed', data);
    });

    this.subscribeToEvent('ui:notification:show', (data) => {
      this.sendWebSocketMessage('notification', data);
    });

    this.subscribeToEvent('ui:theme:changed', (data) => {
      this.sendWebSocketMessage('theme-changed', data);
      this.updateDesignTokens(data.theme);
    });

    this.subscribeToEvent('ui:modal:opened', (data) => {
      this.sendWebSocketMessage('modal-opened', data);
    });

    this.subscribeToEvent('ui:modal:closed', (data) => {
      this.sendWebSocketMessage('modal-closed', data);
    });
  }

  /**
   * Navigate to route
   */
  public navigate(route: string, user: User): void {
    this.emitEvent('ui:navigation:changed', { route, user });
  }

  /**
   * Show notification
   */
  public showNotification(notification: Notification): void {
    this.emitEvent('ui:notification:show', { notification });
  }

  /**
   * Change theme
   */
  public changeTheme(theme: ThemeConfig): void {
    this.emitEvent('ui:theme:changed', { theme });
  }

  /**
   * Open modal
   */
  public openModal(modalId: string, data?: any): void {
    this.emitEvent('ui:modal:opened', { modalId, data });
  }

  /**
   * Close modal
   */
  public closeModal(modalId: string): void {
    this.emitEvent('ui:modal:closed', { modalId });
  }

  /**
   * Private: Update design tokens based on theme
   */
  private updateDesignTokens(theme: ThemeConfig): void {
    // This would integrate with the design tokens system
    console.log('Updating design tokens for theme:', theme.mode);
  }
}

/**
 * Design System Service Adapter
 */
export class DesignSystemAdapter extends BaseServiceAdapter {
  constructor() {
    super('design-system');
  }

  protected initialize(): void {
    this.subscribeToEvent('design:tokens:updated', (data) => {
      this.sendWebSocketMessage('tokens-updated', data);
    });

    this.subscribeToEvent('design:component:generated', (data) => {
      this.sendWebSocketMessage('component-generated', data);
    });

    this.subscribeToEvent('design:figma:synced', (data) => {
      this.sendWebSocketMessage('figma-synced', data);
    });

    this.subscribeToEvent('design:validation:failed', (data) => {
      this.sendWebSocketMessage('validation-failed', data);
      this.emitEvent('ui:notification:show', {
        notification: {
          id: `validation-${Date.now()}`,
          type: 'error',
          title: 'Design Validation Failed',
          message: `Component ${data.componentId} has validation errors`,
          duration: 8000
        } as Notification
      });
    });
  }

  /**
   * Update design tokens
   */
  public updateTokens(tokens: DesignTokens, source: string): void {
    this.emitEvent('design:tokens:updated', { tokens, source });
  }

  /**
   * Generate component
   */
  public generateComponent(component: ComponentDefinition): void {
    this.emitEvent('design:component:generated', { component });
  }

  /**
   * Sync with Figma
   */
  public syncFigma(components: string[]): void {
    this.emitEvent('design:figma:synced', { components, timestamp: new Date() });
  }

  /**
   * Report validation failure
   */
  public reportValidationFailure(componentId: string, errors: ValidationError[]): void {
    this.emitEvent('design:validation:failed', { componentId, errors });
  }
}

/**
 * Service Adapter Registry
 */
export class ServiceAdapterRegistry {
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

  /**
   * Initialize all service adapters
   */
  private initializeAdapters(): void {
    this.adapters.set('autonomous-investigation', new AutonomousInvestigationAdapter());
    this.adapters.set('manual-investigation', new ManualInvestigationAdapter());
    this.adapters.set('agent-analytics', new AgentAnalyticsAdapter());
    this.adapters.set('rag-intelligence', new RAGIntelligenceAdapter());
    this.adapters.set('visualization', new VisualizationAdapter());
    this.adapters.set('reporting', new ReportingAdapter());
    this.adapters.set('core-ui', new CoreUIAdapter());
    this.adapters.set('design-system', new DesignSystemAdapter());

    console.log('🔧 Service adapters initialized for all 8 microservices');
  }

  /**
   * Get service adapter
   */
  public getAdapter<T extends BaseServiceAdapter = BaseServiceAdapter>(serviceName: string): T | undefined {
    return this.adapters.get(serviceName) as T;
  }

  /**
   * Get all adapters
   */
  public getAllAdapters(): Map<string, BaseServiceAdapter> {
    return new Map(this.adapters);
  }

  /**
   * Cleanup all adapters
   */
  public cleanup(): void {
    this.adapters.forEach(adapter => adapter.cleanup());
    this.adapters.clear();
  }
}

/**
 * Factory functions for easy access
 */
export const ServiceAdapters = {
  autonomousInvestigation: () => ServiceAdapterRegistry.getInstance().getAdapter<AutonomousInvestigationAdapter>('autonomous-investigation')!,
  manualInvestigation: () => ServiceAdapterRegistry.getInstance().getAdapter<ManualInvestigationAdapter>('manual-investigation')!,
  agentAnalytics: () => ServiceAdapterRegistry.getInstance().getAdapter<AgentAnalyticsAdapter>('agent-analytics')!,
  ragIntelligence: () => ServiceAdapterRegistry.getInstance().getAdapter<RAGIntelligenceAdapter>('rag-intelligence')!,
  visualization: () => ServiceAdapterRegistry.getInstance().getAdapter<VisualizationAdapter>('visualization')!,
  reporting: () => ServiceAdapterRegistry.getInstance().getAdapter<ReportingAdapter>('reporting')!,
  coreUI: () => ServiceAdapterRegistry.getInstance().getAdapter<CoreUIAdapter>('core-ui')!,
  designSystem: () => ServiceAdapterRegistry.getInstance().getAdapter<DesignSystemAdapter>('design-system')!
};

export default ServiceAdapterRegistry;