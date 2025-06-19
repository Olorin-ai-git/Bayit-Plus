import { LogLevel } from '../types/RiskAssessment';

export interface AutonomousInvestigationOptions {
  apiBaseUrl?: string;
  wsBaseUrl?: string;
  parallel?: boolean;
  retryAttempts?: number;
  retryDelay?: number;
}

export interface InvestigationPhaseData {
  phase: string;
  progress: number;
  message: string;
  agent_response?: any;
  timestamp: string;
}

export interface InvestigationStatusData {
  type: string;
  investigation_id: string;
  status: string;
  current_phase?: string;
  progress?: number;
  message: string;
  timestamp: string;
}

export interface InvestigationErrorData {
  type: string;
  investigation_id: string;
  error_code: string;
  message: string;
  phase?: string;
  timestamp: string;
  retry_available?: boolean;
}

export type InvestigationEventHandler = {
  onPhaseUpdate?: (data: InvestigationPhaseData) => void;
  onStatusUpdate?: (data: InvestigationStatusData) => void;
  onError?: (data: InvestigationErrorData) => void;
  onComplete?: (results: Record<string, any>) => void;
  onCancelled?: () => void;
  onLog?: (message: string, level: LogLevel) => void;
};

export class AutonomousInvestigationClient {
  private apiBaseUrl: string;
  private wsBaseUrl: string;
  private parallel: boolean;
  private retryAttempts: number;
  private retryDelay: number;
  private ws: WebSocket | null = null;
  private investigationId: string | null = null;
  private results: Record<string, any> = {};
  private eventHandlers: InvestigationEventHandler = {};
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;

  constructor(options: AutonomousInvestigationOptions = {}) {
    this.apiBaseUrl = options.apiBaseUrl || '/api';
    this.wsBaseUrl = options.wsBaseUrl || 'ws://localhost:8000';
    this.parallel = options.parallel ?? true;
    this.retryAttempts = options.retryAttempts || 3;
    this.retryDelay = options.retryDelay || 1000;
  }

  /**
   * Start autonomous investigation for an entity
   */
  async startInvestigation(
    entityId: string,
    entityType: 'user_id' | 'device_id' = 'user_id',
    eventHandlers: InvestigationEventHandler = {},
  ): Promise<string> {
    this.eventHandlers = eventHandlers;
    this.results = {};
    this.reconnectAttempts = 0;

    try {
      this.log(
        `Starting ${
          this.parallel ? 'parallel' : 'sequential'
        } investigation for ${entityType}: ${entityId}`,
        LogLevel.INFO,
      );

      // Step 1: Start the investigation via REST API
      this.investigationId = await this.initiateInvestigation(
        entityId,
        entityType,
      );

      if (!this.investigationId) {
        throw new Error('Failed to extract investigation ID from response');
      }

      this.log(`Investigation ID: ${this.investigationId}`, LogLevel.INFO);

      // Step 2: Connect to WebSocket for real-time updates
      await this.connectToWebSocket();

      return this.investigationId;
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : 'Unknown error occurred';
      this.log(`Failed to start investigation: ${errorMsg}`, LogLevel.ERROR);
      throw error;
    }
  }

  /**
   * Initiate investigation via REST API
   */
  private async initiateInvestigation(
    entityId: string,
    entityType: string,
  ): Promise<string> {
    const response = await fetch(
      `${this.apiBaseUrl}/agent/start/${entityId}?entity_type=${entityType}`,
      {
        method: 'POST',
        headers: {
          Authorization: 'Bearer your-jwt-token',
          'Content-Type': 'application/json',
          intuit_tid: 'your-transaction-id',
        },
      },
    );

    if (!response.ok) {
      throw new Error(
        `Failed to start investigation: ${response.status} ${response.statusText}`,
      );
    }

    const result = await response.json();
    return this.extractInvestigationId(result.agentOutput.plainText);
  }

  /**
   * Extract investigation ID from agent response text
   */
  private extractInvestigationId(plainText: string): string {
    const match = plainText.match(/investigation[_\s]+([a-f0-9-]{36})/i);
    if (!match) {
      throw new Error('Could not extract investigation ID from response');
    }
    return match[1];
  }

