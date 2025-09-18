import { ManualInvestigation, Comment, Timeline, Evidence, InvestigationStep } from '../types/manualInvestigation';

interface WebSocketMessage {
  type: string;
  investigationId: string;
  data: any;
  timestamp: string;
  userId: string;
  userName: string;
}

interface CollaborationEvent {
  type: 'comment_added' | 'step_updated' | 'evidence_added' | 'user_joined' | 'user_left' | 'investigation_updated';
  investigationId: string;
  data: any;
  timestamp: string;
  userId: string;
  userName: string;
}

interface UserPresence {
  userId: string;
  userName: string;
  status: 'online' | 'away' | 'offline';
  currentView?: string;
  lastSeen: string;
}

interface TypingIndicator {
  userId: string;
  userName: string;
  componentType: 'comment' | 'step_notes' | 'evidence_description';
  componentId?: string;
}

type EventCallback = (event: CollaborationEvent) => void;
type PresenceCallback = (users: UserPresence[]) => void;
type TypingCallback = (typingUsers: TypingIndicator[]) => void;

class CollaborationService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private eventCallbacks: Map<string, EventCallback[]> = new Map();
  private presenceCallbacks: PresenceCallback[] = [];
  private typingCallbacks: TypingCallback[] = [];
  private currentInvestigationId: string | null = null;
  private currentUserId: string | null = null;
  private currentUserName: string | null = null;
  private isConnected = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private typingTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.handleMessage = this.handleMessage.bind(this);
    this.handleClose = this.handleClose.bind(this);
    this.handleError = this.handleError.bind(this);
    this.handleOpen = this.handleOpen.bind(this);
  }

  connect(investigationId: string, userId: string, userName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.disconnect();
        }

        this.currentInvestigationId = investigationId;
        this.currentUserId = userId;
        this.currentUserName = userName;

        const wsUrl = this.getWebSocketUrl(investigationId, userId);
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          this.handleOpen();
          resolve();
        };

        this.ws.onmessage = this.handleMessage;
        this.ws.onclose = this.handleClose;
        this.ws.onerror = (error) => {
          this.handleError(error);
          reject(error);
        };

        // Set connection timeout
        setTimeout(() => {
          if (!this.isConnected) {
            reject(new Error('WebSocket connection timeout'));
          }
        }, 10000);

      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
      this.typingTimeout = null;
    }

    this.isConnected = false;
    this.currentInvestigationId = null;
    this.currentUserId = null;
    this.currentUserName = null;
    this.reconnectAttempts = 0;
  }

  private getWebSocketUrl(investigationId: string, userId: string): string {
    const baseUrl = process.env.REACT_APP_WS_BASE_URL || 'ws://localhost:8090';
    const token = localStorage.getItem('authToken') || '';
    return `${baseUrl}/ws/investigations/${investigationId}?userId=${userId}&token=${encodeURIComponent(token)}`;
  }

  private handleOpen(): void {
    console.log('WebSocket connected for investigation collaboration');
    this.isConnected = true;
    this.reconnectAttempts = 0;

    // Start heartbeat
    this.startHeartbeat();

    // Send initial presence
    this.sendPresenceUpdate('online');
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      this.processMessage(message);
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }

  private handleClose(event: CloseEvent): void {
    console.log('WebSocket connection closed:', event.code, event.reason);
    this.isConnected = false;

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    // Attempt to reconnect if not manually closed
    if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
      setTimeout(() => {
        this.attemptReconnect();
      }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts));
    }
  }

  private handleError(error: Event): void {
    console.error('WebSocket error:', error);
  }

  private attemptReconnect(): void {
    if (this.currentInvestigationId && this.currentUserId && this.currentUserName) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

      this.connect(this.currentInvestigationId, this.currentUserId, this.currentUserName)
        .catch((error) => {
          console.error('Reconnection failed:', error);
        });
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.sendMessage({
          type: 'ping',
          investigationId: this.currentInvestigationId!,
          data: {},
          timestamp: new Date().toISOString(),
          userId: this.currentUserId!,
          userName: this.currentUserName!
        });
      }
    }, 30000); // Send ping every 30 seconds
  }

  private processMessage(message: WebSocketMessage): void {
    switch (message.type) {
      case 'pong':
        // Heartbeat response
        break;

      case 'presence_update':
        this.notifyPresenceCallbacks(message.data.users);
        break;

      case 'typing_indicator':
        this.notifyTypingCallbacks(message.data.typingUsers);
        break;

      case 'comment_added':
      case 'step_updated':
      case 'evidence_added':
      case 'user_joined':
      case 'user_left':
      case 'investigation_updated':
        this.notifyEventCallbacks(message.type, {
          type: message.type,
          investigationId: message.investigationId,
          data: message.data,
          timestamp: message.timestamp,
          userId: message.userId,
          userName: message.userName
        });
        break;

      default:
        console.warn('Unknown message type:', message.type);
    }
  }

  private sendMessage(message: WebSocketMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, message not sent:', message.type);
    }
  }

  // Event Subscription Methods
  onEvent(eventType: string, callback: EventCallback): () => void {
    if (!this.eventCallbacks.has(eventType)) {
      this.eventCallbacks.set(eventType, []);
    }
    this.eventCallbacks.get(eventType)!.push(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.eventCallbacks.get(eventType);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  onPresenceUpdate(callback: PresenceCallback): () => void {
    this.presenceCallbacks.push(callback);

    return () => {
      const index = this.presenceCallbacks.indexOf(callback);
      if (index > -1) {
        this.presenceCallbacks.splice(index, 1);
      }
    };
  }

  onTypingUpdate(callback: TypingCallback): () => void {
    this.typingCallbacks.push(callback);

    return () => {
      const index = this.typingCallbacks.indexOf(callback);
      if (index > -1) {
        this.typingCallbacks.splice(index, 1);
      }
    };
  }

  private notifyEventCallbacks(eventType: string, event: CollaborationEvent): void {
    const callbacks = this.eventCallbacks.get(eventType);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          console.error('Error in event callback:', error);
        }
      });
    }
  }

  private notifyPresenceCallbacks(users: UserPresence[]): void {
    this.presenceCallbacks.forEach(callback => {
      try {
        callback(users);
      } catch (error) {
        console.error('Error in presence callback:', error);
      }
    });
  }

  private notifyTypingCallbacks(typingUsers: TypingIndicator[]): void {
    this.typingCallbacks.forEach(callback => {
      try {
        callback(typingUsers);
      } catch (error) {
        console.error('Error in typing callback:', error);
      }
    });
  }

  // Public Methods for sending events
  sendCommentAdded(comment: Comment): void {
    this.sendMessage({
      type: 'comment_added',
      investigationId: this.currentInvestigationId!,
      data: { comment },
      timestamp: new Date().toISOString(),
      userId: this.currentUserId!,
      userName: this.currentUserName!
    });
  }

  sendStepUpdated(step: InvestigationStep): void {
    this.sendMessage({
      type: 'step_updated',
      investigationId: this.currentInvestigationId!,
      data: { step },
      timestamp: new Date().toISOString(),
      userId: this.currentUserId!,
      userName: this.currentUserName!
    });
  }

  sendEvidenceAdded(evidence: Evidence): void {
    this.sendMessage({
      type: 'evidence_added',
      investigationId: this.currentInvestigationId!,
      data: { evidence },
      timestamp: new Date().toISOString(),
      userId: this.currentUserId!,
      userName: this.currentUserName!
    });
  }

  sendInvestigationUpdated(investigation: Partial<ManualInvestigation>): void {
    this.sendMessage({
      type: 'investigation_updated',
      investigationId: this.currentInvestigationId!,
      data: { investigation },
      timestamp: new Date().toISOString(),
      userId: this.currentUserId!,
      userName: this.currentUserName!
    });
  }

  sendPresenceUpdate(status: 'online' | 'away' | 'offline', currentView?: string): void {
    this.sendMessage({
      type: 'presence_update',
      investigationId: this.currentInvestigationId!,
      data: { status, currentView },
      timestamp: new Date().toISOString(),
      userId: this.currentUserId!,
      userName: this.currentUserName!
    });
  }

  sendTypingIndicator(
    componentType: 'comment' | 'step_notes' | 'evidence_description',
    componentId?: string,
    isTyping = true
  ): void {
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }

    this.sendMessage({
      type: 'typing_indicator',
      investigationId: this.currentInvestigationId!,
      data: { componentType, componentId, isTyping },
      timestamp: new Date().toISOString(),
      userId: this.currentUserId!,
      userName: this.currentUserName!
    });

    // Stop typing indicator after 3 seconds of inactivity
    if (isTyping) {
      this.typingTimeout = setTimeout(() => {
        this.sendTypingIndicator(componentType, componentId, false);
      }, 3000);
    }
  }

  // Utility methods
  isConnectedToInvestigation(investigationId: string): boolean {
    return this.isConnected && this.currentInvestigationId === investigationId;
  }

  getConnectionStatus(): {
    isConnected: boolean;
    investigationId: string | null;
    userId: string | null;
    reconnectAttempts: number;
  } {
    return {
      isConnected: this.isConnected,
      investigationId: this.currentInvestigationId,
      userId: this.currentUserId,
      reconnectAttempts: this.reconnectAttempts
    };
  }

  // Browser visibility handling
  setupVisibilityHandling(): () => void {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        this.sendPresenceUpdate('away');
      } else {
        this.sendPresenceUpdate('online');
      }
    };

    const handleBeforeUnload = () => {
      this.sendPresenceUpdate('offline');
      this.disconnect();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }
}

// Create singleton instance
export const collaborationService = new CollaborationService();

// Export types
export type {
  CollaborationEvent,
  UserPresence,
  TypingIndicator,
  EventCallback,
  PresenceCallback,
  TypingCallback
};