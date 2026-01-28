/**
 * WebSocket Manager
 *
 * Manages WebSocket connection to Bayit+ backend dubbing service
 * Handles reconnection with exponential backoff
 */

import { createLogger } from '@/lib/logger';
import { CONFIG } from '@/config/constants';

const logger = createLogger('WebSocketManager');

export interface WebSocketMessage {
  type: 'audio' | 'transcript' | 'error' | 'status';
  data?: string; // Base64 audio or text
  error?: string;
  status?: string;
}

export interface WebSocketManagerConfig {
  sessionId: string;
  token: string;
  onAudioReceived: (base64Audio: string) => void;
  onTranscriptReceived?: (transcript: string) => void;
  onError: (error: Error) => void;
  onStatusChange: (status: 'connecting' | 'connected' | 'disconnected' | 'reconnecting') => void;
}

export class WebSocketManager {
  private ws: WebSocket | null = null;
  private config: WebSocketManagerConfig;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isManualClose = false;

  constructor(config: WebSocketManagerConfig) {
    this.config = config;
  }

  /**
   * Connect to WebSocket server
   */
  async connect(): Promise<void> {
    try {
      this.isManualClose = false;
      this.config.onStatusChange('connecting');

      const wsUrl = `${CONFIG.API.WEBSOCKET_URL}/api/v1/dubbing/ws/${this.config.sessionId}`;

      logger.info('Connecting to WebSocket', {
        url: wsUrl,
        sessionId: this.config.sessionId,
      });

      this.ws = new WebSocket(wsUrl);

      // Setup event handlers
      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onerror = this.handleError.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
    } catch (error) {
      logger.error('Failed to connect to WebSocket', { error: String(error) });
      this.config.onError(new Error('WebSocket connection failed'));
      this.scheduleReconnect();
    }
  }

  /**
   * Handle WebSocket open event
   */
  private handleOpen(): void {
    logger.info('WebSocket connected', {
      sessionId: this.config.sessionId,
      reconnectAttempts: this.reconnectAttempts,
    });

    this.reconnectAttempts = 0;
    this.config.onStatusChange('connected');

    // Send authentication token
    this.sendMessage({
      type: 'auth',
      token: this.config.token,
    });
  }

  /**
   * Handle WebSocket message
   */
  private handleMessage(event: MessageEvent): void {
    try {
      // Binary messages are audio data (PCM)
      if (event.data instanceof ArrayBuffer || event.data instanceof Blob) {
        logger.debug('Received binary message (PCM audio)', {
          size: event.data instanceof ArrayBuffer ? event.data.byteLength : event.data.size,
        });
        return;
      }

      // JSON messages
      const message: WebSocketMessage = JSON.parse(event.data);

      logger.debug('Received WebSocket message', {
        type: message.type,
      });

      switch (message.type) {
        case 'audio':
          // Dubbed audio (base64 encoded)
          if (message.data) {
            this.config.onAudioReceived(message.data);
          }
          break;

        case 'transcript':
          // Transcription of original audio
          if (message.data && this.config.onTranscriptReceived) {
            this.config.onTranscriptReceived(message.data);
          }
          break;

        case 'error':
          // Server error
          logger.error('Server error', { error: message.error });
          this.config.onError(new Error(message.error || 'Unknown server error'));
          break;

        case 'status':
          // Status update
          logger.info('Status update', { status: message.status });
          break;

        default:
          logger.warn('Unknown message type', { type: message.type });
      }
    } catch (error) {
      logger.error('Failed to handle WebSocket message', { error: String(error) });
    }
  }

  /**
   * Handle WebSocket error
   */
  private handleError(event: Event): void {
    logger.error('WebSocket error', {
      sessionId: this.config.sessionId,
      reconnectAttempts: this.reconnectAttempts,
    });

    this.config.onError(new Error('WebSocket error occurred'));
  }

  /**
   * Handle WebSocket close
   */
  private handleClose(event: CloseEvent): void {
    logger.info('WebSocket closed', {
      code: event.code,
      reason: event.reason,
      wasClean: event.wasClean,
      reconnectAttempts: this.reconnectAttempts,
    });

    this.config.onStatusChange('disconnected');

    // Don't reconnect if manually closed
    if (this.isManualClose) {
      logger.info('Manual close, not reconnecting');
      return;
    }

    // Reconnect if not at max attempts
    if (this.reconnectAttempts < CONFIG.RECONNECTION.MAX_ATTEMPTS) {
      this.scheduleReconnect();
    } else {
      logger.error('Max reconnection attempts reached', {
        maxAttempts: CONFIG.RECONNECTION.MAX_ATTEMPTS,
      });
      this.config.onError(new Error('Max reconnection attempts reached'));
    }
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectAttempts++;
    this.config.onStatusChange('reconnecting');

    // Exponential backoff: 1s, 2s, 4s, 8s, 16s, max 30s
    const delay = Math.min(
      CONFIG.RECONNECTION.INITIAL_DELAY_MS * Math.pow(2, this.reconnectAttempts - 1),
      CONFIG.RECONNECTION.MAX_DELAY_MS
    );

    logger.info('Scheduling reconnection', {
      attempt: this.reconnectAttempts,
      delayMs: delay,
    });

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Send binary PCM data
   */
  sendAudio(pcmData: Int16Array): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      logger.warn('Cannot send audio: WebSocket not connected');
      return;
    }

    try {
      this.ws.send(pcmData.buffer);
    } catch (error) {
      logger.error('Failed to send audio data', { error: String(error) });
    }
  }

  /**
   * Send JSON message
   */
  private sendMessage(message: Record<string, unknown>): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      logger.warn('Cannot send message: WebSocket not connected');
      return;
    }

    try {
      this.ws.send(JSON.stringify(message));
    } catch (error) {
      logger.error('Failed to send message', { error: String(error) });
    }
  }

  /**
   * Close WebSocket connection
   */
  close(): void {
    this.isManualClose = true;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      try {
        this.ws.close(1000, 'Client closed connection');
      } catch (error) {
        logger.error('Failed to close WebSocket', { error: String(error) });
      }
      this.ws = null;
    }

    logger.info('WebSocket closed manually');
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Get current connection state
   */
  getState(): 'connecting' | 'connected' | 'disconnected' | 'reconnecting' {
    if (!this.ws) return 'disconnected';

    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return this.reconnectAttempts > 0 ? 'reconnecting' : 'connecting';
      case WebSocket.OPEN:
        return 'connected';
      case WebSocket.CLOSING:
      case WebSocket.CLOSED:
        return 'disconnected';
      default:
        return 'disconnected';
    }
  }
}
