/**
 * Real-time Connection Manager
 *
 * Constitutional Compliance:
 * - Configuration-driven connection settings
 * - Type-safe real-time event handling
 * - No hardcoded values
 * - No mocks or placeholders
 *
 * Usage:
 *   import { RealtimeConnection } from '@api/realtime/connection';
 */

import { WebSocketClient, WebSocketState } from '../websocket/client';
import { EventEmitter } from '../events/emitter';
import type { InvestigationResponse } from '../schemas/investigation';

/**
 * Real-time event types
 */
export interface RealtimeEvents {
  'investigation:created': InvestigationResponse;
  'investigation:updated': InvestigationResponse;
  'investigation:completed': InvestigationResponse;
  'investigation:failed': { investigation_id: string; error: string };
  'progress:update': { investigation_id: string; progress: number; phase: string };
  'tool:started': { investigation_id: string; tool_name: string; timestamp: string };
  'tool:completed': { investigation_id: string; tool_name: string; result: unknown; timestamp: string };
  'log:entry': { investigation_id: string; level: string; message: string; timestamp: string };
  'connection:established': void;
  'connection:lost': void;
  'connection:error': Error;
}

/**
 * Real-time connection manager
 */
export class RealtimeConnection {
  private ws: WebSocketClient;
  private events: EventEmitter<RealtimeEvents>;
  private subscriptions: Map<string, Set<string>> = new Map();

  constructor(wsClient?: WebSocketClient) {
    this.ws = wsClient ?? new WebSocketClient();
    this.events = new EventEmitter<RealtimeEvents>();
    this.setupWebSocketHandlers();
  }

  /**
   * Connect to real-time server
   */
  connect(): void {
    this.ws.connect();
  }

  /**
   * Disconnect from real-time server
   */
  disconnect(): void {
    this.ws.disconnect();
  }

  /**
   * Subscribe to investigation updates
   */
  subscribeToInvestigation(investigationId: string): void {
    this.ws.send('subscribe', {
      type: 'investigation',
      investigation_id: investigationId
    });

    if (!this.subscriptions.has('investigation')) {
      this.subscriptions.set('investigation', new Set());
    }
    this.subscriptions.get('investigation')!.add(investigationId);
  }

  /**
   * Unsubscribe from investigation updates
   */
  unsubscribeFromInvestigation(investigationId: string): void {
    this.ws.send('unsubscribe', {
      type: 'investigation',
      investigation_id: investigationId
    });

    const subscriptions = this.subscriptions.get('investigation');
    if (subscriptions) {
      subscriptions.delete(investigationId);
    }
  }

  /**
   * Subscribe to event
   */
  on<K extends keyof RealtimeEvents>(
    event: K,
    handler: (data: RealtimeEvents[K]) => void
  ): () => void {
    return this.events.on(event, handler);
  }

  /**
   * Subscribe to event (fires only once)
   */
  once<K extends keyof RealtimeEvents>(
    event: K,
    handler: (data: RealtimeEvents[K]) => void
  ): () => void {
    return this.events.once(event, handler);
  }

  /**
   * Get connection state
   */
  getState(): WebSocketState {
    return this.ws.getState();
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws.isConnected();
  }

  private setupWebSocketHandlers(): void {
    this.ws.addEventListener('open', () => {
      this.events.emitSync('connection:established', undefined);
      this.resubscribeAll();
    });

    this.ws.addEventListener('close', () => {
      this.events.emitSync('connection:lost', undefined);
    });

    this.ws.addEventListener('error', (event) => {
      this.events.emitSync('connection:error', new Error('WebSocket error'));
    });

    this.ws.on('investigation_created', (data) => {
      this.events.emitSync('investigation:created', data);
    });

    this.ws.on('investigation_updated', (data) => {
      this.events.emitSync('investigation:updated', data);
    });

    this.ws.on('investigation_completed', (data) => {
      this.events.emitSync('investigation:completed', data);
    });

    this.ws.on('investigation_failed', (data) => {
      this.events.emitSync('investigation:failed', data);
    });

    this.ws.on('progress_update', (data) => {
      this.events.emitSync('progress:update', data);
    });

    this.ws.on('tool_started', (data) => {
      this.events.emitSync('tool:started', data);
    });

    this.ws.on('tool_completed', (data) => {
      this.events.emitSync('tool:completed', data);
    });

    this.ws.on('log_entry', (data) => {
      this.events.emitSync('log:entry', data);
    });
  }

  private resubscribeAll(): void {
    for (const [type, ids] of this.subscriptions.entries()) {
      for (const id of ids) {
        if (type === 'investigation') {
          this.subscribeToInvestigation(id);
        }
      }
    }
  }
}

/**
 * Create real-time connection instance
 */
export function createRealtimeConnection(wsClient?: WebSocketClient): RealtimeConnection {
  return new RealtimeConnection(wsClient);
}

let defaultRealtimeInstance: RealtimeConnection | null = null;

/**
 * Get or create default real-time connection instance
 */
export function getRealtimeConnection(): RealtimeConnection {
  if (!defaultRealtimeInstance) {
    defaultRealtimeInstance = createRealtimeConnection();
  }
  return defaultRealtimeInstance;
}

/**
 * Reset default real-time connection instance
 */
export function resetRealtimeConnection(): void {
  if (defaultRealtimeInstance) {
    defaultRealtimeInstance.disconnect();
    defaultRealtimeInstance = null;
  }
}
