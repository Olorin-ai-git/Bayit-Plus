/**
 * Integration Manager for Autonomous Investigation Microservice
 * Coordinates all integration services and provides unified lifecycle management
 */

import { autonomousInvestigationEventBus } from './eventBusIntegration';
import { autonomousInvestigationAuth } from './authIntegration';
import { autonomousInvestigationMonitoring } from './monitoringIntegration';
import { environmentConfig } from '../config/environment';
import type { InvestigationConcept } from '../types/ui.types';
import type { Investigation } from '../types/investigation.types';

// Integration status interface
interface IntegrationStatus {
  eventBus: 'initialized' | 'connected' | 'error' | 'disconnected';
  auth: 'authenticated' | 'unauthenticated' | 'expired' | 'error';
  monitoring: 'enabled' | 'disabled' | 'error';
  overall: 'healthy' | 'degraded' | 'critical' | 'offline';
}

// Integration configuration
interface IntegrationConfig {
  userId?: string;
  investigationId?: string;
  enableMonitoring?: boolean;
  enableEventBus?: boolean;
  monitoringConfig?: {
    endpoint?: string;
    apiKey?: string;
  };
}

/**
 * Integration Manager Class
 * Manages the lifecycle and coordination of all integration services
 */
export class IntegrationManager {
  private isInitialized: boolean = false;
  private status: IntegrationStatus = {
    eventBus: 'disconnected',
    auth: 'unauthenticated',
    monitoring: 'disabled',
    overall: 'offline',
  };
  private config: IntegrationConfig = {};
  private statusListeners: ((status: IntegrationStatus) => void)[] = [];

  constructor() {
    this.setupAuthenticationWatcher();
  }

  /**
   * Initialize all integration services
   */
  public async initialize(config: IntegrationConfig): Promise<void> {
    try {
      console.log('[IntegrationManager] Initializing integration services...');

      this.config = { ...config };

      // Initialize Event Bus
      if (config.enableEventBus !== false) {
        await this.initializeEventBus(config.userId, config.investigationId);
      }

      // Initialize Monitoring
      if (config.enableMonitoring !== false && environmentConfig.get('MONITORING_ENABLED')) {
        await this.initializeMonitoring(config.monitoringConfig);
      }

      // Initialize Authentication if user provided
      if (config.userId) {
        this.initializeAuthentication();
      }

      this.isInitialized = true;
      this.updateOverallStatus();

      console.log('[IntegrationManager] All integration services initialized successfully');
    } catch (error) {
      console.error('[IntegrationManager] Failed to initialize integration services:', error);
      this.updateStatus('overall', 'critical');
      throw error;
    }
  }

  /**
   * Initialize Event Bus integration
   */
  private async initializeEventBus(userId?: string, investigationId?: string): Promise<void> {
    try {
      if (userId) {
        autonomousInvestigationEventBus.initialize(userId, investigationId);
        this.updateStatus('eventBus', 'connected');
      } else {
        this.updateStatus('eventBus', 'initialized');
      }
    } catch (error) {
      console.error('[IntegrationManager] Event Bus initialization failed:', error);
      this.updateStatus('eventBus', 'error');
      throw error;
    }
  }

  /**
   * Initialize Monitoring integration
   */
  private async initializeMonitoring(monitoringConfig?: IntegrationConfig['monitoringConfig']): Promise<void> {
    try {
      const config = {
        endpoint: monitoringConfig?.endpoint || environmentConfig.get('MONITORING_ENDPOINT'),
        apiKey: monitoringConfig?.apiKey || environmentConfig.get('MONITORING_API_KEY'),
        enableDetailedTracking: environmentConfig.get('PERFORMANCE_TRACKING_ENABLED'),
      };

      // Monitoring is automatically initialized in the constructor
      autonomousInvestigationMonitoring.setEnabled(true);
      this.updateStatus('monitoring', 'enabled');

      console.log('[IntegrationManager] Monitoring integration initialized');
    } catch (error) {
      console.error('[IntegrationManager] Monitoring initialization failed:', error);
      this.updateStatus('monitoring', 'error');
      throw error;
    }
  }

  /**
   * Initialize Authentication integration
   */
  private initializeAuthentication(): void {
    try {
      const authContext = autonomousInvestigationAuth.getAuthContext();
      if (authContext && autonomousInvestigationAuth.isAuthenticated()) {
        this.updateStatus('auth', 'authenticated');
      } else {
        this.updateStatus('auth', 'unauthenticated');
      }
    } catch (error) {
      console.error('[IntegrationManager] Authentication initialization failed:', error);
      this.updateStatus('auth', 'error');
    }
  }

