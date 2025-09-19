import { EventBus } from '../../shared/services/EventBus';
import { WebSocketService } from '../../shared/services/WebSocketService';
import { WorkflowEngine } from './WorkflowEngine';
import {
  Investigation,
  InvestigationStatus,
  AgentProgress,
  InvestigationResults,
  AgentResult,
  Evidence,
  InvestigationEvent
} from '../types/investigation';

export interface InvestigationMetrics {
  totalInvestigations: number;
  activeInvestigations: number;
  completedInvestigations: number;
  failedInvestigations: number;
  averageExecutionTime: number;
  successRate: number;
}

export class InvestigationOrchestrator {
  private eventBus: EventBus;
  private webSocket: WebSocketService;
  private workflowEngine: WorkflowEngine;
  private investigations: Map<string, Investigation> = new Map();
  private agentProgress: Map<string, Map<string, AgentProgress>> = new Map();
  private investigationEvents: Map<string, InvestigationEvent[]> = new Map();

  constructor(eventBus: EventBus, webSocket: WebSocketService) {
    this.eventBus = eventBus;
    this.webSocket = webSocket;
    this.workflowEngine = new WorkflowEngine(eventBus, webSocket);
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Listen to workflow engine events
    this.eventBus.on('investigation:started', this.handleInvestigationStarted.bind(this));
    this.eventBus.on('investigation:paused', this.handleInvestigationPaused.bind(this));
    this.eventBus.on('investigation:resumed', this.handleInvestigationResumed.bind(this));
    this.eventBus.on('investigation:stopped', this.handleInvestigationStopped.bind(this));
    this.eventBus.on('investigation:finalized', this.handleInvestigationFinalized.bind(this));
    this.eventBus.on('investigation:error', this.handleInvestigationError.bind(this));

    // Listen to agent events
    this.eventBus.on('agent:started', this.handleAgentStarted.bind(this));
    this.eventBus.on('agent:progress', this.handleAgentProgress.bind(this));
    this.eventBus.on('agent:completed', this.handleAgentCompleted.bind(this));
    this.eventBus.on('agent:failed', this.handleAgentFailed.bind(this));
    this.eventBus.on('agent:timeout', this.handleAgentTimeout.bind(this));
  }

