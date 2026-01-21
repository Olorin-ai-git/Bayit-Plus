// Session Checkpoint Service - Backend support for enhanced session management
import * as admin from 'firebase-admin';
import type {
  EnhancedSessionState,
  ProcessingCheckpoint,
  QueuedAction
} from '@cvplus/core';
import { CVStep } from '@cvplus/core';

export interface CheckpointMetadata {
  functionName: string;
  parameters: Record<string, unknown>;
  executionTime?: number;
  memoryUsage?: number;
  error?: string;
}

export class SessionCheckpointService {
  private db: admin.firestore.Firestore;

  constructor() {
    this.db = admin.firestore();
  }

  // =====================================================================================
  // CHECKPOINT CREATION AND MANAGEMENT
  // =====================================================================================

  async createProcessingCheckpoint(
    sessionId: string,
    stepId: CVStep,
    functionName: string,
    parameters: Record<string, unknown>,
    featureId?: string
  ): Promise<ProcessingCheckpoint> {
    const checkpoint: ProcessingCheckpoint = {
      id: this.generateCheckpointId(sessionId, stepId, functionName),
      sessionId,
      step: stepId,
      functionName,
      parameters,
      state: 'pending',
      priority: this.determinePriority(stepId, featureId),
      data: {},
      createdAt: new Date(),
      isRestorable: true,
      retryCount: 0,
      maxRetries: 3
    };

    // Store checkpoint in Firestore
    await this.saveCheckpoint(checkpoint);

    // Update session with new checkpoint
    await this.addCheckpointToSession(sessionId, checkpoint);

    return checkpoint;
  }

  async updateCheckpointStatus(
    checkpointId: string,
    status: ProcessingCheckpoint['state'],
    result?: unknown,
    error?: string,
    executionTime?: number
  ): Promise<void> {
    const checkpointRef = this.db.collection('checkpoints').doc(checkpointId);

    const updates: Partial<ProcessingCheckpoint> = {
      state: status,
      lastAttemptAt: new Date()
    };

    if (result !== undefined) {
      updates.result = result;
    }

    if (error) {
      updates.error = typeof error === 'string' ? { message: error, timestamp: new Date() } : error;
      updates.retryCount = admin.firestore.FieldValue.increment(1) as any;
    }

    if (executionTime) {
      updates.executionTime = executionTime;
    }

    await checkpointRef.update(updates);

    // Update session checkpoint list
    const checkpoint = await this.getCheckpoint(checkpointId);
    if (checkpoint && checkpoint.sessionId) {
      await this.updateSessionCheckpoint(checkpoint.sessionId, checkpoint);
    }
  }

  async getCheckpoint(checkpointId: string): Promise<ProcessingCheckpoint | null> {
    const doc = await this.db.collection('checkpoints').doc(checkpointId).get();
    return doc.exists ? (doc.data() as ProcessingCheckpoint) : null;
  }

  async getSessionCheckpoints(sessionId: string): Promise<ProcessingCheckpoint[]> {
    const snapshot = await this.db
      .collection('checkpoints')
      .where('sessionId', '==', sessionId)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map(doc => doc.data() as ProcessingCheckpoint);
  }

  // =====================================================================================
  // CHECKPOINT EXECUTION AND RETRY LOGIC
  // =====================================================================================

  async executeCheckpoint(checkpointId: string): Promise<boolean> {
    const checkpoint = await this.getCheckpoint(checkpointId);
    if (!checkpoint) {
      throw new Error(`Checkpoint ${checkpointId} not found`);
    }

    // Mark as in progress
    await this.updateCheckpointStatus(checkpointId, 'processing');

    const startTime = Date.now();

    try {
      // Execute the function with stored parameters
      const result = await this.executeFunctionWithCheckpoint(
        checkpoint.functionName ?? '',
        checkpoint.parameters ?? {},
        checkpoint.sessionId
      );

      const executionTime = Date.now() - startTime;

      // Mark as completed
      await this.updateCheckpointStatus(
        checkpointId,
        'completed',
        result,
        undefined,
        executionTime
      );

      return true;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Check if we should retry
      if (checkpoint.retryCount !== undefined && checkpoint.retryCount < (checkpoint.maxRetries || 3)) {
        await this.updateCheckpointStatus(
          checkpointId,
          'pending',
          undefined,
          errorMessage,
          executionTime
        );

        // Schedule retry with exponential backoff
        await this.scheduleRetry(checkpointId, checkpoint.retryCount + 1);
      } else {
        await this.updateCheckpointStatus(
          checkpointId,
          'failed',
          undefined,
          errorMessage,
          executionTime
        );
      }

      return false;
    }
  }

