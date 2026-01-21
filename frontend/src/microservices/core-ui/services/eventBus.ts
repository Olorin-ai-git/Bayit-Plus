// Event Bus for Core UI Service
export interface EventBusEvent {
  type: string;
  payload?: any;
  timestamp: number;
}

export interface EventListener {
  (event: EventBusEvent): void;
}

class EventBusService {
  private listeners: Map<string, EventListener[]> = new Map();

  on(eventType: string, listener: EventListener) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)!.push(listener);
  }

  off(eventType: string, listener: EventListener) {
    const eventListeners = this.listeners.get(eventType);
    if (eventListeners) {
      const index = eventListeners.indexOf(listener);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  emit(eventType: string, payload?: any) {
    const event: EventBusEvent = {
      type: eventType,
      payload,
      timestamp: Date.now()
    };

    const eventListeners = this.listeners.get(eventType);
    if (eventListeners) {
      eventListeners.forEach(listener => listener(event));
    }
  }

  removeAllListeners(eventType?: string) {
    if (eventType) {
      this.listeners.delete(eventType);
    } else {
      this.listeners.clear();
    }
  }
}

export const eventBus = new EventBusService();
export default eventBus;