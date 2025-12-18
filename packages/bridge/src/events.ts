import type { EventName, EventPayloads } from '@alm/contract';
import { sendMessage, setupMessageListener } from './transport';

export type EventListener<T extends EventName = EventName> = (
  payload: EventPayloads[T],
) => void;

class EventEmitter {
  private listeners = new Map<EventName, Set<EventListener>>();

  constructor() {
    // Setup message listener to receive events from host app
    setupMessageListener((message) => {
      if (message.type === 'event') {
        this.emit(message.name as EventName, message.payload);
      }
    });
  }

  on<T extends EventName>(name: T, listener: EventListener<T>): () => void {
    if (!this.listeners.has(name)) {
      this.listeners.set(name, new Set());
    }
    this.listeners.get(name)?.add(listener as EventListener);

    return () => {
      this.off(name, listener);
    };
  }

  off<T extends EventName>(name: T, listener: EventListener<T>): void {
    const listeners = this.listeners.get(name);
    if (listeners) {
      listeners.delete(listener as EventListener);
    }
  }

  emit(name: EventName, payload: EventPayloads[EventName]): void {
    // Emit locally
    const listeners = this.listeners.get(name);
    if (listeners) {
      for (const listener of listeners) {
        (listener as EventListener)(payload);
      }
    }

    // Send to host app via postMessage
    sendMessage({
      type: 'event',
      name,
      payload,
    });
  }
}

const emitter = new EventEmitter();

export function on<T extends EventName>(
  name: T,
  listener: EventListener<T>,
): () => void {
  return emitter.on(name, listener);
}

export function off<T extends EventName>(
  name: T,
  listener: EventListener<T>,
): void {
  emitter.off(name, listener);
}

export function emit(name: EventName, payload: EventPayloads[EventName]): void {
  emitter.emit(name, payload);
}
