/**
 * CVPlus Level 2 Recovery System
 * Main entry point for the comprehensive recovery system for Level 2 submodules
 */

// Export core data models
export * from './models';

// Export recovery services
export * from './services';

// Export API system
export * from './api';

// Main Recovery System orchestrator
import { RecoveryOrchestrator } from './services';
import { RecoveryAPIServer, ServerOptions } from './api';
import { RecoverySession, createRecoverySession } from './models';

export interface RecoverySystemOptions {
  workspacePath: string;
  sessionType?: 'manual' | 'automated' | 'scheduled';
  startApiServer?: boolean;
  apiOptions?: ServerOptions;
}

export class CVPlusRecoverySystem {
  private workspacePath: string;
  private orchestrator: RecoveryOrchestrator;
  private recoverySession: RecoverySession;
  private apiServer?: RecoveryAPIServer;

  constructor(options: RecoverySystemOptions) {
    this.workspacePath = options.workspacePath;

    // Create recovery session
    this.recoverySession = createRecoverySession(
      options.workspacePath,
      options.sessionType || 'manual'
    );

    // Initialize orchestrator
    this.orchestrator = new RecoveryOrchestrator(
      options.workspacePath,
      this.recoverySession
    );

    // Optionally start API server
    if (options.startApiServer) {
      this.apiServer = new RecoveryAPIServer({
        workspacePath: options.workspacePath,
        ...options.apiOptions
      });
    }
  }

  /**
   * Initialize the recovery system
   */
  async initialize(): Promise<void> {
    console.log(`[${new Date().toISOString()}] Initializing CVPlus Recovery System...`);
    console.log(`[${new Date().toISOString()}] Workspace: ${this.workspacePath}`);
    console.log(`[${new Date().toISOString()}] Session ID: ${this.recoverySession.id}`);

    // Start API server if configured
    if (this.apiServer) {
      await this.apiServer.start();
      const serverInfo = this.apiServer.getServerInfo();
      console.log(`[${new Date().toISOString()}] API Server: ${serverInfo.apiUrl}`);
    }

    console.log(`[${new Date().toISOString()}] Recovery System initialized successfully`);
  }

  /**
   * Execute comprehensive workspace analysis
   */
  async analyzeWorkspace(options?: {
    includeHealthMetrics?: boolean;
    includeDependencyGraph?: boolean;
    includeErrorDetails?: boolean;
  }) {
    console.log(`[${new Date().toISOString()}] Starting workspace analysis...`);

    const result = await this.orchestrator.analyzeWorkspace({
      includeHealthMetrics: true,
      includeDependencyGraph: true,
      includeErrorDetails: true,
      analysisDepth: 'comprehensive',
      ...options
    });

    console.log(`[${new Date().toISOString()}] Analysis completed`);
    console.log(`[${new Date().toISOString()}] Overall health score: ${result.workspaceHealth.overallHealthScore}/100`);
    console.log(`[${new Date().toISOString()}] Modules analyzed: ${result.analysisMetadata.modulesAnalyzed}`);
    console.log(`[${new Date().toISOString()}] Issues found: ${result.analysisMetadata.issuesFound}`);

    return result;
  }

  /**
   * Execute module recovery
   */
  async recoverModule(moduleId: string, options?: {
    strategy?: 'repair' | 'rebuild' | 'reset' | 'replace' | 'skip';
    dryRun?: boolean;
    createBackup?: boolean;
  }) {
    console.log(`[${new Date().toISOString()}] Starting recovery for module: ${moduleId}`);

    const result = await this.orchestrator.recoverModule({
      moduleId,
      workspacePath: this.workspacePath,
      recoveryStrategy: options?.strategy || 'repair',
      dryRun: options?.dryRun || false,
      backupPath: options?.createBackup ? '/tmp/cvplus-recovery-backups' : undefined
    });

    console.log(`[${new Date().toISOString()}] Recovery completed for ${moduleId}`);
    console.log(`[${new Date().toISOString()}] Status: ${result.recoveryStatus}`);
    console.log(`[${new Date().toISOString()}] Health improvement: +${result.healthImprovement}`);
    console.log(`[${new Date().toISOString()}] Errors resolved: ${result.errorsResolved}`);

    return result;
  }

