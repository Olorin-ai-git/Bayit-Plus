/**
 * Investigation Service Adapter (Unified - Feature 004)
 * Replaces legacy StructuredInvestigationAdapter and ManualInvestigationAdapter
 * Feature: Investigation lifecycle and workflow management
 */

import { BaseServiceAdapter } from '../base/BaseServiceAdapter';
import type { RiskFactor, Evidence, Collaborator } from '../../eventBus';

/**
 * Investigation Service Adapter
 * Handles all investigation-related events and workflows
 */
export class InvestigationAdapter extends BaseServiceAdapter {
  constructor() {
    super('investigation');
  }

  protected initialize(): void {
    // Investigation lifecycle events
    this.subscribeToEvent('investigation:started', (data) => {
      this.sendMessage('investigation-started', data);
      console.log(`🔍 Investigation started: ${data.investigation.id}`);
    });

    this.subscribeToEvent('investigation:completed', (data) => {
      this.sendMessage('investigation-completed', data);
      console.log(`✅ Investigation completed: ${data.investigationId}`);
    });

    // Risk and tool events
    this.subscribeToEvent('investigation:risk:calculated', (data) => {
      this.sendMessage('risk-calculated', data);
      this.emitEvent('viz:graph:updated', {
        investigationId: data.investigationId,
        nodes: this.generateRiskNodes(data.score, data.factors),
        edges: this.generateRiskEdges(data.factors)
      });
    });

    this.subscribeToEvent('investigation:progress:updated', (data) => {
      this.sendMessage('progress-updated', data);
    });

    this.subscribeToEvent('investigation:tool:executed', (data) => {
      this.sendMessage('tool-executed', data);
    });

    // Evidence and workflow events
    this.subscribeToEvent('investigation:evidence:added', (data) => {
      this.sendMessage('evidence-added', data);
      this.emitEvent('viz:graph:updated', {
        investigationId: data.investigationId,
        nodes: [{ id: data.evidence.id, label: data.evidence.title, type: 'evidence' }],
        edges: [{ source: data.investigationId, target: data.evidence.id }]
      });
    });

    this.subscribeToEvent('investigation:workflow:updated', (data) => {
      this.sendMessage('workflow-updated', data);
    });

    // Collaboration events
    this.subscribeToEvent('investigation:collaboration:invited', (data) => {
      this.sendMessage('collaborator-invited', data);
      this.emitEvent('ui:notification:show', {
        notification: {
          id: `collab-${Date.now()}`,
          type: 'info',
          title: 'New Collaborator',
          message: `${data.collaborator.name} has been invited to collaborate`,
          duration: 5000
        }
      });
    });
  }

  /** Start new investigation */
  public startInvestigation(investigation: any): void {
    this.emitEvent('investigation:started', { investigation });
  }

  /** Complete investigation */
  public completeInvestigation(investigationId: string, result: any): void {
    this.emitEvent('investigation:completed', { investigationId, result });
  }

  /** Update risk score */
  public updateRiskScore(investigationId: string, score: number, factors: RiskFactor[]): void {
    this.emitEvent('investigation:risk:calculated', { investigationId, score, factors });
  }

  /** Update workflow step */
  public updateWorkflow(investigationId: string, step: number): void {
    this.emitEvent('investigation:workflow:updated', { investigationId, step });
  }

  /** Add evidence */
  public addEvidence(investigationId: string, evidence: Evidence): void {
    this.emitEvent('investigation:evidence:added', { investigationId, evidence });
  }

  /** Invite collaborator */
  public inviteCollaborator(investigationId: string, collaborator: Collaborator): void {
    this.emitEvent('investigation:collaboration:invited', { investigationId, collaborator });
  }

  /** Execute tool */
  public executeTool(investigationId: string, toolId: string, params: any): void {
    this.emitEvent('investigation:tool:executed', { investigationId, toolId, params });
  }

  /** Update progress */
  public updateProgress(investigationId: string, progress: number, phase: string): void {
    this.emitEvent('investigation:progress:updated', { investigationId, progress, phase });
  }

  /** Private: Generate risk visualization nodes */
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

  /** Private: Generate risk visualization edges */
  private generateRiskEdges(factors: RiskFactor[]): any[] {
    return factors.map(factor => ({
      source: 'risk-score',
      target: factor.id,
      weight: factor.score
    }));
  }
}
