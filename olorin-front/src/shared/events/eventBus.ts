/**
 * Event Bus for Olorin Microservices Architecture
 * Provides centralized communication between all 8 microservices
 */

import mitt, { type Emitter } from 'mitt';

/**
 * Event types for cross-service communication
 */
export interface EventBusEvents {
  // Autonomous Investigation events
  'auto:investigation:started': { investigation: AutonomousInvestigation };
  'auto:investigation:completed': { investigationId: string; result: any };
  'auto:investigation:escalated': { id: string; reason: string; targetService: 'manual' };
  'auto:ai:decision': { investigationId: string; decision: AIDecision };
  'auto:risk:calculated': { investigationId: string; score: number; factors: RiskFactor[] };

  // Manual Investigation events
  'manual:investigation:started': { investigation: ManualInvestigation };
  'manual:investigation:completed': { investigationId: string; result: any };
  'manual:workflow:updated': { investigationId: string; step: number };
  'manual:evidence:added': { investigationId: string; evidence: Evidence };
  'manual:collaboration:invited': { investigationId: string; collaborator: Collaborator };

  // Agent Analytics events
  'agent:execution:started': { agentId: string; execution: AgentExecution };
  'agent:execution:completed': { agentId: string; executionId: string; result: any };
  'agent:performance:updated': { agentId: string; metrics: AgentPerformanceMetrics };
  'agent:anomaly:detected': { agentId: string; anomaly: AgentAnomaly };

  // RAG Intelligence events
  'rag:query:executed': { queryId: string; query: string; results: any[] };
  'rag:knowledge:updated': { source: string; timestamp: Date };
  'rag:insight:generated': { investigationId: string; insight: RAGInsight };

  // Visualization events
  'viz:graph:updated': { investigationId: string; nodes: any[]; edges: any[] };
  'viz:map:location:added': { investigationId: string; location: Location };
  'viz:chart:data:updated': { chartId: string; data: any };

  // Reporting events
  'report:generated': { reportId: string; type: string; url: string };
  'report:export:started': { reportId: string; format: string };
  'report:export:completed': { reportId: string; downloadUrl: string };

  // Core UI events
  'ui:navigation:changed': { route: string; user: User };
  'ui:notification:show': { notification: Notification };
  'ui:theme:changed': { theme: ThemeConfig };
  'ui:modal:opened': { modalId: string; data?: any };
  'ui:modal:closed': { modalId: string };

  // Design System events
  'design:tokens:updated': { tokens: DesignTokens; source: string };
  'design:component:generated': { component: ComponentDefinition };
  'design:figma:synced': { components: string[]; timestamp: Date };
  'design:validation:failed': { componentId: string; errors: ValidationError[] };

  // WebSocket events
  'websocket:connected': { connectionId: string };
  'websocket:disconnected': { connectionId: string };
  'websocket:message': { type: string; data: any };

  // Service health events
  'service:health:check': { service: string; status: ServiceHealth };
  'service:error': { service: string; error: Error };
  'service:recovery': { service: string; timestamp: Date };

  // Test events (Playwright)
  'test:suite:started': { suiteId: string; type: string };
  'test:case:passed': { testId: string; duration: number };
  'test:case:failed': { testId: string; error: Error; screenshot?: string };
  'test:visual:regression': { componentId: string; diff: number };
  'test:coverage:updated': { service: string; coverage: number };
}

/**
 * Type definitions for event data
 */
export interface AutonomousInvestigation {
  id: string;
  userId: string;
  entityType: 'user_id' | 'email' | 'phone' | 'device_id';
  status: 'initializing' | 'analyzing' | 'orchestrating' | 'completed' | 'escalated';
  aiMode: 'aggressive' | 'balanced' | 'conservative';
  created: Date;
}

export interface ManualInvestigation {
  id: string;
  investigatorId: string;
  userId: string;
  entityType: 'user_id' | 'email' | 'phone' | 'device_id';
  status: 'draft' | 'in_progress' | 'review' | 'completed' | 'archived';
  created: Date;
}

export interface AIDecision {
  id: string;
  type: 'continue' | 'escalate' | 'complete';
  confidence: number;
  reasoning: string;
}

export interface RiskFactor {
  id: string;
  category: string;
  score: number;
  description: string;
}

export interface Evidence {
  id: string;
  type: string;
  data: any;
  timestamp: Date;
}

export interface Collaborator {
  id: string;
  name: string;
  role: 'lead' | 'reviewer' | 'viewer';
  permissions: string[];
}

export interface AgentExecution {
  id: string;
  agentId: string;
  status: 'running' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
}

export interface AgentPerformanceMetrics {
  id: string;
  agentId: string;
  averageExecutionTime: number;
  successRate: number;
  errorRate: number;
}

export interface AgentAnomaly {
  id: string;
  agentId: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
}

export interface RAGInsight {
  id: string;
  content: string;
  confidence: number;
  sources: string[];
}

export interface Location {
  id: string;
  latitude: number;
  longitude: number;
  address?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  duration?: number;
}

export interface ThemeConfig {
  mode: 'light' | 'dark';
  primaryColor: string;
  customizations?: Record<string, any>;
}

