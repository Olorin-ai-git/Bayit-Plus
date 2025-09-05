import { LogLevel } from '../types/RiskAssessment';
import { 
  MultiEntityInvestigationRequest,
  MultiEntityInvestigationResult,
  MultiEntityInvestigationStatusUpdate,
  MultiEntityInvestigationEvent,
  EntityDefinition,
  EntityRelationship
} from '../types/multiEntityInvestigation';
import { isDemoModeActive } from '../hooks/useDemoMode';

export interface MultiEntityInvestigationOptions {
  apiBaseUrl?: string;
  wsBaseUrl?: string;
  retryAttempts?: number;
  retryDelay?: number;
}

export interface MultiEntityEventHandler {
  onEntityStarted?: (entityId: string) => void;
  onEntityCompleted?: (entityId: string, result: any) => void;
  onEntityFailed?: (entityId: string, error: string) => void;
  onCrossAnalysisStarted?: () => void;
  onInvestigationCompleted?: (result: MultiEntityInvestigationResult) => void;
  onStatusUpdate?: (update: MultiEntityInvestigationStatusUpdate) => void;
  onError?: (error: string) => void;
  onLog?: (message: string, level: LogLevel) => void;
}

export class MultiEntityInvestigationClient {
  private apiBaseUrl: string;
  private wsBaseUrl: string;
  private retryAttempts: number;
  private retryDelay: number;
  private ws: WebSocket | null = null;
  private investigationId: string | null = null;
  private eventHandlers: MultiEntityEventHandler = {};
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;

  constructor(options: MultiEntityInvestigationOptions = {}) {
    this.apiBaseUrl = options.apiBaseUrl || '/api';
    this.wsBaseUrl = options.wsBaseUrl || 'ws://localhost:8090';
    this.retryAttempts = options.retryAttempts || 3;
    this.retryDelay = options.retryDelay || 1000;
  }

  /**
   * Start multi-entity investigation
   */
  async startInvestigation(
    request: MultiEntityInvestigationRequest,
    eventHandlers: MultiEntityEventHandler = {}
  ): Promise<string> {
    this.eventHandlers = eventHandlers;
    this.reconnectAttempts = 0;

    try {
      this.log(
        `Starting multi-entity investigation with ${request.entities.length} entities`,
        LogLevel.INFO
      );

      // Step 1: Start the investigation via REST API
      this.investigationId = await this.initiateInvestigation(request);

      if (!this.investigationId) {
        throw new Error('Failed to extract investigation ID from response');
      }

      this.log(`Multi-entity investigation ID: ${this.investigationId}`, LogLevel.INFO);

      // Step 2: Connect to WebSocket for real-time updates
      await this.connectToWebSocket();

      return this.investigationId;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
      this.log(`Failed to start multi-entity investigation: ${errorMsg}`, LogLevel.ERROR);
      throw error;
    }
  }

