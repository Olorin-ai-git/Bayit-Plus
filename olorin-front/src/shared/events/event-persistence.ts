/**
 * Event Persistence Manager for Olorin Microservices
 * Provides offline capability and event synchronization across services
 */

import { EventBusManager } from './eventBus';
import { storage } from '../utils';

export interface PersistedEvent {
  id: string;
  event: string;
  data: any;
  timestamp: Date;
  service: string;
  priority: EventPriority;
  retryCount: number;
  maxRetries: number;
  expiry?: Date;
  synchronized: boolean;
}

export type EventPriority = 'low' | 'medium' | 'high' | 'critical';

export interface PersistenceConfig {
  storageKey: string;
  maxEvents: number;
  retryInterval: number;
  maxRetries: number;
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
  autoSync: boolean;
  batchSize: number;
}

export interface SyncResult {
  synchronized: number;
  failed: number;
  skipped: number;
  errors: SyncError[];
}

export interface SyncError {
  eventId: string;
  error: string;
  timestamp: Date;
}

export interface EventFilter {
  services?: string[];
  priorities?: EventPriority[];
  dateRange?: { start: Date; end: Date };
  synchronized?: boolean;
}

/**
 * Event Persistence Manager
 */
export class EventPersistenceManager {
  private static instance: EventPersistenceManager;
  private config: PersistenceConfig;
  private eventBus: EventBusManager;
  private events: Map<string, PersistedEvent> = new Map();
  private syncInterval: NodeJS.Timeout | null = null;
  private isOnline = navigator.onLine;

  private constructor(config: PersistenceConfig) {
    this.config = config;
    this.eventBus = EventBusManager.getInstance();
    this.initialize();
  }

  public static getInstance(config?: PersistenceConfig): EventPersistenceManager {
    if (!EventPersistenceManager.instance) {
      if (!config) {
        throw new Error('EventPersistenceManager config required for first initialization');
      }
      EventPersistenceManager.instance = new EventPersistenceManager(config);
    }
    return EventPersistenceManager.instance;
  }

  /**
   * Initialize persistence manager
   */
  private initialize(): void {
    this.loadPersistedEvents();
    this.setupNetworkListeners();
    this.setupEventInterception();

    if (this.config.autoSync) {
      this.startAutoSync();
    }

    console.log('📦 Event Persistence Manager initialized');
  }

  /**
   * Persist an event
   */
  public persistEvent(
    event: string,
    data: any,
    service: string,
    priority: EventPriority = 'medium',
    maxRetries = this.config.maxRetries,
    expiry?: Date
  ): string {
    const persistedEvent: PersistedEvent = {
      id: this.generateEventId(),
      event,
      data: this.deepClone(data),
      timestamp: new Date(),
      service,
      priority,
      retryCount: 0,
      maxRetries,
      expiry,
      synchronized: this.isOnline
    };

    this.events.set(persistedEvent.id, persistedEvent);
    this.saveToStorage();

    console.log(`💾 Event persisted: ${event} (${service}) - Priority: ${priority}`);

    // If offline, queue for sync
    if (!this.isOnline) {
      console.log(`📴 Event queued for sync: ${persistedEvent.id}`);
    }

    return persistedEvent.id;
  }

