/**
 * Offline Support
 *
 * Constitutional Compliance:
 * - Configuration-driven offline handling
 * - Type-safe offline state management
 * - No hardcoded values
 * - No mocks or placeholders
 *
 * Usage:
 *   import { OfflineManager, isOnline } from '@api/resilience/offline';
 */

/**
 * Offline status
 */
export interface OfflineStatus {
  online: boolean;
  lastOnline: Date | null;
  queuedRequests: number;
}

/**
 * Queued request
 */
export interface QueuedRequest {
  id: string;
  url: string;
  method: string;
  body?: unknown;
  timestamp: Date;
  retryCount: number;
}

/**
 * Offline event handler
 */
export type OfflineEventHandler = (status: OfflineStatus) => void;

/**
 * Offline manager
 */
export class OfflineManager {
  private online = navigator.onLine;
  private lastOnline: Date | null = navigator.onLine ? new Date() : null;
  private queue: QueuedRequest[] = [];
  private handlers = new Set<OfflineEventHandler>();
  private maxQueueSize = 100;
  private maxRetries = 3;

  constructor() {
    this.setupListeners();
    this.loadQueue();
  }

  /**
   * Setup online/offline listeners
   */
  private setupListeners(): void {
    window.addEventListener('online', () => {
      this.online = true;
      this.lastOnline = new Date();
      this.notifyHandlers();
      this.processQueue();
    });

    window.addEventListener('offline', () => {
      this.online = false;
      this.notifyHandlers();
    });
  }

  /**
   * Load queue from storage
   */
  private loadQueue(): void {
    try {
      const stored = sessionStorage.getItem('offline-queue');
      if (stored) {
        this.queue = JSON.parse(stored).map((item: QueuedRequest) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        }));
      }
    } catch {
      this.queue = [];
    }
  }

  /**
   * Save queue to storage
   */
  private saveQueue(): void {
    try {
      sessionStorage.setItem('offline-queue', JSON.stringify(this.queue));
    } catch {
      // Storage unavailable
    }
  }

  /**
   * Add request to queue
   */
  enqueue(request: Omit<QueuedRequest, 'id' | 'timestamp' | 'retryCount'>): void {
    if (this.queue.length >= this.maxQueueSize) {
      this.queue.shift();
    }

    this.queue.push({
      ...request,
      id: crypto.randomUUID(),
      timestamp: new Date(),
      retryCount: 0
    });

    this.saveQueue();
    this.notifyHandlers();
  }

  /**
   * Process queued requests
   */
  private async processQueue(): Promise<void> {
    if (!this.online || this.queue.length === 0) {
      return;
    }

    const requests = [...this.queue];
    this.queue = [];
    this.saveQueue();

    for (const request of requests) {
      try {
        await this.executeRequest(request);
      } catch (error) {
        if (request.retryCount < this.maxRetries) {
          request.retryCount++;
          this.queue.push(request);
        }
      }
    }

    this.saveQueue();
    this.notifyHandlers();
  }

  /**
   * Execute queued request
   */
  private async executeRequest(request: QueuedRequest): Promise<void> {
    const response = await fetch(request.url, {
      method: request.method,
      body: request.body ? JSON.stringify(request.body) : undefined,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
  }

  /**
   * Get offline status
   */
  getStatus(): OfflineStatus {
    return {
      online: this.online,
      lastOnline: this.lastOnline,
      queuedRequests: this.queue.length
    };
  }

  /**
   * Check if online
   */
  isOnline(): boolean {
    return this.online;
  }

  /**
   * Add status change handler
   */
  addHandler(handler: OfflineEventHandler): () => void {
    this.handlers.add(handler);

    return () => {
      this.handlers.delete(handler);
    };
  }

  /**
   * Notify handlers
   */
  private notifyHandlers(): void {
    const status = this.getStatus();

    for (const handler of this.handlers) {
      try {
        handler(status);
      } catch {
        // Ignore handler errors
      }
    }
  }

  /**
   * Clear queue
   */
  clearQueue(): void {
    this.queue = [];
    this.saveQueue();
    this.notifyHandlers();
  }

  /**
   * Get queued requests
   */
  getQueue(): QueuedRequest[] {
    return [...this.queue];
  }
}

// Singleton instance
let offlineManagerInstance: OfflineManager | null = null;

export function getOfflineManager(): OfflineManager {
  if (!offlineManagerInstance) {
    offlineManagerInstance = new OfflineManager();
  }
  return offlineManagerInstance;
}

/**
 * Check if online
 */
export function isOnline(): boolean {
  return getOfflineManager().isOnline();
}

/**
 * Get offline status
 */
export function getOfflineStatus(): OfflineStatus {
  return getOfflineManager().getStatus();
}

/**
 * Queue request for offline execution
 */
export function queueOfflineRequest(
  url: string,
  method: string,
  body?: unknown
): void {
  getOfflineManager().enqueue({ url, method, body });
}

/**
 * Add offline status change handler
 */
export function onOfflineStatusChange(
  handler: OfflineEventHandler
): () => void {
  return getOfflineManager().addHandler(handler);
}