  /**
   * Create quick multi-entity investigation from entity list
   */
  async startQuickInvestigation(
    entities: EntityDefinition[],
    booleanLogic: string = 'AND',
    eventHandlers: MultiEntityEventHandler = {}
  ): Promise<string> {
    const request: MultiEntityInvestigationRequest = {
      investigation_id: `multi-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      entities,
      relationships: [],
      boolean_logic: booleanLogic,
      investigation_scope: ['device', 'location', 'network', 'logs'],
      priority: 'normal'
    };

    return this.startInvestigation(request, eventHandlers);
  }

  /**
   * Initiate investigation via REST API
   */
  private async initiateInvestigation(
    request: MultiEntityInvestigationRequest
  ): Promise<string> {
    // In demo mode, return a mock investigation ID
    if (isDemoModeActive()) {
      this.log('Demo mode active - returning mock multi-entity investigation ID', LogLevel.INFO);
      this.simulateDemoInvestigation(request);
      return `demo-multi-investigation-${Date.now()}`;
    }

    const response = await fetch(
      `${this.apiBaseUrl}/v1/autonomous-investigation/multi-entity`,
      {
        method: 'POST',
        headers: {
          Authorization: 'Bearer your-jwt-token',
          'Content-Type': 'application/json',
          olorin_tid: 'your-transaction-id',
        },
        body: JSON.stringify(request)
      }
    );

    if (!response.ok) {
      throw new Error(
        `Failed to start multi-entity investigation: ${response.status} ${response.statusText}`
      );
    }

    const result = await response.json();
    
    if (!result.investigation_id) {
      throw new Error('Investigation ID not found in response');
    }
    
    this.log(`Multi-entity investigation started: ${result.message}`, LogLevel.INFO);
    this.log(`Status: ${result.status}`, LogLevel.INFO);
    
    return result.investigation_id;
  }

  /**
   * Connect to WebSocket for real-time updates
   */
  private async connectToWebSocket(): Promise<void> {
    if (!this.investigationId) {
      throw new Error('No investigation ID available for WebSocket connection');
    }

    // In demo mode, skip actual WebSocket connection
    if (isDemoModeActive()) {
      this.log('Demo mode active - simulating WebSocket connection', LogLevel.INFO);
      return Promise.resolve();
    }

    const token = 'your-jwt-token';
    const wsUrl = `${this.wsBaseUrl}/ws/multi-entity/${this.investigationId}?token=${token}`;

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.log(`Connected to multi-entity WebSocket: ${wsUrl}`, LogLevel.SUCCESS);
        this.reconnectAttempts = 0;
        resolve();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleWebSocketMessage(data);
        } catch (error) {
          this.log(
            `Invalid JSON received from WebSocket: ${event.data}`,
            LogLevel.ERROR
          );
        }
      };

      this.ws.onerror = (error) => {
        this.log('Multi-entity WebSocket connection failed', LogLevel.ERROR);
        reject(error);
      };

      this.ws.onclose = (event) => {
        if (event.code !== 1000) {
          this.log(
            'Multi-entity WebSocket closed unexpectedly, attempting reconnection...',
            LogLevel.WARNING
          );
          this.attemptReconnection();
        } else {
          this.log('Multi-entity WebSocket connection closed normally', LogLevel.INFO);
        }
      };

      setTimeout(() => {
        if (this.ws?.readyState !== WebSocket.OPEN) {
          this.ws?.close();
          reject(new Error('Multi-entity WebSocket connection timeout'));
        }
      }, 10000);
    });
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleWebSocketMessage(data: MultiEntityInvestigationEvent): void {
    const { type, investigation_id, entity_id } = data;

    this.log(`Multi-entity event: ${type} for investigation ${investigation_id}`, LogLevel.INFO);

    switch (type) {
      case 'entity_started':
        if (entity_id) {
          this.log(`Entity ${entity_id} investigation started`, LogLevel.INFO);
          this.eventHandlers.onEntityStarted?.(entity_id);
        }
        break;
      case 'entity_completed':
        if (entity_id) {
          this.log(`Entity ${entity_id} investigation completed`, LogLevel.SUCCESS);
          this.eventHandlers.onEntityCompleted?.(entity_id, data.data);
        }
        break;
      case 'entity_failed':
        if (entity_id) {
          this.log(`Entity ${entity_id} investigation failed`, LogLevel.ERROR);
          this.eventHandlers.onEntityFailed?.(entity_id, data.data.error || 'Unknown error');
        }
        break;
      case 'cross_analysis_started':
        this.log('Cross-entity analysis started', LogLevel.INFO);
        this.eventHandlers.onCrossAnalysisStarted?.();
        break;
      case 'investigation_completed':
        this.log('Multi-entity investigation completed', LogLevel.SUCCESS);
        this.eventHandlers.onInvestigationCompleted?.(data.data as MultiEntityInvestigationResult);
        break;
      case 'status_update':
        this.eventHandlers.onStatusUpdate?.(data.data as MultiEntityInvestigationStatusUpdate);
        break;
      default:
        this.log(`Unknown multi-entity event type: ${type}`, LogLevel.WARNING);
        break;
    }
  }

  /**
   * Attempt to reconnect WebSocket
   */
  private async attemptReconnection(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.log('Maximum reconnection attempts reached', LogLevel.ERROR);
      return;
    }

    this.reconnectAttempts++;
    const delay = this.retryDelay * this.reconnectAttempts;

    this.log(
      `Reconnection attempt ${this.reconnectAttempts} in ${delay}ms...`,
      LogLevel.WARNING
    );

    setTimeout(async () => {
      try {
        await this.connectToWebSocket();
        this.log('Reconnected successfully', LogLevel.SUCCESS);
      } catch (error) {
        this.log(
          `Reconnection attempt ${this.reconnectAttempts} failed`,
          LogLevel.ERROR
        );
        this.attemptReconnection();
      }
    }, delay);
  }

  /**
   * Get investigation status
   */
  async getInvestigationStatus(): Promise<MultiEntityInvestigationStatusUpdate> {
    if (!this.investigationId) {
      throw new Error('No active investigation');
    }

    if (isDemoModeActive()) {
      return {
        investigation_id: this.investigationId,
        status: 'completed',
        entities_completed: ['demo-entity-1', 'demo-entity-2'],
        entities_remaining: [],
        progress_percentage: 100,
        message: 'Demo multi-entity investigation completed',
        timestamp: new Date().toISOString()
      };
    }

    const response = await fetch(
      `${this.apiBaseUrl}/v1/autonomous-investigation/multi-entity/${this.investigationId}/status`
    );

    if (!response.ok) {
      throw new Error(`Failed to get investigation status: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get investigation results
   */
  async getInvestigationResults(): Promise<MultiEntityInvestigationResult> {
    if (!this.investigationId) {
      throw new Error('No active investigation');
    }

    if (isDemoModeActive()) {
      return this.generateDemoResults();
    }

    const response = await fetch(
      `${this.apiBaseUrl}/v1/autonomous-investigation/multi-entity/${this.investigationId}/results`
    );

    if (!response.ok) {
      throw new Error(`Failed to get investigation results: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Update entity relationships
   */
  async updateRelationships(relationships: EntityRelationship[]): Promise<void> {
    if (!this.investigationId) {
      throw new Error('No active investigation');
    }

    if (isDemoModeActive()) {
      this.log('Demo mode - relationships update simulated', LogLevel.INFO);
      return;
    }

    const response = await fetch(
      `${this.apiBaseUrl}/v1/autonomous-investigation/multi-entity/${this.investigationId}/relationships`,
      {
        method: 'PUT',
        headers: {
          Authorization: 'Bearer your-jwt-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ relationships })
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to update relationships: ${response.status}`);
    }
  }

  /**
   * Stop the investigation
   */
  stopInvestigation(): void {
    if (this.ws) {
      this.ws.close(1000, 'Multi-entity investigation stopped by user');
      this.ws = null;
    }
    this.investigationId = null;
  }

  /**
   * Check if investigation is active
   */
  isActive(): boolean {
    return (
      this.ws?.readyState === WebSocket.OPEN && this.investigationId !== null
    );
  }

  /**
   * Get current investigation ID
   */
  getInvestigationId(): string | null {
    return this.investigationId;
  }

  /**
   * Log message with level
   */
  private log(message: string, level: LogLevel = LogLevel.INFO): void {
    console.log(`[MultiEntityClient] ${message}`);
    this.eventHandlers.onLog?.(message, level);
  }

  /**
   * Simulate demo investigation
   */
  private simulateDemoInvestigation(request: MultiEntityInvestigationRequest): void {
    // Simulate entity investigations
    let entityIndex = 0;
    const simulateEntity = () => {
      if (entityIndex < request.entities.length) {
        const entity = request.entities[entityIndex];
        
        // Entity started
        setTimeout(() => {
          this.eventHandlers.onEntityStarted?.(entity.entity_id);
        }, 1000 + entityIndex * 2000);

        // Entity completed
        setTimeout(() => {
          this.eventHandlers.onEntityCompleted?.(entity.entity_id, {
            risk_score: 0.3 + Math.random() * 0.7,
            status: 'completed'
          });
          entityIndex++;
          simulateEntity();
        }, 3000 + entityIndex * 2000);
      } else {
        // All entities completed, start cross analysis
        setTimeout(() => {
          this.eventHandlers.onCrossAnalysisStarted?.();
        }, 1000);

        // Investigation completed
        setTimeout(() => {
          this.eventHandlers.onInvestigationCompleted?.(this.generateDemoResults());
        }, 3000);
      }
    };

    simulateEntity();
  }

  /**
   * Generate demo investigation results
   */
  private generateDemoResults(): MultiEntityInvestigationResult {
    return {
      investigation_id: this.investigationId || 'demo-multi-investigation',
      status: 'completed',
      entities: [
        { entity_id: 'demo-user-123', entity_type: 'user' as any },
        { entity_id: 'demo-device-456', entity_type: 'device' as any }
      ],
      entity_results: {},
      cross_entity_analysis: {
        patterns_detected: [],
        relationship_insights: [],
        risk_correlations: [],
        timeline_reconstruction: [],
        anomaly_summary: 'Demo cross-entity analysis completed',
        confidence_score: 0.85
      },
      overall_risk_assessment: {
        overall_risk_score: 0.65,
        risk_distribution: { 'demo-user-123': 0.7, 'demo-device-456': 0.6 },
        high_risk_entities: ['demo-user-123'],
        risk_factors: ['Unusual device usage', 'Geographic anomalies'],
        confidence: 0.8,
        summary: 'Moderate risk detected across entities',
        recommendations: ['Monitor user activity', 'Verify device ownership']
      },
      investigation_timeline: [],
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      duration_ms: 15000
    };
  }
}