/**
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