  /**
   * Get persisted events
   */
  public getEvents(filter?: EventFilter): PersistedEvent[] {
    let events = Array.from(this.events.values());

    if (filter) {
      events = events.filter(event => {
        if (filter.services && !filter.services.includes(event.service)) {
          return false;
        }
        if (filter.priorities && !filter.priorities.includes(event.priority)) {
          return false;
        }
        if (filter.synchronized !== undefined && event.synchronized !== filter.synchronized) {
          return false;
        }
        if (filter.dateRange) {
          const eventTime = event.timestamp.getTime();
          const start = filter.dateRange.start.getTime();
          const end = filter.dateRange.end.getTime();
          if (eventTime < start || eventTime > end) {
            return false;
          }
        }
        return true;
      });
    }

    return events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get pending events (not synchronized)
   */
  public getPendingEvents(): PersistedEvent[] {
    return this.getEvents({ synchronized: false });
  }

  /**
   * Synchronize pending events
   */
  public async synchronizeEvents(): Promise<SyncResult> {
    const pendingEvents = this.getPendingEvents();
    const result: SyncResult = {
      synchronized: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };

    if (pendingEvents.length === 0) {
      return result;
    }

    console.log(`🔄 Synchronizing ${pendingEvents.length} pending events`);

    // Sort by priority and timestamp
    const sortedEvents = this.sortEventsByPriority(pendingEvents);

    // Process in batches
    for (let i = 0; i < sortedEvents.length; i += this.config.batchSize) {
      const batch = sortedEvents.slice(i, i + this.config.batchSize);
      const batchResults = await this.synchronizeBatch(batch);

      result.synchronized += batchResults.synchronized;
      result.failed += batchResults.failed;
      result.skipped += batchResults.skipped;
      result.errors.push(...batchResults.errors);
    }

    this.saveToStorage();
    console.log(`✅ Synchronization complete: ${result.synchronized} succeeded, ${result.failed} failed`);

    return result;
  }

  /**
   * Clear persisted events
   */
  public clearEvents(filter?: EventFilter): number {
    const eventsToDelete = this.getEvents(filter);
    let deletedCount = 0;

    eventsToDelete.forEach(event => {
      this.events.delete(event.id);
      deletedCount++;
    });

    this.saveToStorage();
    console.log(`🗑️ Cleared ${deletedCount} events`);

    return deletedCount;
  }

  /**
   * Clear expired events
   */
  public clearExpiredEvents(): number {
    const now = new Date();
    let deletedCount = 0;

    this.events.forEach((event, id) => {
      if (event.expiry && event.expiry < now) {
        this.events.delete(id);
        deletedCount++;
      }
    });

    if (deletedCount > 0) {
      this.saveToStorage();
      console.log(`⏰ Cleared ${deletedCount} expired events`);
    }

    return deletedCount;
  }

  /**
   * Get storage statistics
   */
  public getStats(): {
    totalEvents: number;
    pendingEvents: number;
    synchronizedEvents: number;
    storageSize: number;
    oldestEvent?: Date;
    newestEvent?: Date;
    priorityBreakdown: Record<EventPriority, number>;
    serviceBreakdown: Record<string, number>;
  } {
    const events = Array.from(this.events.values());
    const pendingEvents = events.filter(e => !e.synchronized);
    const synchronizedEvents = events.filter(e => e.synchronized);

    const priorityBreakdown: Record<EventPriority, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    };

    const serviceBreakdown: Record<string, number> = {};

    events.forEach(event => {
      priorityBreakdown[event.priority]++;
      serviceBreakdown[event.service] = (serviceBreakdown[event.service] || 0) + 1;
    });

    const timestamps = events.map(e => e.timestamp);
    const oldestEvent = timestamps.length > 0 ? new Date(Math.min(...timestamps.map(t => t.getTime()))) : undefined;
    const newestEvent = timestamps.length > 0 ? new Date(Math.max(...timestamps.map(t => t.getTime()))) : undefined;

    return {
      totalEvents: events.length,
      pendingEvents: pendingEvents.length,
      synchronizedEvents: synchronizedEvents.length,
      storageSize: this.getStorageSize(),
      oldestEvent,
      newestEvent,
      priorityBreakdown,
      serviceBreakdown
    };
  }

  /**
   * Export events
   */
  public exportEvents(filter?: EventFilter, format: 'json' | 'csv' = 'json'): string {
    const events = this.getEvents(filter);

    if (format === 'csv') {
      return this.exportToCSV(events);
    }

    return JSON.stringify(events, null, 2);
  }

  /**
   * Import events
   */
  public importEvents(data: string, format: 'json' | 'csv' = 'json'): number {
    let events: PersistedEvent[];

    try {
      if (format === 'csv') {
        events = this.importFromCSV(data);
      } else {
        events = JSON.parse(data);
      }

      let importedCount = 0;
      events.forEach(event => {
        if (this.isValidPersistedEvent(event)) {
          this.events.set(event.id, event);
          importedCount++;
        }
      });

      this.saveToStorage();
      console.log(`📥 Imported ${importedCount} events`);

      return importedCount;
    } catch (error) {
      console.error('Failed to import events:', error);
      throw error;
    }
  }

