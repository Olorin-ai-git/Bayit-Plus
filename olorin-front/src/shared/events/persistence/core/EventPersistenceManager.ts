/**
 * Event Persistence Manager
 * Main class for managing event persistence and synchronization
 * Feature: Event persistence system
 */

import type {
  PersistedEvent,
  PersistenceConfig,
  EventPriority,
  EventFilter,
  SyncResult,
  StorageStats,
} from '../types/persistence-types';
import { EventBusManager } from '../../eventBus';
import { loadPersistedEvents, saveEventsToStorage } from '../storage/storage-manager';
import { synchronizePendingEvents } from '../sync/sync-operations';
import { exportToCSV, exportToJSON, importFromCSV, importFromJSON } from '../export/import-manager';
import { generateEventId, deepClone, isEventExpired } from '../utils/persistence-utils';
import {
  setupNetworkListeners,
  setupEventInterception,
  startAutoSyncInterval,
} from './event-manager-internal';
import { filterEvents, calculateStats } from './filter-stats';

/**
 * Event Persistence Manager
 * Singleton class for managing persisted events
 */
export class EventPersistenceManager {
  private static instance: EventPersistenceManager;
  private config: PersistenceConfig;
  private eventBus: EventBusManager;
  private events: Map<string, PersistedEvent> = new Map();
  private syncInterval: ReturnType<typeof setInterval> | null = null;
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

  /** Initialize persistence manager */
  private initialize(): void {
    loadPersistedEvents(this.config.storageKey).forEach((event) =>
      this.events.set(event.id, event)
    );
    setupNetworkListeners(
      () => {
        this.isOnline = true;
        if (this.config.autoSync) this.synchronizeEvents();
      },
      () => (this.isOnline = false)
    );
    setupEventInterception(
      this.eventBus,
      this.isOnline,
      (event, data, service, priority) =>
        this.persistEvent(event, data, service, priority)
    );
    if (this.config.autoSync) {
      this.syncInterval = startAutoSyncInterval(
        this.config,
        () => this.synchronizeEvents(),
        () => this.clearExpiredEvents(),
        () => this.getPendingEvents().length > 0,
        () => this.isOnline
      );
    }
    console.log('📦 Event Persistence Manager initialized');
  }

  /** Persist an event */
  public persistEvent(
    event: string,
    data: any,
    service: string,
    priority: EventPriority = 'medium',
    maxRetries = this.config.maxRetries,
    expiry?: Date
  ): string {
    const persistedEvent: PersistedEvent = {
      id: generateEventId(),
      event,
      data: deepClone(data),
      timestamp: new Date(),
      service,
      priority,
      retryCount: 0,
      maxRetries,
      expiry,
      synchronized: this.isOnline,
    };
    this.events.set(persistedEvent.id, persistedEvent);
    this.saveToStorage();
    console.log(`💾 Event persisted: ${event} (${service}) - Priority: ${priority}`);
    if (!this.isOnline) console.log(`📴 Event queued for sync: ${persistedEvent.id}`);
    return persistedEvent.id;
  }

  /** Get persisted events with optional filtering */
  public getEvents(filter?: EventFilter): PersistedEvent[] {
    return filterEvents(Array.from(this.events.values()), filter);
  }
  /** Get pending events (not synchronized) */
  public getPendingEvents(): PersistedEvent[] {
    return this.getEvents({ synchronized: false });
  }
  /** Synchronize pending events */
  public async synchronizeEvents(): Promise<SyncResult> {
    const result = await synchronizePendingEvents(
      this.getPendingEvents(),
      this.config,
      (eventId) => this.events.delete(eventId)
    );
    this.saveToStorage();
    return result;
  }
  /** Clear persisted events */
  public clearEvents(filter?: EventFilter): number {
    const eventsToDelete = this.getEvents(filter);
    eventsToDelete.forEach((event) => this.events.delete(event.id));
    this.saveToStorage();
    console.log(`🗑️ Cleared ${eventsToDelete.length} events`);
    return eventsToDelete.length;
  }
  /** Clear expired events */
  public clearExpiredEvents(): number {
    let deletedCount = 0;
    this.events.forEach((event, id) => {
      if (isEventExpired(event)) {
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
  /** Get storage statistics */
  public getStats(): StorageStats {
    return calculateStats(Array.from(this.events.values()));
  }
  /** Export events */
  public exportEvents(filter?: EventFilter, format: 'json' | 'csv' = 'json'): string {
    return format === 'csv' ? exportToCSV(this.getEvents(filter)) : exportToJSON(this.getEvents(filter));
  }
  /** Import events */
  public importEvents(data: string, format: 'json' | 'csv' = 'json'): number {
    const events = format === 'csv' ? importFromCSV(data) : importFromJSON(data);
    events.forEach((event) => this.events.set(event.id, event));
    this.saveToStorage();
    console.log(`📥 Imported ${events.length} events`);
    return events.length;
  }
  /** Private: Save events to storage */
  private saveToStorage(): void {
    const eventsArray = Array.from(this.events.values());
    saveEventsToStorage(this.config.storageKey, eventsArray, this.config.maxEvents);
    if (eventsArray.length !== this.events.size) {
      this.events.clear();
      eventsArray.forEach((event) => this.events.set(event.id, event));
    }
  }
}

/**
 * Factory function to create persistence manager
 */
export function createEventPersistenceManager(
  config?: Partial<PersistenceConfig>
): EventPersistenceManager {
  const { defaultPersistenceConfig } = require('../config/persistence-config');
  const fullConfig = { ...defaultPersistenceConfig, ...config };
  return EventPersistenceManager.getInstance(fullConfig);
}

export default EventPersistenceManager;
