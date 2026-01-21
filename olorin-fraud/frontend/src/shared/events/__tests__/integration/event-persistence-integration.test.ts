/**
 * Event Persistence Integration Tests
 * Tests offline capability, event synchronization, and data persistence
 */

import {
  EventPersistenceManager,
  PersistedEvent,
  EventPriority,
  PersistenceConfig,
  SyncResult,
  EventFilter,
  defaultPersistenceConfig,
  EventPersistenceUtils
} from '../../event-persistence';
import { EventBusManager } from '../../eventBus';

// Mock storage for testing
const mockStorage = new Map<string, any>();

const mockStorageUtils = {
  get: jest.fn((key: string, defaultValue?: any) => {
    const value = mockStorage.get(key);
    return value !== undefined ? value : defaultValue;
  }),
  set: jest.fn((key: string, value: any) => {
    mockStorage.set(key, value);
  }),
  remove: jest.fn((key: string) => {
    mockStorage.delete(key);
  }),
  clear: jest.fn(() => {
    mockStorage.clear();
  })
};

jest.mock('../../storage', () => ({
  storage: mockStorageUtils
}));

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true
});

// Mock window events
const mockEventListeners = new Map<string, Function[]>();
const originalAddEventListener = window.addEventListener;
const originalRemoveEventListener = window.removeEventListener;

window.addEventListener = jest.fn((event: string, handler: Function) => {
  if (!mockEventListeners.has(event)) {
    mockEventListeners.set(event, []);
  }
  mockEventListeners.get(event)!.push(handler);
});

window.removeEventListener = jest.fn((event: string, handler: Function) => {
  const handlers = mockEventListeners.get(event);
  if (handlers) {
    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
    }
  }
});

function simulateNetworkEvent(eventType: 'online' | 'offline'): void {
  const handlers = mockEventListeners.get(eventType) || [];
  handlers.forEach(handler => handler(new Event(eventType)));
}

