/**
<<<<<<< HEAD
 * Event System for Olorin Microservices
 * Centralized event management, real-time communication, and offline persistence
 */

// Core Event Bus
export { EventBusManager, useEventBus, eventBus } from './eventBus';
export {
  AutonomousInvestigationEvents,
  ManualInvestigationEvents,
  UIEvents
} from './eventBus';
export type {
  EventBusEvents,
  AutonomousInvestigation,
  ManualInvestigation,
  AIDecision,
  RiskFactor,
  Evidence,
  Collaborator,
  AgentExecution,
  AgentPerformanceMetrics,
  AgentAnomaly,
  RAGInsight,
  Location,
  User,
  Notification,
  ThemeConfig,
  DesignTokens,
  ComponentDefinition,
  ValidationError,
  ServiceHealth
} from './eventBus';

// WebSocket Manager
export { WebSocketManager, WebSocketServiceHelpers, createWebSocketManager } from './websocket-manager';
export { defaultWebSocketConfig } from './websocket-manager';
export type {
  WebSocketConfig,
  WebSocketMessage,
  WebSocketEvent,
  ServiceSubscription,
  ConnectionState
} from './websocket-manager';

// Service Adapters
export { ServiceAdapterRegistry, ServiceAdapters } from './service-adapters';
export {
  BaseServiceAdapter,
  AutonomousInvestigationAdapter,
  ManualInvestigationAdapter,
  AgentAnalyticsAdapter,
  RAGIntelligenceAdapter,
  VisualizationAdapter,
  ReportingAdapter,
  CoreUIAdapter,
  DesignSystemAdapter
} from './service-adapters';

// Event Persistence
export { EventPersistenceManager, createEventPersistenceManager, EventPersistenceUtils } from './event-persistence';
export { defaultPersistenceConfig } from './event-persistence';
export type {
  PersistedEvent,
  EventPriority,
  PersistenceConfig,
  SyncResult,
  SyncError,
  EventFilter
} from './event-persistence';

// Event Routing
export { EventRouter, createEventRouter, RoutingUtils } from './event-routing';
export type {
  RoutingRule,
  TargetEvent,
  RoutingCondition,
  ConditionOperator,
  EventTransform,
  AggregationConfig,
  RoutePriority,
  RoutingMetrics,
  RoutingError,
  RoutingContext
} from './event-routing';

// Event Bus Tests
export { EventBusTestRunner, createEventBusTestRunner, runQuickValidation } from './event-bus-tests';
export type {
  TestResult,
  TestSuite,
  EventBusTest
} from './event-bus-tests';

// Default export with all managers
export default {
  EventBusManager,
  WebSocketManager,
  ServiceAdapterRegistry,
  EventPersistenceManager,
  EventRouter,
  EventBusTestRunner
};
=======
 * Unified Event Bus - Main Export
 *
 * Provides centralized exports for all event bus functionality.
 * This file serves as the main entry point for the event bus system.
 */

// New microservices EventBus (recommended for new code)
export { EventBus, eventBus as microservicesEventBus } from './EventBus';
export type { EventHandler } from './EventBus';

// Legacy unified event bus (backward compatibility)
export { EventMap } from '../types/EventMap';
export { EventBusType, eventBusInstance, eventBus } from './EventBusCore';

// React context and provider
export { EventBusProvider, useEventBus } from './EventBusProvider';

// React hooks
export { useEventListener, useEventEmitter } from './hooks/eventBusHooks';

// Manager
export { EventBusManager } from './EventBusManager';

// Helper functions
export { UIEvents } from './helpers/UIEventHelpers';
export { InvestigationEvents } from './helpers/InvestigationEventHelpers';

// Default export (backward compatibility)
export { eventBusInstance as default } from './EventBusCore';
>>>>>>> 001-modify-analyzer-method
