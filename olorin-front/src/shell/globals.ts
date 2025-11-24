/**
 * Global declarations for Olorin Shell
 */

import { type Emitter } from 'mitt';
<<<<<<< HEAD
import { EventBusEvents, EventBusManager } from '@shared/events/eventBus';
=======
import { EventMap, EventBusManager } from '@shared/events/UnifiedEventBus';
>>>>>>> 001-modify-analyzer-method

declare global {
  interface Window {
    olorin: {
<<<<<<< HEAD
      eventBus: Emitter<EventBusEvents>;
=======
      eventBus: Emitter<EventMap>;
>>>>>>> 001-modify-analyzer-method
      eventBusManager: EventBusManager;
      services: Map<string, any>;
      registerService: (name: string, service: any) => void;
      getService: (name: string) => any;
      version: string;
<<<<<<< HEAD
=======
      navigate?: (path: string) => void;
>>>>>>> 001-modify-analyzer-method
    };
  }
}

// Initialize global olorin object
if (typeof window !== 'undefined') {
  window.olorin = {
    eventBus: {} as any, // Will be set by App.tsx
    eventBusManager: {} as any, // Will be set by App.tsx
    services: new Map(),
    registerService: (name: string, service: any) => {
      window.olorin.services.set(name, service);
    },
    getService: (name: string) => {
      return window.olorin.services.get(name);
    },
    version: '1.0.0'
  };
}

export {};