import { EventBus } from '../../shared/services/EventBus';
import { WebSocketService } from '../../shared/services/WebSocketService';
import {
  Investigation,
  InvestigationStatus,
  AgentProgress,
  AgentStatus,
  AgentResult,
  Evidence,
  InvestigationEvent,
  InvestigationResults
} from '../types/investigation';

export interface WorkflowStep {
  id: string;
  name: string;
  agentId: string;
  dependencies: string[];
  timeout: number;
  retryCount: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

export interface WorkflowExecutionContext {
  investigationId: string;
  investigation: Investigation;
  steps: WorkflowStep[];
  currentStep?: string;
  isParallel: boolean;
  startedAt: string;
  estimatedDuration?: number;
}

export class WorkflowEngine {
  private eventBus: EventBus;
  private webSocket: WebSocketService;
  private runningWorkflows: Map<string, WorkflowExecutionContext> = new Map();
  private agentTimeouts: Map<string, NodeJS.Timeout> = new Map();

  constructor(eventBus: EventBus, webSocket: WebSocketService) {
    this.eventBus = eventBus;
    this.webSocket = webSocket;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Listen for WebSocket messages from backend agents
    this.webSocket.onMessage('agent:progress', this.handleAgentProgress.bind(this));
    this.webSocket.onMessage('agent:completed', this.handleAgentCompleted.bind(this));
    this.webSocket.onMessage('agent:failed', this.handleAgentFailed.bind(this));
    this.webSocket.onMessage('investigation:status', this.handleInvestigationStatus.bind(this));
  }

  public async startInvestigation(investigation: Investigation): Promise<void> {
    try {
      const workflow = this.createWorkflow(investigation);
      this.runningWorkflows.set(investigation.id, workflow);

      // Emit investigation started event
      this.eventBus.emit('investigation:started', {
        id: investigation.id,
        timestamp: new Date().toISOString(),
        agents: investigation.assignedAgents
      });

      // Start workflow execution
      await this.executeWorkflow(workflow);

    } catch (error) {
      this.handleWorkflowError(investigation.id, error as Error);
    }
  }

  public async pauseInvestigation(investigationId: string): Promise<void> {
    const workflow = this.runningWorkflows.get(investigationId);
    if (!workflow) return;

    // Stop all running agents
    const runningSteps = workflow.steps.filter(step => step.status === 'running');
    for (const step of runningSteps) {
      await this.stopAgent(step.agentId, investigationId);
      step.status = 'pending';
    }

    this.eventBus.emit('investigation:paused', {
      id: investigationId,
      timestamp: new Date().toISOString(),
      stoppedAgents: runningSteps.map(s => s.agentId)
    });
  }

  public async resumeInvestigation(investigationId: string): Promise<void> {
    const workflow = this.runningWorkflows.get(investigationId);
    if (!workflow) return;

    this.eventBus.emit('investigation:resumed', {
      id: investigationId,
      timestamp: new Date().toISOString()
    });

    await this.executeWorkflow(workflow);
  }

  public async stopInvestigation(investigationId: string): Promise<void> {
    const workflow = this.runningWorkflows.get(investigationId);
    if (!workflow) return;

    // Stop all running agents
    const runningSteps = workflow.steps.filter(step => step.status === 'running');
    for (const step of runningSteps) {
      await this.stopAgent(step.agentId, investigationId);
      step.status = 'failed';
    }

    // Clear timeouts
    this.clearAgentTimeouts(investigationId);

    // Remove from running workflows
    this.runningWorkflows.delete(investigationId);

    this.eventBus.emit('investigation:stopped', {
      id: investigationId,
      timestamp: new Date().toISOString(),
      reason: 'User requested'
    });
  }

  private createWorkflow(investigation: Investigation): WorkflowExecutionContext {
    const steps: WorkflowStep[] = investigation.assignedAgents.map((agentId, index) => ({
      id: `step-${index + 1}`,
      name: `Execute ${agentId}`,
      agentId,
      dependencies: investigation.configuration.parameters.parallelAgents ? [] : index > 0 ? [`step-${index}`] : [],
      timeout: investigation.configuration.parameters.maxDuration || 300000, // 5 minutes default
      retryCount: 3,
      status: 'pending'
    }));

    return {
      investigationId: investigation.id,
      investigation,
      steps,
      isParallel: investigation.configuration.parameters.parallelAgents || false,
      startedAt: new Date().toISOString(),
      estimatedDuration: this.calculateEstimatedDuration(steps)
    };
  }