  /**
   * Execute recovery phase
   */
  async executePhase(phaseId: number, options?: {
    parallelExecution?: boolean;
    maxConcurrency?: number;
    dryRun?: boolean;
  }) {
    console.log(`[${new Date().toISOString()}] Executing recovery phase ${phaseId}...`);

    const result = await this.orchestrator.executePhase({
      phaseId,
      parallelExecution: options?.parallelExecution || false,
      maxConcurrency: options?.maxConcurrency || 4,
      dryRun: options?.dryRun || false
    });

    console.log(`[${new Date().toISOString()}] Phase ${phaseId} completed`);
    console.log(`[${new Date().toISOString()}] Status: ${result.status}`);
    console.log(`[${new Date().toISOString()}] Tasks executed: ${result.tasksExecuted} (${result.tasksSuccessful} successful)`);
    console.log(`[${new Date().toISOString()}] Health improvement: +${result.healthImprovement}`);

    return result;
  }

  /**
   * Get recovery progress
   */
  async getProgress() {
    const progress = await this.orchestrator.getProgress();

    console.log(`[${new Date().toISOString()}] Recovery Progress:`);
    console.log(`[${new Date().toISOString()}] Current phase: ${progress.currentPhase}`);
    console.log(`[${new Date().toISOString()}] Overall progress: ${progress.overallProgress}%`);
    console.log(`[${new Date().toISOString()}] Total health improvement: +${progress.totalHealthImprovement}`);
    console.log(`[${new Date().toISOString()}] Estimated completion: ${progress.estimatedCompletion}`);

    return progress;
  }

  /**
   * Get recovery session information
   */
  getSessionInfo() {
    return {
      sessionId: this.recoverySession.id,
      status: this.recoverySession.status,
      startTime: this.recoverySession.startTime,
      endTime: this.recoverySession.endTime,
      duration: this.recoverySession.duration,
      currentPhase: this.recoverySession.currentPhase,
      overallProgress: this.recoverySession.overallProgress,
      healthImprovement: this.recoverySession.healthImprovement,
      errorsResolved: this.recoverySession.errorsResolved,
      workspacePath: this.workspacePath
    };
  }

  /**
   * Get API server information (if running)
   */
  getApiInfo() {
    if (!this.apiServer) {
      return null;
    }

    return this.apiServer.getServerInfo();
  }

  /**
   * Stop the recovery system gracefully
   */
  async shutdown(): Promise<void> {
    console.log(`[${new Date().toISOString()}] Shutting down CVPlus Recovery System...`);

    if (this.apiServer) {
      await this.apiServer.stop();
      console.log(`[${new Date().toISOString()}] API Server stopped`);
    }

    // Update session status
    this.recoverySession.status = this.recoverySession.overallProgress === 100 ? 'completed' : 'cancelled';
    this.recoverySession.endTime = new Date().toISOString();

    if (this.recoverySession.endTime && this.recoverySession.startTime) {
      this.recoverySession.duration = (
        new Date(this.recoverySession.endTime).getTime() -
        new Date(this.recoverySession.startTime).getTime()
      ) / 1000;
    }

    console.log(`[${new Date().toISOString()}] Recovery System shutdown complete`);
  }
}

/**
 * Factory function to create and initialize the recovery system
 */
export const createRecoverySystem = async (options: RecoverySystemOptions): Promise<CVPlusRecoverySystem> => {
  const system = new CVPlusRecoverySystem(options);
  await system.initialize();
  return system;
};

/**
 * CLI entry point for the recovery system
 */
export const runRecoverySystem = async (args: {
  workspacePath: string;
  command: 'analyze' | 'recover' | 'phase' | 'server' | 'progress';
  moduleId?: string;
  phaseId?: number;
  options?: Record<string, any>;
}): Promise<void> => {
  const system = new CVPlusRecoverySystem({
    workspacePath: args.workspacePath,
    startApiServer: args.command === 'server',
    apiOptions: args.command === 'server' ? args.options : undefined
  });

  try {
    await system.initialize();

    switch (args.command) {
      case 'analyze':
        await system.analyzeWorkspace(args.options);
        break;

      case 'recover':
        if (!args.moduleId) {
          throw new Error('Module ID is required for recover command');
        }
        await system.recoverModule(args.moduleId, args.options);
        break;

      case 'phase':
        if (!args.phaseId) {
          throw new Error('Phase ID is required for phase command');
        }
        await system.executePhase(args.phaseId, args.options);
        break;

      case 'server':
        console.log(`[${new Date().toISOString()}] API Server is running. Press Ctrl+C to stop.`);
        // Keep the process alive for server mode
        process.on('SIGINT', async () => {
          await system.shutdown();
          process.exit(0);
        });
        break;

      case 'progress':
        await system.getProgress();
        break;

      default:
        throw new Error(`Unknown command: ${args.command}`);
    }

    // Don't shutdown for server mode
    if (args.command !== 'server') {
      await system.shutdown();
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Recovery System error:`, error);
    await system.shutdown();
    process.exit(1);
  }
};

// Export the main class as default
export default CVPlusRecoverySystem;