  /**
   * Private: Load persisted events from storage
   */
  private loadPersistedEvents(): void {
    try {
      const stored = storage.get<PersistedEvent[]>(this.config.storageKey, []);
      stored.forEach(event => {
        // Convert timestamp strings back to Date objects
        event.timestamp = new Date(event.timestamp);
        if (event.expiry) {
          event.expiry = new Date(event.expiry);
        }
        this.events.set(event.id, event);
      });

      console.log(`📂 Loaded ${this.events.size} persisted events`);
    } catch (error) {
      console.error('Failed to load persisted events:', error);
    }
  }

  /**
   * Private: Save events to storage
   */
  private saveToStorage(): void {
    try {
      const eventsArray = Array.from(this.events.values());

      // Clean up storage if it exceeds max events
      if (eventsArray.length > this.config.maxEvents) {
        const sorted = eventsArray.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        const toKeep = sorted.slice(eventsArray.length - this.config.maxEvents);

        this.events.clear();
        toKeep.forEach(event => this.events.set(event.id, event));
      }

      storage.set(this.config.storageKey, Array.from(this.events.values()));
    } catch (error) {
      console.error('Failed to save persisted events:', error);
    }
  }

  /**
   * Private: Setup network status listeners
   */
  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      console.log('🌐 Back online - starting event synchronization');
      this.isOnline = true;
      if (this.config.autoSync) {
        this.synchronizeEvents();
      }
    });

    window.addEventListener('offline', () => {
      console.log('📴 Gone offline - events will be queued');
      this.isOnline = false;
    });
  }

  /**
   * Private: Setup event bus interception
   */
  private setupEventInterception(): void {
    // Intercept critical events for persistence
    const criticalEvents = [
      'auto:investigation:started',
      'auto:investigation:completed',
      'manual:investigation:started',
      'manual:investigation:completed',
      'agent:execution:started',
      'report:generated'
    ];

    criticalEvents.forEach(event => {
      this.eventBus.subscribe(event, (data) => {
        if (!this.isOnline) {
          this.persistEvent(event, data, this.extractServiceFromEvent(event), 'high');
        }
      }, 'event-persistence');
    });
  }

  /**
   * Private: Start automatic synchronization
   */
  private startAutoSync(): void {
    this.syncInterval = setInterval(() => {
      if (this.isOnline && this.getPendingEvents().length > 0) {
        this.synchronizeEvents();
      }
      this.clearExpiredEvents();
    }, this.config.retryInterval);
  }

  /**
   * Private: Synchronize batch of events
   */
  private async synchronizeBatch(events: PersistedEvent[]): Promise<SyncResult> {
    const result: SyncResult = {
      synchronized: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };

    for (const event of events) {
      try {
        // Check if event is expired
        if (event.expiry && event.expiry < new Date()) {
          this.events.delete(event.id);
          result.skipped++;
          continue;
        }

        // Check if max retries exceeded
        if (event.retryCount >= event.maxRetries) {
          result.failed++;
          result.errors.push({
            eventId: event.id,
            error: 'Max retries exceeded',
            timestamp: new Date()
          });
          continue;
        }

        // Simulate synchronization (in real implementation, this would call actual APIs)
        await this.simulateEventSync(event);

        // Mark as synchronized
        event.synchronized = true;
        result.synchronized++;

      } catch (error) {
        event.retryCount++;
        result.failed++;
        result.errors.push({
          eventId: event.id,
          error: (error as Error).message,
          timestamp: new Date()
        });
      }
    }

    return result;
  }

  /**
   * Private: Simulate event synchronization
   */
  private async simulateEventSync(event: PersistedEvent): Promise<void> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));

    // Simulate occasional failures
    if (Math.random() < 0.1) {
      throw new Error('Network timeout');
    }

    // Re-emit the event to the event bus
    this.eventBus.emit(event.event as any, event.data);
  }

  /**
   * Private: Sort events by priority
   */
  private sortEventsByPriority(events: PersistedEvent[]): PersistedEvent[] {
    const priorityOrder: Record<EventPriority, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3
    };

    return events.sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.timestamp.getTime() - b.timestamp.getTime();
    });
  }

  /**
   * Private: Extract service name from event
   */
  private extractServiceFromEvent(event: string): string {
    if (event.startsWith('auto:')) return 'autonomous-investigation';
    if (event.startsWith('manual:')) return 'manual-investigation';
    if (event.startsWith('agent:')) return 'agent-analytics';
    if (event.startsWith('rag:')) return 'rag-intelligence';
    if (event.startsWith('viz:')) return 'visualization';
    if (event.startsWith('report:')) return 'reporting';
    if (event.startsWith('ui:')) return 'core-ui';
    if (event.startsWith('design:')) return 'design-system';
    return 'unknown';
  }

  /**
   * Private: Deep clone object
   */
  private deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * Private: Generate unique event ID
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Private: Get storage size
   */
  private getStorageSize(): number {
    try {
      const data = JSON.stringify(Array.from(this.events.values()));
      return new Blob([data]).size;
    } catch {
      return 0;
    }
  }

  /**
   * Private: Export to CSV
   */
  private exportToCSV(events: PersistedEvent[]): string {
    const headers = ['id', 'event', 'service', 'priority', 'timestamp', 'synchronized', 'retryCount'];
    const rows = events.map(event => [
      event.id,
      event.event,
      event.service,
      event.priority,
      event.timestamp.toISOString(),
      event.synchronized.toString(),
      event.retryCount.toString()
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  /**
   * Private: Import from CSV
   */
  private importFromCSV(csv: string): PersistedEvent[] {
    const lines = csv.split('\n');
    const headers = lines[0].split(',');

    return lines.slice(1).map(line => {
      const values = line.split(',');
      const event: Partial<PersistedEvent> = {};

      headers.forEach((header, index) => {
        const value = values[index];
        switch (header) {
          case 'timestamp':
          case 'expiry':
            (event as any)[header] = new Date(value);
            break;
          case 'synchronized':
            (event as any)[header] = value === 'true';
            break;
          case 'retryCount':
          case 'maxRetries':
            (event as any)[header] = parseInt(value, 10);
            break;
          default:
            (event as any)[header] = value;
        }
      });

      return event as PersistedEvent;
    });
  }

  /**
   * Private: Validate persisted event structure
   */
  private isValidPersistedEvent(event: any): event is PersistedEvent {
    return event &&
           typeof event.id === 'string' &&
           typeof event.event === 'string' &&
           typeof event.service === 'string' &&
           ['low', 'medium', 'high', 'critical'].includes(event.priority) &&
           event.timestamp instanceof Date &&
           typeof event.synchronized === 'boolean' &&
           typeof event.retryCount === 'number' &&
           typeof event.maxRetries === 'number';
  }
}

/**
 * Default persistence configuration
 */
export const defaultPersistenceConfig: PersistenceConfig = {
  storageKey: 'olorin-persisted-events',
  maxEvents: 1000,
  retryInterval: 30000, // 30 seconds
  maxRetries: 5,
  compressionEnabled: false,
  encryptionEnabled: false,
  autoSync: true,
  batchSize: 10
};

/**
 * Factory function to create persistence manager
 */
export function createEventPersistenceManager(config?: Partial<PersistenceConfig>): EventPersistenceManager {
  const fullConfig = { ...defaultPersistenceConfig, ...config };
  return EventPersistenceManager.getInstance(fullConfig);
}

/**
 * Utility functions for event persistence
 */
export const EventPersistenceUtils = {
  /**
   * Check if browser supports offline functionality
   */
  supportsOffline(): boolean {
    return 'navigator' in window && 'onLine' in navigator && 'localStorage' in window;
  },

  /**
   * Get network status
   */
  isOnline(): boolean {
    return navigator.onLine;
  },

  /**
   * Estimate storage usage
   */
  getStorageUsage(): { used: number; available: number } {
    try {
      const test = 'storage-test';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);

      // Estimate available storage (simplified)
      const used = JSON.stringify(localStorage).length;
      const available = 5 * 1024 * 1024 - used; // Assume 5MB limit

      return { used, available };
    } catch {
      return { used: 0, available: 0 };
    }
  },

  /**
   * Clear all persistence data
   */
  clearAllPersistedData(): void {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('olorin-')) {
        localStorage.removeItem(key);
      }
    });
  }
};

export default EventPersistenceManager;