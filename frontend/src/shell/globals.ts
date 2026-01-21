/**
 * Global declarations for Olorin Shell
 */

import { type Emitter } from 'mitt';
import { EventMap, EventBusManager } from '@shared/events/UnifiedEventBus';

declare global {
  interface Window {
    olorin: {
      eventBus: Emitter<EventMap>;
      eventBusManager: EventBusManager;
      services: Map<string, any>;
      registerService: (name: string, service: any) => void;
      getService: (name: string) => any;
      version: string;
      navigate?: (path: string) => void;
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