  /**
   * Setup authentication state watcher
   */
  private setupAuthenticationWatcher(): void {
    autonomousInvestigationAuth.onAuthenticationChange((authContext) => {
      if (authContext) {
        this.updateStatus('auth', 'authenticated');

        // Update event bus with new user context
        if (this.status.eventBus !== 'error') {
          autonomousInvestigationEventBus.initialize(authContext.user_id, this.config.investigationId);
        }
      } else {
        this.updateStatus('auth', 'unauthenticated');
      }

      this.updateOverallStatus();
    });
  }

  /**
   * Set current investigation context
   */
  public setInvestigationContext(investigationId: string): void {
    this.config.investigationId = investigationId;

    if (this.status.eventBus !== 'error') {
      autonomousInvestigationEventBus.setCurrentInvestigation(investigationId);
    }

    console.log('[IntegrationManager] Investigation context updated:', investigationId);
  }

  /**
   * Track investigation concept usage
   */
  public trackConceptUsage(
    concept: InvestigationConcept,
    previousConcept?: InvestigationConcept,
    interactionMetrics?: {
      viewDurationMs?: number;
      interactionCount?: number;
      nodesSelected?: number;
      filtersApplied?: number;
      exportsInitiated?: number;
    }
  ): void {
    // Event Bus tracking
    if (this.status.eventBus === 'connected') {
      autonomousInvestigationEventBus.emitInvestigationConceptSwitched(
        concept,
        previousConcept,
        interactionMetrics?.viewDurationMs,
        interactionMetrics?.interactionCount
      );
    }

    // Monitoring tracking
    if (this.status.monitoring === 'enabled') {
      autonomousInvestigationMonitoring.trackConceptUsage(
        concept,
        previousConcept,
        {
          nodes_selected: interactionMetrics?.nodesSelected,
          filters_applied: interactionMetrics?.filtersApplied,
          exports_initiated: interactionMetrics?.exportsInitiated,
        }
      );
    }
  }

  /**
   * Track graph interaction
   */
  public trackGraphInteraction(
    nodeId: string,
    nodeType: string,
    interactionType: 'click' | 'hover' | 'select' | 'filter',
    responseTimeMs: number,
    relatedNodes: string[] = []
  ): void {
    const investigationId = this.config.investigationId;
    if (!investigationId) return;

    // Event Bus tracking
    if (this.status.eventBus === 'connected') {
      // Note: This would need the GraphNode object - simplified for now
      // autonomousInvestigationEventBus.emitGraphNodeSelected(node, 'click', relatedNodes);
    }

    // Monitoring tracking
    if (this.status.monitoring === 'enabled') {
      autonomousInvestigationMonitoring.trackGraphInteraction(
        investigationId,
        interactionType as any,
        responseTimeMs,
        nodeType
      );
    }
  }

  /**
   * Track investigation action
   */
  public trackInvestigationAction(
    action: 'created' | 'started' | 'paused' | 'resumed' | 'stopped' | 'completed' | 'escalated',
    investigationId: string,
    durationMs?: number,
    error?: string
  ): void {
    // Monitoring tracking
    if (this.status.monitoring === 'enabled') {
      autonomousInvestigationMonitoring.trackInvestigationAnalytic(
        investigationId,
        action,
        {
          duration_ms: durationMs,
          error_occurred: !!error,
          error_type: error ? 'investigation_action_error' : undefined,
        }
      );
    }

    // Event Bus tracking for data updates
    if (this.status.eventBus === 'connected') {
      autonomousInvestigationEventBus.emitInvestigationDataUpdated(
        'status',
        { action, investigationId, error }
      );
    }
  }

  /**
   * Track agent execution
   */
  public trackAgentExecution(
    agentName: string,
    agentType: string,
    executionTimeMs: number,
    success: boolean,
    errorMessage?: string
  ): void {
    const investigationId = this.config.investigationId;
    if (!investigationId) return;

    // Monitoring tracking
    if (this.status.monitoring === 'enabled') {
      autonomousInvestigationMonitoring.trackAgentExecution(
        investigationId,
        agentName,
        agentType,
        executionTimeMs,
        success,
        errorMessage
      );
    }

    // Event Bus tracking for agent progress
    if (this.status.eventBus === 'connected') {
      autonomousInvestigationEventBus.emitAgentProgressUpdated(
        agentName,
        agentType,
        success ? 'complete' : 'error',
        success ? 100 : 0,
        undefined,
        undefined
      );
    }
  }

