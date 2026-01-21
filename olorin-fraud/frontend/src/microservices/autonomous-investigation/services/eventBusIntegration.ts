/**
 * Event Bus Integration for Autonomous Investigation Microservice
 * Implements microservice event contracts for cross-service communication
 */

import { z } from 'zod';
import { eventBus, EventBusManager } from '../../../shared/events/eventBus';
import type { InvestigationConcept } from '../types/ui.types';
import type { GraphNode } from '../types/graph.types';
import type { Investigation } from '../types/investigation.types';

// Event data validation schemas
const InvestigationConceptSwitchedSchema = z.object({
  investigation_id: z.string(),
  user_id: z.string(),
  view_type: z.enum(['power_grid', 'command_center', 'evidence_trail', 'network_explorer']),
  previous_view: z.string().optional(),
  view_duration_ms: z.number().optional(),
  interaction_count: z.number().optional(),
});

const GraphNodeSelectedSchema = z.object({
  investigation_id: z.string(),
  user_id: z.string(),
  node_id: z.string(),
  node_type: z.enum(['domain', 'tool', 'evidence', 'decision']),
  selection_context: z.enum(['click', 'keyboard', 'search', 'programmatic']),
  related_nodes: z.array(z.string()),
  evidence_count: z.number().optional(),
});

const InvestigationDataUpdatedSchema = z.object({
  investigation_id: z.string(),
  update_type: z.enum(['status', 'progress', 'evidence', 'risk_score']),
  data: z.unknown(),
  timestamp: z.string(),
});

const AgentProgressUpdatedSchema = z.object({
  investigation_id: z.string(),
  agent_name: z.string(),
  agent_type: z.string(),
  status: z.enum(['idle', 'running', 'complete', 'error', 'timeout']),
  progress_percent: z.number().min(0).max(100),
  current_task: z.string().optional(),
  estimated_completion: z.string().optional(),
});

// Event data types
type InvestigationConceptSwitchedData = z.infer<typeof InvestigationConceptSwitchedSchema>;
type GraphNodeSelectedData = z.infer<typeof GraphNodeSelectedSchema>;
type InvestigationDataUpdatedData = z.infer<typeof InvestigationDataUpdatedSchema>;
type AgentProgressUpdatedData = z.infer<typeof AgentProgressUpdatedSchema>;

// Event handlers interface
interface EventHandlers {
  onInvestigationStarted?: (data: any) => void;
  onInvestigationCompleted?: (data: any) => void;
  onEvidenceFound?: (data: any) => void;
  onRiskUpdated?: (data: any) => void;
  onAgentStatusChanged?: (data: any) => void;
  onToolExecutionCompleted?: (data: any) => void;
  onTimelineEventCreated?: (data: any) => void;
  onExportCompleted?: (data: any) => void;
}

/**
 * Autonomous Investigation Event Bus Integration Service
 */
export class AutonomousInvestigationEventBus {
  private eventManager: EventBusManager;
  private subscriptions: Map<string, () => void> = new Map();
  private userId: string = '';
  private currentInvestigationId: string = '';

  constructor() {
    this.eventManager = EventBusManager.getInstance();
  }

  /**
   * Initialize event bus integration with user context
   */
  public initialize(userId: string, investigationId?: string): void {
    this.userId = userId;
    this.currentInvestigationId = investigationId || '';

    // Subscribe to relevant events
    this.subscribeToEvents();

    console.log('[AutonomousInvestigationEventBus] Initialized for user:', userId);
  }

  /**
   * Subscribe to investigation-related events
   */
  private subscribeToEvents(): void {
    const subscriptions = [
      'investigation.started',
      'investigation.progress',
      'investigation.completed',
      'evidence.found',
      'risk.updated',
      'risk.threshold_breached',
      'agent.status_changed',
      'tool.execution_completed',
      'timeline.event_created',
      'export.completed'
    ];

    subscriptions.forEach(eventType => {
      const unsubscribe = this.eventManager.subscribe(
        eventType as any,
        (data: any) => this.handleIncomingEvent(eventType, data),
        'autonomous-investigation'
      );
      this.subscriptions.set(eventType, unsubscribe);
    });
  }

  /**
   * Handle incoming events from other microservices
   */
  private handleIncomingEvent(eventType: string, data: any): void {
    console.log(`[AutonomousInvestigationEventBus] Received event: ${eventType}`, data);

    // Only process events for current investigation
    if (data.investigation_id && data.investigation_id !== this.currentInvestigationId) {
      return;
    }

    // Emit internal events for components to handle
    const internalEvent = `autonomous:${eventType.replace('.', '_')}`;
    this.eventManager.emit(internalEvent as any, data);
  }

  /**
   * Emit investigation concept switched event
   */
  public emitInvestigationConceptSwitched(
    concept: InvestigationConcept,
    previousConcept?: InvestigationConcept,
    viewDurationMs?: number,
    interactionCount?: number
  ): void {
    try {
      const eventData: InvestigationConceptSwitchedData = {
        investigation_id: this.currentInvestigationId,
        user_id: this.userId,
        view_type: this.mapConceptToViewType(concept),
        previous_view: previousConcept ? this.mapConceptToViewType(previousConcept) : undefined,
        view_duration_ms: viewDurationMs,
        interaction_count: interactionCount,
      };

      InvestigationConceptSwitchedSchema.parse(eventData);

      this.eventManager.emit('ui.investigation_view_changed', eventData);
      console.log('[AutonomousInvestigationEventBus] Emitted concept switched:', eventData);
    } catch (error) {
      console.error('[AutonomousInvestigationEventBus] Error emitting concept switched:', error);
    }
  }