  /**
   * Connect to WebSocket for real-time updates
   */
  private async connectToWebSocket(): Promise<void> {
    if (!this.investigationId) {
      throw new Error('No investigation ID available for WebSocket connection');
    }

    const wsUrl = `${this.wsBaseUrl}/ws/${this.investigationId}?parallel=${this.parallel}`;

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.log(`Connected to WebSocket: ${wsUrl}`, LogLevel.SUCCESS);
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
            LogLevel.ERROR,
          );
        }
      };

      this.ws.onerror = (error) => {
        this.log('WebSocket connection failed', LogLevel.ERROR);
        reject(error);
      };

      this.ws.onclose = (event) => {
        if (event.code !== 1000) {
          // Not a normal closure
          this.log(
            'WebSocket closed unexpectedly, attempting reconnection...',
            LogLevel.WARNING,
          );
          this.attemptReconnection();
        } else {
          this.log('WebSocket connection closed normally', LogLevel.INFO);
        }
      };

      // Set timeout for connection
      setTimeout(() => {
        if (this.ws?.readyState !== WebSocket.OPEN) {
          this.ws?.close();
          reject(new Error('WebSocket connection timeout'));
        }
      }, 10000);
    });
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleWebSocketMessage(data: any): void {
    const messageType = data.type;

    switch (messageType) {
      case 'error':
        this.handleErrorMessage(data as InvestigationErrorData);
        break;
      case 'status_update':
        this.handleStatusUpdate(data as InvestigationStatusData);
        break;
      case 'cancellation':
        this.handleCancellation(data);
        break;
      case 'heartbeat':
        // Log heartbeat messages at debug level
        break;
      default:
        // Handle phase progress messages
        this.handlePhaseProgress(data as InvestigationPhaseData);
        break;
    }
  }

  /**
   * Handle phase progress updates
   */
  private handlePhaseProgress(data: InvestigationPhaseData): void {
    const { phase, progress, message, agent_response } = data;

    this.log(
      `[${phase.toUpperCase()}] ${(progress * 100).toFixed(1)}% - ${message}`,
      LogLevel.INFO,
    );

    // Store complete API response data
    if (agent_response) {
      this.results[phase] = agent_response;
    }

    // Notify handlers
    this.eventHandlers.onPhaseUpdate?.(data);

    // Handle completion
    if (phase === 'completed') {
      this.handleInvestigationComplete();
    }
  }

  /**
   * Handle status update messages
   */
  private handleStatusUpdate(data: InvestigationStatusData): void {
    const { status, current_phase, progress, message } = data;

    this.log(
      `Status update: ${status} - Phase: ${current_phase} (${(
        (progress || 0) * 100
      ).toFixed(1)}%)`,
      LogLevel.INFO,
    );

    this.eventHandlers.onStatusUpdate?.(data);
  }

  /**
   * Handle error messages
   */
  private handleErrorMessage(data: InvestigationErrorData): void {
    const { error_code, message, phase, retry_available } = data;

    this.log(
      `Error in ${phase}: ${message} (Code: ${error_code})`,
      LogLevel.ERROR,
    );

    if (retry_available) {
      this.log('Retry option available', LogLevel.WARNING);
    }

    this.eventHandlers.onError?.(data);
  }

  /**
   * Handle investigation cancellation
   */
  private handleCancellation(data: any): void {
    this.log('Investigation cancelled', LogLevel.WARNING);
    this.eventHandlers.onCancelled?.();
  }

  /**
   * Handle investigation completion
   */
  private handleInvestigationComplete(): void {
    this.log('Investigation completed successfully', LogLevel.SUCCESS);
    this.eventHandlers.onComplete?.(this.results);
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
      LogLevel.WARNING,
    );

    setTimeout(async () => {
      try {
        await this.connectToWebSocket();
        this.log('Reconnected successfully', LogLevel.SUCCESS);
      } catch (error) {
        this.log(
          `Reconnection attempt ${this.reconnectAttempts} failed`,
          LogLevel.ERROR,
        );
        this.attemptReconnection();
      }
    }, delay);
  }

  /**
   * Pause the investigation
   */
  pauseInvestigation(): void {
    this.sendControlMessage('pause');
  }

  /**
   * Resume the investigation
   */
  resumeInvestigation(): void {
    this.sendControlMessage('resume');
  }

  /**
   * Cancel the investigation
   */
  cancelInvestigation(): void {
    this.sendControlMessage('cancel');
  }

  /**
   * Stop the investigation and close WebSocket
   */
  stopInvestigation(): void {
    if (this.ws) {
      this.ws.close(1000, 'Investigation stopped by user');
      this.ws = null;
    }
    this.investigationId = null;
    this.results = {};
  }

  /**
   * Send control message to server
   */
  private sendControlMessage(action: string): void {
    if (
      !this.ws ||
      this.ws.readyState !== WebSocket.OPEN ||
      !this.investigationId
    ) {
      this.log(
        `Cannot send ${action} command: WebSocket not connected or no investigation ID`,
        LogLevel.ERROR,
      );
      return;
    }

    const message = {
      type: 'control',
      action,
      investigation_id: this.investigationId,
    };

    this.ws.send(JSON.stringify(message));
    this.log(`Sent ${action} command`, LogLevel.INFO);
  }

  /**
   * Get current investigation status via REST API
   */
  async getInvestigationStatus(): Promise<any> {
    if (!this.investigationId) {
      throw new Error('No active investigation');
    }

    const response = await fetch(
      `${this.apiBaseUrl}/agent/status/${this.investigationId}`,
    );

    if (!response.ok) {
      throw new Error(`Failed to get investigation status: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get investigation results
   */
  getResults(): Record<string, any> {
    return { ...this.results };
  }

  /**
   * Get current investigation ID
   */
  getInvestigationId(): string | null {
    return this.investigationId;
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
   * Log message with optional level
   */
  private log(message: string, level: LogLevel = LogLevel.INFO): void {
    console.log(`[AutonomousClient] ${message}`);
    this.eventHandlers.onLog?.(message, level);
  }
}