  public async createInvestigation(investigationData: Partial<Investigation>): Promise<Investigation> {
    const investigation: Investigation = {
      id: `inv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: investigationData.title || 'New Investigation',
      description: investigationData.description || '',
      type: 'autonomous',
      status: 'pending',
      priority: investigationData.priority || 'medium',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'user', // TODO: Get from auth context
      assignedAgents: investigationData.assignedAgents || [],
      configuration: investigationData.configuration || {
        agents: [],
        parameters: {}
      },
      progress: {
        overall: 0,
        agents: []
      },
      metadata: investigationData.metadata || {}
    };

    // Store investigation
    this.investigations.set(investigation.id, investigation);
    this.agentProgress.set(investigation.id, new Map());
    this.investigationEvents.set(investigation.id, []);

    // Add creation event
    this.addInvestigationEvent(investigation.id, {
      id: `event-${Date.now()}`,
      timestamp: investigation.createdAt,
      type: 'created',
      actor: 'user',
      description: `Investigation "${investigation.title}" created`
    });

    // Emit creation event
    this.eventBus.emit('investigation:created', {
      id: investigation.id,
      type: 'autonomous'
    });

    return investigation;
  }

  public async startInvestigation(investigationId: string): Promise<void> {
    const investigation = this.investigations.get(investigationId);
    if (!investigation) {
      throw new Error(`Investigation ${investigationId} not found`);
    }

    if (investigation.status !== 'pending' && investigation.status !== 'paused') {
      throw new Error(`Investigation ${investigationId} cannot be started from status: ${investigation.status}`);
    }

    // Update investigation status
    investigation.status = 'running';
    investigation.startedAt = new Date().toISOString();
    investigation.updatedAt = investigation.startedAt;

    // Initialize agent progress
    const agentProgressMap = this.agentProgress.get(investigationId)!;
    investigation.assignedAgents.forEach(agentId => {
      agentProgressMap.set(agentId, {
        agentId,
        progress: 0,
        status: 'pending',
        message: 'Queued for execution'
      });
    });

    investigation.progress.agents = Array.from(agentProgressMap.values());

    // Start workflow execution
    await this.workflowEngine.startInvestigation(investigation);

    this.eventBus.emit('investigation:updated', {
      id: investigationId,
      status: 'running',
      data: investigation
    });
  }

  public async pauseInvestigation(investigationId: string): Promise<void> {
    const investigation = this.investigations.get(investigationId);
    if (!investigation) {
      throw new Error(`Investigation ${investigationId} not found`);
    }

    if (investigation.status !== 'running') {
      throw new Error(`Investigation ${investigationId} cannot be paused from status: ${investigation.status}`);
    }

    investigation.status = 'paused';
    investigation.updatedAt = new Date().toISOString();

    await this.workflowEngine.pauseInvestigation(investigationId);

    this.eventBus.emit('investigation:updated', {
      id: investigationId,
      status: 'paused',
      data: investigation
    });
  }

  public async resumeInvestigation(investigationId: string): Promise<void> {
    const investigation = this.investigations.get(investigationId);
    if (!investigation) {
      throw new Error(`Investigation ${investigationId} not found`);
    }

    if (investigation.status !== 'paused') {
      throw new Error(`Investigation ${investigationId} cannot be resumed from status: ${investigation.status}`);
    }

    investigation.status = 'running';
    investigation.updatedAt = new Date().toISOString();

    await this.workflowEngine.resumeInvestigation(investigationId);

    this.eventBus.emit('investigation:updated', {
      id: investigationId,
      status: 'running',
      data: investigation
    });
  }

  public async stopInvestigation(investigationId: string): Promise<void> {
    const investigation = this.investigations.get(investigationId);
    if (!investigation) {
      throw new Error(`Investigation ${investigationId} not found`);
    }

    if (investigation.status !== 'running' && investigation.status !== 'paused') {
      throw new Error(`Investigation ${investigationId} cannot be stopped from status: ${investigation.status}`);
    }

    investigation.status = 'stopped';
    investigation.completedAt = new Date().toISOString();
    investigation.updatedAt = investigation.completedAt;

    await this.workflowEngine.stopInvestigation(investigationId);

    this.eventBus.emit('investigation:updated', {
      id: investigationId,
      status: 'stopped',
      data: investigation
    });
  }

  public async deleteInvestigation(investigationId: string): Promise<void> {
    const investigation = this.investigations.get(investigationId);
    if (!investigation) {
      throw new Error(`Investigation ${investigationId} not found`);
    }

    // Stop if running
    if (investigation.status === 'running' || investigation.status === 'paused') {
      await this.stopInvestigation(investigationId);
    }

    // Clean up data
    this.investigations.delete(investigationId);
    this.agentProgress.delete(investigationId);
    this.investigationEvents.delete(investigationId);

    this.eventBus.emit('investigation:deleted', {
      id: investigationId,
      timestamp: new Date().toISOString()
    });
  }

  public getInvestigation(investigationId: string): Investigation | undefined {
    return this.investigations.get(investigationId);
  }

  public getAllInvestigations(): Investigation[] {
    return Array.from(this.investigations.values());
  }

  public getInvestigationEvents(investigationId: string): InvestigationEvent[] {
    return this.investigationEvents.get(investigationId) || [];
  }

  public getInvestigationMetrics(): InvestigationMetrics {
    const investigations = Array.from(this.investigations.values());
    const total = investigations.length;
    const active = investigations.filter(inv => inv.status === 'running' || inv.status === 'pending').length;
    const completed = investigations.filter(inv => inv.status === 'completed').length;
    const failed = investigations.filter(inv => inv.status === 'failed').length;

    const completedInvestigations = investigations.filter(inv =>
      inv.status === 'completed' && inv.startedAt && inv.completedAt
    );

    const averageExecutionTime = completedInvestigations.length > 0
      ? completedInvestigations.reduce((sum, inv) => {
          const duration = new Date(inv.completedAt!).getTime() - new Date(inv.startedAt!).getTime();
          return sum + duration;
        }, 0) / completedInvestigations.length
      : 0;

    const successRate = total > 0 ? (completed / total) * 100 : 0;

    return {
      totalInvestigations: total,
      activeInvestigations: active,
      completedInvestigations: completed,
      failedInvestigations: failed,
      averageExecutionTime,
      successRate
    };
  }

  private handleInvestigationStarted(event: any): void {
    this.addInvestigationEvent(event.id, {
      id: `event-${Date.now()}`,
      timestamp: event.timestamp,
      type: 'started',
      actor: 'system',
      description: `Investigation started with ${event.agents.length} agents`
    });
  }

  private handleInvestigationPaused(event: any): void {
    this.addInvestigationEvent(event.id, {
      id: `event-${Date.now()}`,
      timestamp: event.timestamp,
      type: 'paused',
      actor: 'user',
      description: `Investigation paused. Stopped ${event.stoppedAgents.length} agents`
    });
  }

  private handleInvestigationResumed(event: any): void {
    this.addInvestigationEvent(event.id, {
      id: `event-${Date.now()}`,
      timestamp: event.timestamp,
      type: 'resumed',
      actor: 'user',
      description: 'Investigation resumed'
    });
  }

  private handleInvestigationStopped(event: any): void {
    this.addInvestigationEvent(event.id, {
      id: `event-${Date.now()}`,
      timestamp: event.timestamp,
      type: 'stopped',
      actor: 'user',
      description: `Investigation stopped: ${event.reason}`
    });
  }

  private handleInvestigationFinalized(event: any): void {
    const investigation = this.investigations.get(event.id);
    if (!investigation) return;

    investigation.status = event.status;
    investigation.completedAt = event.timestamp;
    investigation.updatedAt = event.timestamp;

    // Calculate final progress
    investigation.progress.overall = Math.round((event.completedSteps / event.totalSteps) * 100);

    this.addInvestigationEvent(event.id, {
      id: `event-${Date.now()}`,
      timestamp: event.timestamp,
      type: event.status === 'completed' ? 'completed' : 'failed',
      actor: 'system',
      description: `Investigation ${event.status}. ${event.completedSteps}/${event.totalSteps} agents completed successfully`
    });

    this.eventBus.emit('investigation:updated', {
      id: event.id,
      status: event.status,
      data: investigation
    });

    if (event.status === 'completed') {
      this.eventBus.emit('investigation:completed', {
        id: event.id,
        results: investigation.results
      });
    }
  }

  private handleInvestigationError(event: any): void {
    const investigation = this.investigations.get(event.id);
    if (!investigation) return;

    investigation.status = 'failed';
    investigation.error = event.error;
    investigation.completedAt = event.timestamp;
    investigation.updatedAt = event.timestamp;

    this.addInvestigationEvent(event.id, {
      id: `event-${Date.now()}`,
      timestamp: event.timestamp,
      type: 'failed',
      actor: 'system',
      description: `Investigation failed: ${event.error}`
    });

    this.eventBus.emit('investigation:updated', {
      id: event.id,
      status: 'failed',
      data: investigation
    });
  }

  private handleAgentStarted(event: any): void {
    const agentProgressMap = this.agentProgress.get(event.investigationId);
    if (!agentProgressMap) return;

    const progress = agentProgressMap.get(event.agentId);
    if (progress) {
      progress.status = 'running';
      progress.message = 'Agent started';
      progress.startedAt = event.timestamp;
    }

    this.updateInvestigationProgress(event.investigationId);

    this.addInvestigationEvent(event.investigationId, {
      id: `event-${Date.now()}`,
      timestamp: event.timestamp,
      type: 'agent_started',
      actor: 'system',
      description: `Agent ${event.agentId} started`
    });
  }

  private handleAgentProgress(event: any): void {
    const agentProgressMap = this.agentProgress.get(event.investigationId);
    if (!agentProgressMap) return;

    const progress = agentProgressMap.get(event.agentId);
    if (progress) {
      progress.progress = event.progress;
      progress.message = event.message;
    }

    this.updateInvestigationProgress(event.investigationId);
  }

  private handleAgentCompleted(event: any): void {
    const agentProgressMap = this.agentProgress.get(event.investigationId);
    if (!agentProgressMap) return;

    const progress = agentProgressMap.get(event.agentId);
    if (progress) {
      progress.status = 'completed';
      progress.progress = 100;
      progress.message = 'Agent completed successfully';
      progress.completedAt = event.timestamp;
    }

    this.updateInvestigationProgress(event.investigationId);

    this.addInvestigationEvent(event.investigationId, {
      id: `event-${Date.now()}`,
      timestamp: event.timestamp,
      type: 'agent_completed',
      actor: 'system',
      description: `Agent ${event.agentId} completed successfully`
    });
  }

  private handleAgentFailed(event: any): void {
    const agentProgressMap = this.agentProgress.get(event.investigationId);
    if (!agentProgressMap) return;

    const progress = agentProgressMap.get(event.agentId);
    if (progress) {
      progress.status = 'failed';
      progress.message = `Agent failed: ${event.error}`;
      progress.error = event.error;
      progress.completedAt = event.timestamp;
    }

    this.updateInvestigationProgress(event.investigationId);

    this.addInvestigationEvent(event.investigationId, {
      id: `event-${Date.now()}`,
      timestamp: event.timestamp,
      type: 'agent_failed',
      actor: 'system',
      description: `Agent ${event.agentId} failed: ${event.error}${event.retriesLeft > 0 ? ` (${event.retriesLeft} retries left)` : ''}`
    });
  }

  private handleAgentTimeout(event: any): void {
    const agentProgressMap = this.agentProgress.get(event.investigationId);
    if (!agentProgressMap) return;

    const progress = agentProgressMap.get(event.agentId);
    if (progress) {
      progress.status = 'failed';
      progress.message = 'Agent timed out';
      progress.error = 'Execution timeout';
      progress.completedAt = event.timestamp;
    }

    this.updateInvestigationProgress(event.investigationId);

    this.addInvestigationEvent(event.investigationId, {
      id: `event-${Date.now()}`,
      timestamp: event.timestamp,
      type: 'agent_failed',
      actor: 'system',
      description: `Agent ${event.agentId} timed out`
    });
  }

  private updateInvestigationProgress(investigationId: string): void {
    const investigation = this.investigations.get(investigationId);
    const agentProgressMap = this.agentProgress.get(investigationId);
    if (!investigation || !agentProgressMap) return;

    const agentProgresses = Array.from(agentProgressMap.values());
    investigation.progress.agents = agentProgresses;

    // Calculate overall progress
    const totalProgress = agentProgresses.reduce((sum, progress) => sum + progress.progress, 0);
    investigation.progress.overall = Math.round(totalProgress / agentProgresses.length);

    investigation.updatedAt = new Date().toISOString();

    this.eventBus.emit('investigation:progress', {
      id: investigationId,
      progress: investigation.progress,
      timestamp: investigation.updatedAt
    });
  }

  private addInvestigationEvent(investigationId: string, event: InvestigationEvent): void {
    const events = this.investigationEvents.get(investigationId);
    if (events) {
      events.push(event);
      // Keep only last 100 events per investigation
      if (events.length > 100) {
        events.splice(0, events.length - 100);
      }
    }
  }
}