  async resumeFromCheckpoint(sessionId: string, checkpointId: string): Promise<boolean> {
    const checkpoint = await this.getCheckpoint(checkpointId);
    if (!checkpoint) {
      throw new Error(`Checkpoint ${checkpointId} not found`);
    }

    // Get all checkpoints after this one and mark them as pending
    const allCheckpoints = await this.getSessionCheckpoints(sessionId);
    const checkpointIndex = allCheckpoints.findIndex(cp => cp.id === checkpointId);

    if (checkpointIndex === -1) {
      throw new Error(`Checkpoint ${checkpointId} not found in session`);
    }

    // Reset subsequent checkpoints
    const subsequentCheckpoints = allCheckpoints.slice(0, checkpointIndex);

    for (const cp of subsequentCheckpoints) {
      if (cp.state === 'completed' || cp.state === 'failed') {
        await this.updateCheckpointStatus(cp.id, 'pending');
      }
    }

    // Execute from the specified checkpoint
    return this.executeCheckpoint(checkpointId);
  }

  // =====================================================================================
  // SESSION INTEGRATION
  // =====================================================================================

  async enhanceSessionWithCheckpoints(sessionId: string): Promise<void> {
    const session = await this.getEnhancedSession(sessionId);
    if (!session) return;

    const checkpoints = await this.getSessionCheckpoints(sessionId);

    // Update session with checkpoint information
    session.processingCheckpoints = checkpoints;

    // Update session progress based on checkpoints
    await this.updateSessionProgressFromCheckpoints(session);

    // Save enhanced session
    await this.saveEnhancedSession(session);
  }

  async processActionQueue(sessionId: string): Promise<void> {
    const session = await this.getEnhancedSession(sessionId);
    if (!session) return;

    const queuedActions = session.actionQueue || [];
    const pendingActions = queuedActions.filter((action: QueuedAction) =>
      (action.attempts ?? 0) < (action.maxAttempts ?? 1) && action.requiresNetwork
    );

    for (const action of pendingActions) {
      try {
        await this.executeQueuedAction(action);

        // Remove successful action from queue
        session.actionQueue = session.actionQueue?.filter((a: QueuedAction) => a.id !== action.id) || [];
      } catch (error) {
        // Increment retry count
        action.attempts = (action.attempts ?? 0) + 1;
      }
    }

    // Save updated session
    await this.saveEnhancedSession(session);
  }

  // =====================================================================================
  // PRIVATE HELPER METHODS
  // =====================================================================================

  private async executeFunctionWithCheckpoint(
    functionName: string,
    parameters: Record<string, unknown>,
    sessionId: string
  ): Promise<unknown> {
    // This would dynamically call the appropriate Firebase Function
    // Implementation depends on your specific function architecture

    switch (functionName) {
      case 'generateCV':
        return this.executeGenerateCV(parameters, sessionId);

      case 'generatePodcast':
        return this.executeGeneratePodcast(parameters, sessionId);

      case 'generateVideo':
        return this.executeGenerateVideo(parameters, sessionId);

      default:
        throw new Error(`Unknown function: ${functionName}`);
    }
  }

  private async executeGenerateCV(
    parameters: Record<string, unknown>,
    sessionId: string
  ): Promise<unknown> {
    // Call your existing CV generation function
    // This is a placeholder - replace with actual implementation
    return { success: true, cvId: 'generated-cv-id' };
  }

  private async executeGeneratePodcast(
    parameters: Record<string, unknown>,
    sessionId: string
  ): Promise<unknown> {
    // Call your existing podcast generation function
    return { success: true, podcastId: 'generated-podcast-id' };
  }

  private async executeGenerateVideo(
    parameters: Record<string, unknown>,
    sessionId: string
  ): Promise<unknown> {
    // Call your existing video generation function
    return { success: true, videoId: 'generated-video-id' };
  }

  private async executeQueuedAction(action: QueuedAction): Promise<void> {
    switch (action.type) {
      case 'session_update':
        await this.handleSessionUpdateAction(action);
        break;

      case 'form_save':
        await this.handleFormSaveAction(action);
        break;

      case 'feature_toggle':
        await this.handleFeatureToggleAction(action);
        break;

      default:
    }
  }

  private async handleSessionUpdateAction(action: QueuedAction): Promise<void> {
    const { sessionId, updates } = action.payload || {};
    const session = await this.getEnhancedSession(sessionId);

    if (session) {
      Object.assign(session, updates);
      await this.saveEnhancedSession(session);
    }
  }

  private async handleFormSaveAction(action: QueuedAction): Promise<void> {
    const { sessionId, formId, formData } = action.payload || {};
    // Save form data to session
  }

  private async handleFeatureToggleAction(action: QueuedAction): Promise<void> {
    const { sessionId, featureId, enabled } = action.payload || {};
    const session = await this.getEnhancedSession(sessionId);

    if (session && session.featureStates && session.featureStates[featureId]) {
      session.featureStates[featureId].enabled = enabled;
      await this.saveEnhancedSession(session);
    }
  }

  private async saveCheckpoint(checkpoint: ProcessingCheckpoint): Promise<void> {
    await this.db.collection('checkpoints').doc(checkpoint.id).set(checkpoint);
  }

  private async addCheckpointToSession(
    sessionId: string,
    checkpoint: ProcessingCheckpoint
  ): Promise<void> {
    const sessionRef = this.db.collection('sessions').doc(sessionId);

    await sessionRef.update({
      processingCheckpoints: admin.firestore.FieldValue.arrayUnion(checkpoint)
    });
  }