export interface DesignTokens {
  colors: Record<string, any>;
  typography: Record<string, any>;
  spacing: Record<string, any>;
  shadows: Record<string, any>;
}

export interface ComponentDefinition {
  id: string;
  name: string;
  category: string;
  props: any[];
  examples: any[];
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ServiceHealth {
  service: string;
  status: 'healthy' | 'degraded' | 'down';
  latency: number;
  errorRate: number;
  lastCheck: Date;
}

/**
 * Global event bus instance
 */
export const eventBus: Emitter<EventBusEvents> = mitt<EventBusEvents>();

/**
 * Event bus utilities
 */
export class EventBusManager {
  private static instance: EventBusManager;
  private listeners: Map<string, Function[]> = new Map();

  public static getInstance(): EventBusManager {
    if (!EventBusManager.instance) {
      EventBusManager.instance = new EventBusManager();
    }
    return EventBusManager.instance;
  }

  /**
   * Subscribe to events with automatic cleanup
   */
  public subscribe<K extends keyof EventBusEvents>(
    event: K,
    handler: (data: EventBusEvents[K]) => void,
    component?: string
  ): () => void {
    const wrappedHandler = (data: EventBusEvents[K]) => {
      try {
        handler(data);
      } catch (error) {
        console.error(`Error in event handler for ${event}:`, error);
        this.emit('service:error', {
          service: component || 'unknown',
          error: error as Error
        });
      }
    };

    eventBus.on(event, wrappedHandler);

    // Track listeners for cleanup
    const listeners = this.listeners.get(component || 'global') || [];
    listeners.push(() => eventBus.off(event, wrappedHandler));
    this.listeners.set(component || 'global', listeners);

    // Return unsubscribe function
    return () => {
      eventBus.off(event, wrappedHandler);
      const componentListeners = this.listeners.get(component || 'global') || [];
      const index = componentListeners.indexOf(wrappedHandler);
      if (index > -1) {
        componentListeners.splice(index, 1);
      }
    };
  }

  /**
   * Emit events with error handling
   */
  public emit<K extends keyof EventBusEvents>(
    event: K,
    data: EventBusEvents[K]
  ): void {
    try {
      eventBus.emit(event, data);
    } catch (error) {
      console.error(`Error emitting event ${event}:`, error);
    }
  }

  /**
   * Cleanup all listeners for a component
   */
  public cleanup(component: string): void {
    const listeners = this.listeners.get(component) || [];
    listeners.forEach(unsubscribe => unsubscribe());
    this.listeners.delete(component);
  }

  /**
   * Get event bus statistics
   */
  public getStats(): { listeners: number; components: number } {
    const components = Array.from(this.listeners.keys());
    const totalListeners = components.reduce(
      (total, component) => total + (this.listeners.get(component)?.length || 0),
      0
    );

    return {
      listeners: totalListeners,
      components: components.length,
    };
  }
}

/**
 * React hook for event bus
 */
export function useEventBus() {
  const manager = EventBusManager.getInstance();

  return {
    subscribe: manager.subscribe.bind(manager),
    emit: manager.emit.bind(manager),
    cleanup: manager.cleanup.bind(manager),
    stats: manager.getStats.bind(manager),
  };
}

/**
 * Service-specific event bus helpers
 */
export const AutonomousInvestigationEvents = {
  startInvestigation: (investigation: AutonomousInvestigation) =>
    eventBus.emit('auto:investigation:started', { investigation }),

  completeInvestigation: (investigationId: string, result: any) =>
    eventBus.emit('auto:investigation:completed', { investigationId, result }),

  escalateToManual: (id: string, reason: string) =>
    eventBus.emit('auto:investigation:escalated', { id, reason, targetService: 'manual' }),

  updateRiskScore: (investigationId: string, score: number, factors: RiskFactor[]) =>
    eventBus.emit('auto:risk:calculated', { investigationId, score, factors }),
};

export const ManualInvestigationEvents = {
  startInvestigation: (investigation: ManualInvestigation) =>
    eventBus.emit('manual:investigation:started', { investigation }),

  updateWorkflow: (investigationId: string, step: number) =>
    eventBus.emit('manual:workflow:updated', { investigationId, step }),

  addEvidence: (investigationId: string, evidence: Evidence) =>
    eventBus.emit('manual:evidence:added', { investigationId, evidence }),

  inviteCollaborator: (investigationId: string, collaborator: Collaborator) =>
    eventBus.emit('manual:collaboration:invited', { investigationId, collaborator }),
};

export const UIEvents = {
  showNotification: (notification: Notification) =>
    eventBus.emit('ui:notification:show', { notification }),

  changeTheme: (theme: ThemeConfig) =>
    eventBus.emit('ui:theme:changed', { theme }),

  navigate: (route: string, user: User) =>
    eventBus.emit('ui:navigation:changed', { route, user }),

  openModal: (modalId: string, data?: any) =>
    eventBus.emit('ui:modal:opened', { modalId, data }),

  closeModal: (modalId: string) =>
    eventBus.emit('ui:modal:closed', { modalId }),
};

export default eventBus;