describe('Event Persistence Integration Tests', () => {
  let persistenceManager: EventPersistenceManager;
  let eventBusManager: EventBusManager;
  let config: PersistenceConfig;

  beforeEach(() => {
    // Clear singleton instances
    (EventPersistenceManager as any).instance = null;
    
    // Clear mock storage
    mockStorage.clear();
    mockStorageUtils.get.mockClear();
    mockStorageUtils.set.mockClear();
    
    // Reset network status
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
    
    // Clear event listeners
    mockEventListeners.clear();
    
    config = {
      ...defaultPersistenceConfig,
      storageKey: 'test-persisted-events',
      maxEvents: 10,
      retryInterval: 100,
      maxRetries: 3,
      autoSync: false, // Manual control for testing
      batchSize: 3
    };

    persistenceManager = EventPersistenceManager.getInstance(config);
    eventBusManager = EventBusManager.getInstance();
  });

  afterEach(() => {
    eventBusManager.cleanup('test');
    mockStorage.clear();
    
    // Restore original event listeners
    window.addEventListener = originalAddEventListener;
    window.removeEventListener = originalRemoveEventListener;
  });

  describe('Event Persistence', () => {
    it('should persist events with all metadata', () => {
      const eventData = {
        investigation: {
          id: 'inv-123',
          userId: 'user-456',
          status: 'started'
        }
      };

      const eventId = persistenceManager.persistEvent(
        'auto:investigation:started',
        eventData,
        'autonomous-investigation',
        'high',
        5,
        new Date(Date.now() + 3600000) // 1 hour expiry
      );

      expect(eventId).toBeDefined();
      expect(eventId).toMatch(/^evt_\d+_[a-z0-9]+$/);

      const events = persistenceManager.getEvents();
      expect(events).toHaveLength(1);
      
      const persistedEvent = events[0];
      expect(persistedEvent).toMatchObject({
        id: eventId,
        event: 'auto:investigation:started',
        data: eventData,
        service: 'autonomous-investigation',
        priority: 'high',
        retryCount: 0,
        maxRetries: 5,
        synchronized: true // Online by default
      });
      
      expect(persistedEvent.timestamp).toBeInstanceOf(Date);
      expect(persistedEvent.expiry).toBeInstanceOf(Date);
    });

    it('should handle different event priorities', () => {
      const priorities: EventPriority[] = ['low', 'medium', 'high', 'critical'];
      
      priorities.forEach((priority, index) => {
        persistenceManager.persistEvent(
          'test:event',
          { data: `test-${index}` },
          'test-service',
          priority
        );
      });

      const events = persistenceManager.getEvents();
      expect(events).toHaveLength(4);
      
      priorities.forEach(priority => {
        const eventWithPriority = events.find(e => e.priority === priority);
        expect(eventWithPriority).toBeDefined();
      });
    });

    it('should save events to storage', () => {
      persistenceManager.persistEvent(
        'manual:investigation:started',
        { investigation: { id: 'manual-123' } },
        'manual-investigation'
      );

      expect(mockStorageUtils.set).toHaveBeenCalledWith(
        'test-persisted-events',
        expect.arrayContaining([
          expect.objectContaining({
            event: 'manual:investigation:started',
            service: 'manual-investigation'
          })
        ])
      );
    });
  });

  describe('Event Filtering and Retrieval', () => {
    beforeEach(() => {
      // Create test events with different properties
      const baseTime = Date.now();
      
      persistenceManager.persistEvent(
        'auto:investigation:started',
        { id: 'auto-1' },
        'autonomous-investigation',
        'high'
      );
      
      persistenceManager.persistEvent(
        'manual:investigation:started',
        { id: 'manual-1' },
        'manual-investigation',
        'medium'
      );
      
      persistenceManager.persistEvent(
        'agent:execution:started',
        { id: 'agent-1' },
        'agent-analytics',
        'low'
      );
      
      persistenceManager.persistEvent(
        'rag:query:executed',
        { id: 'rag-1' },
        'rag-intelligence',
        'critical'
      );
    });

    it('should filter events by service', () => {
      const filter: EventFilter = {
        services: ['autonomous-investigation', 'manual-investigation']
      };
      
      const filteredEvents = persistenceManager.getEvents(filter);
      expect(filteredEvents).toHaveLength(2);
      
      const services = filteredEvents.map(e => e.service);
      expect(services).toContain('autonomous-investigation');
      expect(services).toContain('manual-investigation');
      expect(services).not.toContain('agent-analytics');
      expect(services).not.toContain('rag-intelligence');
    });

    it('should filter events by priority', () => {
      const filter: EventFilter = {
        priorities: ['high', 'critical']
      };
      
      const filteredEvents = persistenceManager.getEvents(filter);
      expect(filteredEvents).toHaveLength(2);
      
      const priorities = filteredEvents.map(e => e.priority);
      expect(priorities).toContain('high');
      expect(priorities).toContain('critical');
      expect(priorities).not.toContain('medium');
      expect(priorities).not.toContain('low');
    });

    it('should filter events by synchronization status', () => {
      // Go offline and persist an event
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
      
      persistenceManager.persistEvent(
        'offline:event',
        { id: 'offline-1' },
        'test-service',
        'medium'
      );

      const pendingEvents = persistenceManager.getPendingEvents();
      expect(pendingEvents).toHaveLength(1);
      expect(pendingEvents[0].synchronized).toBe(false);
      
      const syncedFilter: EventFilter = { synchronized: true };
      const syncedEvents = persistenceManager.getEvents(syncedFilter);
      expect(syncedEvents).toHaveLength(4); // Previous events were online
    });

    it('should filter events by date range', () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 3600000);
      const oneHourFromNow = new Date(now.getTime() + 3600000);
      
      const filter: EventFilter = {
        dateRange: {
          start: oneHourAgo,
          end: oneHourFromNow
        }
      };
      
      const filteredEvents = persistenceManager.getEvents(filter);
      expect(filteredEvents).toHaveLength(4); // All events should be within range
      
      // Test with restrictive range
      const restrictiveFilter: EventFilter = {
        dateRange: {
          start: new Date(now.getTime() + 7200000), // 2 hours from now
          end: new Date(now.getTime() + 10800000)  // 3 hours from now
        }
      };
      
      const restrictedEvents = persistenceManager.getEvents(restrictiveFilter);
      expect(restrictedEvents).toHaveLength(0);
    });
  });

  describe('Offline and Synchronization', () => {
    it('should mark events as unsynchronized when offline', () => {
      // Go offline
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
      
      const eventId = persistenceManager.persistEvent(
        'offline:test:event',
        { data: 'offline test' },
        'test-service'
      );
      
      const events = persistenceManager.getEvents();
      const offlineEvent = events.find(e => e.id === eventId);
      
      expect(offlineEvent?.synchronized).toBe(false);
    });

    it('should queue critical events for synchronization when offline', () => {
      // Go offline
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
      
      // Trigger critical events that should be auto-persisted
      eventBusManager.emit('auto:investigation:started', {
        investigation: {
          id: 'critical-inv-1',
          userId: 'user-123',
          entityType: 'user_id' as const,
          status: 'initializing' as const,
          aiMode: 'balanced' as const,
          created: new Date()
        }
      });
      
      eventBusManager.emit('report:generated', {
        reportId: 'critical-report-1',
        type: 'investigation_summary',
        url: '/reports/critical-report-1.pdf'
      });
      
      const pendingEvents = persistenceManager.getPendingEvents();
      expect(pendingEvents.length).toBeGreaterThan(0);
      
      const criticalEvents = pendingEvents.filter(e => e.priority === 'high');
      expect(criticalEvents.length).toBeGreaterThan(0);
    });

    it('should synchronize events when coming back online', async () => {
      // Start offline
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
      
      // Persist offline events
      persistenceManager.persistEvent(
        'offline:event:1',
        { data: 'offline-1' },
        'test-service',
        'high'
      );
      
      persistenceManager.persistEvent(
        'offline:event:2',
        { data: 'offline-2' },
        'test-service',
        'medium'
      );
      
      expect(persistenceManager.getPendingEvents()).toHaveLength(2);
      
      // Mock successful synchronization
      const originalSyncBatch = (persistenceManager as any).synchronizeBatch;
      (persistenceManager as any).synchronizeBatch = jest.fn().mockResolvedValue({
        synchronized: 2,
        failed: 0,
        skipped: 0,
        errors: []
      });
      
      // Go back online
      Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
      
      const syncResult = await persistenceManager.synchronizeEvents();
      
      expect(syncResult.synchronized).toBe(2);
      expect(syncResult.failed).toBe(0);
      expect(persistenceManager.getPendingEvents()).toHaveLength(0);
      
      // Restore original method
      (persistenceManager as any).synchronizeBatch = originalSyncBatch;
    });

    it('should handle synchronization failures with retry logic', async () => {
      // Start offline and persist events
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
      
      persistenceManager.persistEvent(
        'failing:event',
        { data: 'will-fail' },
        'test-service',
        'medium'
      );
      
      // Mock failing synchronization
      (persistenceManager as any).simulateEventSync = jest.fn()
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockRejectedValueOnce(new Error('Server error'))
        .mockResolvedValueOnce(undefined); // Success on third try
      
      // Go online and synchronize
      Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
      
      const syncResult = await persistenceManager.synchronizeEvents();
      
      expect(syncResult.failed).toBeGreaterThan(0);
      expect(syncResult.errors.length).toBeGreaterThan(0);
      expect(syncResult.errors[0].error).toContain('Network timeout');
    });

    it('should prioritize events during synchronization', async () => {
      // Create events with different priorities offline
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
      
      persistenceManager.persistEvent('low:event', { data: 'low' }, 'test-service', 'low');
      persistenceManager.persistEvent('critical:event', { data: 'critical' }, 'test-service', 'critical');
      persistenceManager.persistEvent('medium:event', { data: 'medium' }, 'test-service', 'medium');
      persistenceManager.persistEvent('high:event', { data: 'high' }, 'test-service', 'high');
      
      const syncOrder: string[] = [];
      
      // Mock sync to track order
      (persistenceManager as any).simulateEventSync = jest.fn().mockImplementation((event: PersistedEvent) => {
        syncOrder.push(event.priority);
        return Promise.resolve();
      });
      
      // Go online and synchronize
      Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
      
      await persistenceManager.synchronizeEvents();
      
      // Verify critical events come first
      expect(syncOrder[0]).toBe('critical');
      expect(syncOrder[1]).toBe('high');
      expect(syncOrder[2]).toBe('medium');
      expect(syncOrder[3]).toBe('low');
    });
  });

  describe('Storage Management', () => {
    it('should enforce maximum event limit', () => {
      // Persist more events than the limit
      for (let i = 0; i < 15; i++) {
        persistenceManager.persistEvent(
          `test:event:${i}`,
          { index: i },
          'test-service'
        );
      }
      
      const events = persistenceManager.getEvents();
      expect(events).toHaveLength(config.maxEvents); // Should be 10
      
      // Should keep the most recent events
      const indices = events.map(e => e.data.index).sort((a, b) => a - b);
      expect(indices[0]).toBeGreaterThanOrEqual(5); // Older events removed
    });

    it('should clear expired events', () => {
      const now = Date.now();
      
      // Persist events with different expiry times
      persistenceManager.persistEvent(
        'expired:event',
        { data: 'expired' },
        'test-service',
        'medium',
        3,
        new Date(now - 1000) // Already expired
      );
      
      persistenceManager.persistEvent(
        'valid:event',
        { data: 'valid' },
        'test-service',
        'medium',
        3,
        new Date(now + 3600000) // Expires in 1 hour
      );
      
      const clearedCount = persistenceManager.clearExpiredEvents();
      expect(clearedCount).toBe(1);
      
      const remainingEvents = persistenceManager.getEvents();
      expect(remainingEvents).toHaveLength(1);
      expect(remainingEvents[0].data.data).toBe('valid');
    });

    it('should clear events by filter', () => {
      persistenceManager.persistEvent('event:1', { data: 'auto' }, 'autonomous-investigation', 'high');
      persistenceManager.persistEvent('event:2', { data: 'manual' }, 'manual-investigation', 'medium');
      persistenceManager.persistEvent('event:3', { data: 'agent' }, 'agent-analytics', 'low');
      
      const filter: EventFilter = {
        services: ['autonomous-investigation', 'manual-investigation']
      };
      
      const clearedCount = persistenceManager.clearEvents(filter);
      expect(clearedCount).toBe(2);
      
      const remainingEvents = persistenceManager.getEvents();
      expect(remainingEvents).toHaveLength(1);
      expect(remainingEvents[0].service).toBe('agent-analytics');
    });
  });

  describe('Statistics and Reporting', () => {
    beforeEach(() => {
      // Create diverse test data
      persistenceManager.persistEvent('auto:1', { data: 'auto-1' }, 'autonomous-investigation', 'high');
      persistenceManager.persistEvent('auto:2', { data: 'auto-2' }, 'autonomous-investigation', 'medium');
      persistenceManager.persistEvent('manual:1', { data: 'manual-1' }, 'manual-investigation', 'critical');
      persistenceManager.persistEvent('agent:1', { data: 'agent-1' }, 'agent-analytics', 'low');
      
      // Create some offline events
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
      persistenceManager.persistEvent('offline:1', { data: 'offline-1' }, 'visualization', 'medium');
      Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
    });

    it('should provide comprehensive statistics', () => {
      const stats = persistenceManager.getStats();
      
      expect(stats.totalEvents).toBe(5);
      expect(stats.pendingEvents).toBe(1); // The offline event
      expect(stats.synchronizedEvents).toBe(4);
      
      expect(stats.priorityBreakdown).toEqual({
        low: 1,
        medium: 2,
        high: 1,
        critical: 1
      });
      
      expect(stats.serviceBreakdown).toEqual({
        'autonomous-investigation': 2,
        'manual-investigation': 1,
        'agent-analytics': 1,
        'visualization': 1
      });
      
      expect(stats.oldestEvent).toBeInstanceOf(Date);
      expect(stats.newestEvent).toBeInstanceOf(Date);
      expect(stats.storageSize).toBeGreaterThan(0);
    });
  });

  describe('Import and Export', () => {
    beforeEach(() => {
      persistenceManager.persistEvent('export:1', { data: 'export-test-1' }, 'test-service', 'high');
      persistenceManager.persistEvent('export:2', { data: 'export-test-2' }, 'test-service', 'medium');
    });

    it('should export events as JSON', () => {
      const jsonExport = persistenceManager.exportEvents();
      const exportedEvents = JSON.parse(jsonExport);
      
      expect(exportedEvents).toHaveLength(2);
      expect(exportedEvents[0]).toMatchObject({
        event: 'export:1',
        data: { data: 'export-test-1' },
        service: 'test-service',
        priority: 'high'
      });
    });

    it('should export events as CSV', () => {
      const csvExport = persistenceManager.exportEvents(undefined, 'csv');
      const lines = csvExport.split('\n');
      
      expect(lines[0]).toBe('id,event,service,priority,timestamp,synchronized,retryCount');
      expect(lines).toHaveLength(3); // Header + 2 events
      
      const firstEventLine = lines[1].split(',');
      expect(firstEventLine[1]).toBe('export:1');
      expect(firstEventLine[2]).toBe('test-service');
      expect(firstEventLine[3]).toBe('high');
    });

    it('should import events from JSON', () => {
      const importData = [
        {
          id: 'import-1',
          event: 'import:test:1',
          data: { imported: true },
          timestamp: new Date().toISOString(),
          service: 'import-service',
          priority: 'medium',
          retryCount: 0,
          maxRetries: 3,
          synchronized: true
        }
      ];
      
      const importedCount = persistenceManager.importEvents(JSON.stringify(importData));
      expect(importedCount).toBe(1);
      
      const allEvents = persistenceManager.getEvents();
      const importedEvent = allEvents.find(e => e.id === 'import-1');
      expect(importedEvent).toBeDefined();
      expect(importedEvent?.data.imported).toBe(true);
    });
  });

  describe('Network State Changes', () => {
    it('should respond to online/offline events', () => {
      expect(mockEventListeners.has('online')).toBe(true);
      expect(mockEventListeners.has('offline')).toBe(true);
      
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      
      // Simulate going offline
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
      simulateNetworkEvent('offline');
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Gone offline - events will be queued')
      );
      
      // Simulate coming back online
      Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
      simulateNetworkEvent('online');
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Back online - starting event synchronization')
      );
      
      consoleLogSpy.mockRestore();
    });
  });

  describe('Performance and Memory Management', () => {
    it('should handle large volumes of events efficiently', () => {
      const eventCount = 1000;
      const startTime = Date.now();
      
      // Temporarily increase max events for this test
      (persistenceManager as any).config.maxEvents = 1500;
      
      for (let i = 0; i < eventCount; i++) {
        persistenceManager.persistEvent(
          `performance:test:${i}`,
          { index: i, data: `performance-data-${i}` },
          'performance-service',
          i % 2 === 0 ? 'high' : 'medium'
        );
      }
      
      const persistTime = Date.now() - startTime;
      
      // Test retrieval performance
      const retrievalStartTime = Date.now();
      const events = persistenceManager.getEvents();
      const retrievalTime = Date.now() - retrievalStartTime;
      
      expect(events).toHaveLength(eventCount);
      expect(persistTime).toBeLessThan(1000); // Should persist 1000 events in under 1 second
      expect(retrievalTime).toBeLessThan(100); // Should retrieve quickly
    });

    it('should handle concurrent persistence operations', async () => {
      const concurrentOperations = 50;
      const promises: Promise<string>[] = [];
      
      for (let i = 0; i < concurrentOperations; i++) {
        const promise = new Promise<string>(resolve => {
          const eventId = persistenceManager.persistEvent(
            `concurrent:${i}`,
            { index: i },
            'concurrent-service'
          );
          resolve(eventId);
        });
        promises.push(promise);
      }
      
      const eventIds = await Promise.all(promises);
      
      expect(eventIds).toHaveLength(concurrentOperations);
      expect(new Set(eventIds).size).toBe(concurrentOperations); // All IDs should be unique
      
      const events = persistenceManager.getEvents();
      expect(events).toHaveLength(concurrentOperations);
    });
  });

  describe('Utility Functions', () => {
    it('should check offline support correctly', () => {
      expect(EventPersistenceUtils.supportsOffline()).toBe(true);
    });

    it('should get network status', () => {
      expect(EventPersistenceUtils.isOnline()).toBe(true);
      
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
      expect(EventPersistenceUtils.isOnline()).toBe(false);
    });

    it('should estimate storage usage', () => {
      const usage = EventPersistenceUtils.getStorageUsage();
      
      expect(usage).toHaveProperty('used');
      expect(usage).toHaveProperty('available');
      expect(typeof usage.used).toBe('number');
      expect(typeof usage.available).toBe('number');
    });
  });
});