  private async updateSessionCheckpoint(
    sessionId: string,
    updatedCheckpoint: ProcessingCheckpoint
  ): Promise<void> {
    const session = await this.getEnhancedSession(sessionId);
    if (!session) return;

    // Update the checkpoint in the session
    if (session.processingCheckpoints) {
      const checkpointIndex = session.processingCheckpoints.findIndex(
        (cp: ProcessingCheckpoint) => cp.id === updatedCheckpoint.id
      );

      if (checkpointIndex !== -1) {
        session.processingCheckpoints[checkpointIndex] = updatedCheckpoint;
        await this.saveEnhancedSession(session);
      }
    }
  }

  private async getEnhancedSession(sessionId: string): Promise<EnhancedSessionState | null> {
    const doc = await this.db.collection('sessions').doc(sessionId).get();
    return doc.exists ? (doc.data() as EnhancedSessionState) : null;
  }

  private async saveEnhancedSession(session: EnhancedSessionState): Promise<void> {
    await this.db.collection('sessions').doc(session.sessionId).set(session, { merge: true });
  }

  private async updateSessionProgressFromCheckpoints(session: EnhancedSessionState): Promise<void> {
    // Update step progress based on checkpoint states
    if (session.processingCheckpoints && session.stepProgress) {
      for (const checkpoint of session.processingCheckpoints) {
        const stepKey = checkpoint.stepId ?? checkpoint.step;

        // Update progress percentage based on checkpoint completion
        if (stepKey && Object.values(CVStep).includes(stepKey as CVStep)) {
          const cvStep = stepKey as CVStep;
          switch (checkpoint.state) {
            case 'completed':
              session.stepProgress[cvStep] = 100;
              break;
            case 'failed':
              // Keep existing progress, don't reset to 0
              break;
            case 'processing':
              // Set to 50% if not already higher
              if ((session.stepProgress[cvStep] || 0) < 50) {
                session.stepProgress[cvStep] = 50;
              }
              break;
            case 'pending':
              // Set to 10% if not already started
              if (!session.stepProgress[cvStep]) {
                session.stepProgress[cvStep] = 10;
              }
              break;
          }
        }
      }
    }
  }

  private async scheduleRetry(checkpointId: string, retryAttempt: number): Promise<void> {
    const delayMs = Math.pow(2, retryAttempt) * 1000; // Exponential backoff

    // In a production environment, you'd use Cloud Tasks or similar for scheduling
    setTimeout(async () => {
      await this.executeCheckpoint(checkpointId);
    }, delayMs);
  }

  private generateCheckpointId(sessionId: string, stepId: CVStep, functionName: string): string {
    return `checkpoint_${sessionId}_${stepId}_${functionName}_${Date.now()}`;
  }

  private determinePriority(stepId: CVStep, featureId?: string): ProcessingCheckpoint['priority'] {
    // Core steps get higher priority
    const coreSteps: CVStep[] = [CVStep.INIT, CVStep.PARSE_CV, CVStep.ANALYZE_CONTENT];

    if (coreSteps.includes(stepId)) {
      return 'high';
    }

    // Optional features get lower priority
    if (featureId) {
      return 'low';
    }

    return 'normal';
  }

  private getDependencies(stepId: CVStep, featureId?: string): string[] {
    const dependencies: Record<CVStep, string[]> = {
      [CVStep.INIT]: [],
      [CVStep.PARSE_CV]: [CVStep.INIT],
      [CVStep.ANALYZE_CONTENT]: [CVStep.PARSE_CV],
      [CVStep.GENERATE_INSIGHTS]: [CVStep.ANALYZE_CONTENT],
      [CVStep.CREATE_PORTAL]: [CVStep.ANALYZE_CONTENT],
      [CVStep.GENERATE_MEDIA]: [CVStep.ANALYZE_CONTENT],
      [CVStep.FINALIZE]: [CVStep.CREATE_PORTAL],
      [CVStep.COMPLETE]: [CVStep.FINALIZE]
    };

    return dependencies[stepId] || [];
  }

  private getEstimatedDuration(functionName: string): number {
    // Estimated duration in seconds
    const durations: Record<string, number> = {
      generateCV: 30,
      generatePodcast: 120,
      generateVideo: 180,
      skillsVisualization: 15,
      portfolioGallery: 45
    };

    return durations[functionName] || 30;
  }

  private getResourceRequirements(functionName: string): Record<string, unknown> {
    // Resource requirements for different functions
    const requirements: Record<string, Record<string, unknown>> = {
      generateCV: { memory: '1GB', timeout: 120 },
      generatePodcast: { memory: '2GB', timeout: 300 },
      generateVideo: { memory: '2GB', timeout: 540 },
      skillsVisualization: { memory: '512MB', timeout: 60 }
    };

    return requirements[functionName] || { memory: '512MB', timeout: 60 };
  }
}

export default SessionCheckpointService;