  /**
   * Get current integration status
   */
  public getStatus(): IntegrationStatus {
    return { ...this.status };
  }

  /**
   * Check if integrations are healthy
   */
  public isHealthy(): boolean {
    return this.status.overall === 'healthy';
  }

  /**
   * Subscribe to status changes
   */
  public onStatusChange(listener: (status: IntegrationStatus) => void): () => void {
    this.statusListeners.push(listener);

    // Return unsubscribe function
    return () => {
      const index = this.statusListeners.indexOf(listener);
      if (index > -1) {
        this.statusListeners.splice(index, 1);
      }
    };
  }

  /**
   * Get authentication headers for API requests
   */
  public getAuthHeaders(): Record<string, string> | null {
    if (this.status.auth !== 'authenticated') {
      return null;
    }

    try {
      return autonomousInvestigationAuth.getAuthHeaders();
    } catch (error) {
      console.error('[IntegrationManager] Failed to get auth headers:', error);
      return null;
    }
  }

  /**
   * Check if user has permission
   */
  public hasPermission(permission: string): boolean {
    if (this.status.auth !== 'authenticated') {
      return false;
    }

    try {
      return autonomousInvestigationAuth.hasPermission(permission as any);
    } catch (error) {
      console.error('[IntegrationManager] Failed to check permission:', error);
      return false;
    }
  }

  /**
   * Refresh authentication token
   */
  public async refreshAuthToken(): Promise<boolean> {
    try {
      const refreshed = await autonomousInvestigationAuth.validateAndRefreshToken();

      if (refreshed) {
        this.updateStatus('auth', 'authenticated');
      } else {
        this.updateStatus('auth', 'expired');
      }

      return refreshed;
    } catch (error) {
      console.error('[IntegrationManager] Token refresh failed:', error);
      this.updateStatus('auth', 'error');
      return false;
    }
  }

  /**
   * Get analytics summary
   */
  public getAnalyticsSummary(): any {
    if (this.status.monitoring !== 'enabled') {
      return null;
    }

    return autonomousInvestigationMonitoring.getAnalyticsSummary();
  }

  /**
   * Update specific service status
   */
  private updateStatus<K extends keyof IntegrationStatus>(
    service: K,
    status: IntegrationStatus[K]
  ): void {
    if (this.status[service] !== status) {
      this.status[service] = status;
      this.updateOverallStatus();
      this.notifyStatusListeners();
    }
  }

  /**
   * Update overall system status
   */
  private updateOverallStatus(): void {
    let overall: IntegrationStatus['overall'] = 'healthy';

    // Check for critical failures
    if (this.status.auth === 'error' || this.status.eventBus === 'error' || this.status.monitoring === 'error') {
      overall = 'critical';
    }
    // Check for degraded state
    else if (
      this.status.auth === 'expired' ||
      this.status.eventBus === 'disconnected' ||
      this.status.monitoring === 'disabled'
    ) {
      overall = 'degraded';
    }
    // Check if offline
    else if (!this.isInitialized) {
      overall = 'offline';
    }

    this.status.overall = overall;
  }

  /**
   * Notify status change listeners
   */
  private notifyStatusListeners(): void {
    this.statusListeners.forEach(listener => {
      try {
        listener(this.status);
      } catch (error) {
        console.error('[IntegrationManager] Error in status listener:', error);
      }
    });
  }

  /**
   * Cleanup all integration services
   */
  public destroy(): void {
    console.log('[IntegrationManager] Destroying integration services...');

    try {
      autonomousInvestigationEventBus.cleanup();
      autonomousInvestigationMonitoring.destroy();
      autonomousInvestigationAuth.destroy();

      this.isInitialized = false;
      this.status = {
        eventBus: 'disconnected',
        auth: 'unauthenticated',
        monitoring: 'disabled',
        overall: 'offline',
      };

      this.statusListeners = [];

      console.log('[IntegrationManager] All integration services destroyed');
    } catch (error) {
      console.error('[IntegrationManager] Error during cleanup:', error);
    }
  }
}

// Singleton instance
export const integrationManager = new IntegrationManager();