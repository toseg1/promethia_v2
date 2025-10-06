// Simple event emitter to notify when the backend becomes unreachable
// Allows non-React modules (like services/apiClient) to trigger a fresh wake-up check

type Listener = () => void;

type EventMap = {
  backendUnreachable: Set<Listener>;
};

class BackendWakeupEmitter {
  private events: EventMap = {
    backendUnreachable: new Set<Listener>(),
  };

  subscribe(event: keyof EventMap, listener: Listener): () => void {
    const listeners = this.events[event];
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  emit(event: keyof EventMap): void {
    const listeners = this.events[event];
    listeners.forEach(listener => listener());
  }
}

export const backendWakeupEmitter = new BackendWakeupEmitter();

export function notifyBackendUnreachable(): void {
  backendWakeupEmitter.emit('backendUnreachable');
}