  private async executeWorkflow(workflow: WorkflowExecutionContext): Promise<void> {
    const { steps, isParallel } = workflow;

    if (isParallel) {
      // Execute all agents in parallel
      const promises = steps.map(step => this.executeStep(workflow, step));
      await Promise.allSettled(promises);
    } else {
      // Execute agents sequentially
      for (const step of steps) {
        if (step.status === 'pending') {
          await this.executeStep(workflow, step);

          // If step failed and no retries left, stop workflow
          if (step.status === 'failed') {
            break;
          }
        }
      }
    }

    await this.finalizeWorkflow(workflow);
  }

  private async executeStep(workflow: WorkflowExecutionContext, step: WorkflowStep): Promise<void> {
    const { investigationId, investigation } = workflow;

    try {
      // Check dependencies
      if (!this.areDependenciesMet(workflow, step)) {
        step.status = 'skipped';
        return;
      }

      step.status = 'running';
      step.startedAt = new Date().toISOString();

      // Set timeout for agent execution
      const timeoutId = setTimeout(() => {
        this.handleAgentTimeout(investigationId, step.agentId);
      }, step.timeout);

      this.agentTimeouts.set(`${investigationId}-${step.agentId}`, timeoutId);

      // Send agent execution request to backend
      await this.startAgent(step.agentId, investigation);

      // Emit step started event
      this.eventBus.emit('agent:started', {
        investigationId,
        agentId: step.agentId,
        timestamp: step.startedAt
      });

    } catch (error) {
      await this.handleStepError(workflow, step, error as Error);
    }
  }

  private async startAgent(agentId: string, investigation: Investigation): Promise<void> {
    const agentConfig = investigation.configuration.agents.find(a => a.id === agentId);

    this.webSocket.send({
      type: 'agent:start',
      payload: {
        investigationId: investigation.id,
        agentId,
        configuration: agentConfig?.config || {},
        parameters: investigation.configuration.parameters,
        metadata: investigation.metadata
      },
      timestamp: new Date().toISOString()
    });
  }

  private async stopAgent(agentId: string, investigationId: string): Promise<void> {
    this.webSocket.send({
      type: 'agent:stop',
      payload: {
        investigationId,
        agentId
      },
      timestamp: new Date().toISOString()
    });

    // Clear timeout
    const timeoutKey = `${investigationId}-${agentId}`;
    const timeoutId = this.agentTimeouts.get(timeoutKey);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.agentTimeouts.delete(timeoutKey);
    }
  }

  private handleAgentProgress(data: any): void {
    const { investigationId, agentId, progress, message } = data;
    const workflow = this.runningWorkflows.get(investigationId);
    if (!workflow) return;

    this.eventBus.emit('agent:progress', {
      investigationId,
      agentId,
      progress,
      message,
      timestamp: new Date().toISOString()
    });
  }

  private async handleAgentCompleted(data: any): Promise<void> {
    const { investigationId, agentId, result } = data;
    const workflow = this.runningWorkflows.get(investigationId);
    if (!workflow) return;

    const step = workflow.steps.find(s => s.agentId === agentId);
    if (step) {
      step.status = 'completed';
      step.completedAt = new Date().toISOString();
    }

    // Clear timeout
    const timeoutKey = `${investigationId}-${agentId}`;
    const timeoutId = this.agentTimeouts.get(timeoutKey);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.agentTimeouts.delete(timeoutKey);
    }

    this.eventBus.emit('agent:completed', {
      investigationId,
      agentId,
      result,
      timestamp: new Date().toISOString()
    });