  /**
   * Emit graph node selected event
   */
  public emitGraphNodeSelected(
    node: GraphNode,
    selectionContext: 'click' | 'keyboard' | 'search' | 'programmatic',
    relatedNodes: string[] = [],
    evidenceCount?: number
  ): void {
    try {
      const eventData: GraphNodeSelectedData = {
        investigation_id: this.currentInvestigationId,
        user_id: this.userId,
        node_id: node.id,
        node_type: this.mapNodeTypeToEventType(node.type),
        selection_context: selectionContext,
        related_nodes: relatedNodes,
        evidence_count: evidenceCount,
      };

      GraphNodeSelectedSchema.parse(eventData);

      this.eventManager.emit('ui.graph_node_selected', eventData);
      console.log('[AutonomousInvestigationEventBus] Emitted node selected:', eventData);
    } catch (error) {
      console.error('[AutonomousInvestigationEventBus] Error emitting node selected:', error);
    }
  }

  /**
   * Emit investigation data updated event
   */
  public emitInvestigationDataUpdated(
    updateType: 'status' | 'progress' | 'evidence' | 'risk_score',
    data: any
  ): void {
    try {
      const eventData: InvestigationDataUpdatedData = {
        investigation_id: this.currentInvestigationId,
        update_type: updateType,
        data,
        timestamp: new Date().toISOString(),
      };

      InvestigationDataUpdatedSchema.parse(eventData);

      this.eventManager.emit('investigation.data_updated', eventData);
      console.log('[AutonomousInvestigationEventBus] Emitted data updated:', eventData);
    } catch (error) {
      console.error('[AutonomousInvestigationEventBus] Error emitting data updated:', error);
    }
  }

  /**
   * Emit agent progress updated event
   */
  public emitAgentProgressUpdated(
    agentName: string,
    agentType: string,
    status: 'idle' | 'running' | 'complete' | 'error' | 'timeout',
    progressPercent: number,
    currentTask?: string,
    estimatedCompletion?: string
  ): void {
    try {
      const eventData: AgentProgressUpdatedData = {
        investigation_id: this.currentInvestigationId,
        agent_name: agentName,
        agent_type: agentType,
        status,
        progress_percent: progressPercent,
        current_task: currentTask,
        estimated_completion: estimatedCompletion,
      };

      AgentProgressUpdatedSchema.parse(eventData);

      this.eventManager.emit('agent.progress.updated', eventData);
      console.log('[AutonomousInvestigationEventBus] Emitted agent progress:', eventData);
    } catch (error) {
      console.error('[AutonomousInvestigationEventBus] Error emitting agent progress:', error);
    }
  }

  /**
   * Register event handlers for incoming events
   */
  public registerHandlers(handlers: EventHandlers): () => void {
    const unsubscribeFunctions: (() => void)[] = [];

    Object.entries(handlers).forEach(([eventName, handler]) => {
      if (handler) {
        const internalEventName = `autonomous:${eventName.replace('on', '').toLowerCase()}`;
        const unsubscribe = this.eventManager.subscribe(
          internalEventName as any,
          handler,
          'autonomous-investigation-handlers'
        );
        unsubscribeFunctions.push(unsubscribe);
      }
    });

    return () => {
      unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
    };
  }

  /**
   * Update current investigation context
   */
  public setCurrentInvestigation(investigationId: string): void {
    this.currentInvestigationId = investigationId;
    console.log('[AutonomousInvestigationEventBus] Investigation context updated:', investigationId);
  }

  /**
   * Cleanup all subscriptions
   */
  public cleanup(): void {
    this.subscriptions.forEach(unsubscribe => unsubscribe());
    this.subscriptions.clear();
    this.eventManager.cleanup('autonomous-investigation');
    this.eventManager.cleanup('autonomous-investigation-handlers');
    console.log('[AutonomousInvestigationEventBus] Cleaned up all subscriptions');
  }

  /**
   * Map investigation concept to event view type
   */
  private mapConceptToViewType(concept: InvestigationConcept): 'power_grid' | 'command_center' | 'evidence_trail' | 'network_explorer' {
    switch (concept) {
      case 'power-grid':
        return 'power_grid';
      case 'command-center':
        return 'command_center';
      case 'evidence-trail':
        return 'evidence_trail';
      case 'network-explorer':
        return 'network_explorer';
      default:
        return 'power_grid';
    }
  }

  /**
   * Map graph node type to event node type
   */
  private mapNodeTypeToEventType(nodeType: string): 'domain' | 'tool' | 'evidence' | 'decision' {
    if (['device', 'location', 'network', 'logs'].includes(nodeType)) {
      return 'domain';
    }
    if (['splunk', 'gaia', 'shodan'].includes(nodeType)) {
      return 'tool';
    }
    if (nodeType === 'evidence') {
      return 'evidence';
    }
    return 'decision';
  }

  /**
   * Get event bus statistics
   */
  public getStats(): { listeners: number; components: number } {
    return this.eventManager.getStats();
  }
}

// Singleton instance
export const autonomousInvestigationEventBus = new AutonomousInvestigationEventBus();