    // Check if workflow is complete
    await this.checkWorkflowCompletion(workflow);
  }

  private async handleAgentFailed(data: any): Promise<void> {
    const { investigationId, agentId, error } = data;
    const workflow = this.runningWorkflows.get(investigationId);
    if (!workflow) return;

    const step = workflow.steps.find(s => s.agentId === agentId);
    if (step) {
      step.retryCount -= 1;
      step.error = error;

      if (step.retryCount > 0) {
        // Retry the step
        setTimeout(() => {
          this.executeStep(workflow, step);
        }, 5000); // 5 second delay before retry
      } else {
        step.status = 'failed';
        step.completedAt = new Date().toISOString();
      }
    }

    this.eventBus.emit('agent:failed', {
      investigationId,
      agentId,
      error,
      retriesLeft: step?.retryCount || 0,
      timestamp: new Date().toISOString()
    });
  }

  private handleAgentTimeout(investigationId: string, agentId: string): void {
    this.stopAgent(agentId, investigationId);

    this.eventBus.emit('agent:timeout', {
      investigationId,
      agentId,
      timestamp: new Date().toISOString()
    });
  }

  private handleInvestigationStatus(data: any): void {
    const { investigationId, status, message } = data;

    this.eventBus.emit('investigation:status_update', {
      id: investigationId,
      status,
      message,
      timestamp: new Date().toISOString()
    });
  }

  private handleWorkflowError(investigationId: string, error: Error): void {
    this.runningWorkflows.delete(investigationId);
    this.clearAgentTimeouts(investigationId);

    this.eventBus.emit('investigation:error', {
      id: investigationId,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }

  private async handleStepError(workflow: WorkflowExecutionContext, step: WorkflowStep, error: Error): Promise<void> {
    step.retryCount -= 1;
    step.error = error.message;

    if (step.retryCount > 0) {
      // Retry after delay
      setTimeout(() => {
        this.executeStep(workflow, step);
      }, 5000);
    } else {
      step.status = 'failed';
      step.completedAt = new Date().toISOString();
    }
  }

  private areDependenciesMet(workflow: WorkflowExecutionContext, step: WorkflowStep): boolean {
    return step.dependencies.every(depId => {
      const depStep = workflow.steps.find(s => s.id === depId);
      return depStep?.status === 'completed';
    });
  }

  private async checkWorkflowCompletion(workflow: WorkflowExecutionContext): Promise<void> {
    const { steps, investigationId } = workflow;
    const completedSteps = steps.filter(s => s.status === 'completed').length;
    const failedSteps = steps.filter(s => s.status === 'failed').length;
    const totalSteps = steps.length;

    // If all steps are complete or failed
    if (completedSteps + failedSteps === totalSteps) {
      await this.finalizeWorkflow(workflow);
    }
  }

  private async finalizeWorkflow(workflow: WorkflowExecutionContext): Promise<void> {
    const { investigationId, steps } = workflow;

    // Clear all timeouts
    this.clearAgentTimeouts(investigationId);

    // Remove from running workflows
    this.runningWorkflows.delete(investigationId);

    // Determine final status
    const completedSteps = steps.filter(s => s.status === 'completed');
    const failedSteps = steps.filter(s => s.status === 'failed');

    const finalStatus: InvestigationStatus =
      failedSteps.length === 0 ? 'completed' :
      completedSteps.length > 0 ? 'completed' : 'failed';

    this.eventBus.emit('investigation:finalized', {
      id: investigationId,
      status: finalStatus,
      completedSteps: completedSteps.length,
      failedSteps: failedSteps.length,
      totalSteps: steps.length,
      timestamp: new Date().toISOString()
    });
  }

  private calculateEstimatedDuration(steps: WorkflowStep[]): number {
    // Simple estimation: sum of all timeouts (for sequential) or max timeout (for parallel)
    return steps.reduce((total, step) => total + step.timeout, 0);
  }

  private clearAgentTimeouts(investigationId: string): void {
    for (const [key, timeoutId] of this.agentTimeouts.entries()) {
      if (key.startsWith(investigationId)) {
        clearTimeout(timeoutId);
        this.agentTimeouts.delete(key);
      }
    }
  }

  public getWorkflowStatus(investigationId: string): WorkflowExecutionContext | undefined {
    return this.runningWorkflows.get(investigationId);
  }

  public getRunningWorkflows(): WorkflowExecutionContext[] {
    return Array.from(this.runningWorkflows.values());
  }
}