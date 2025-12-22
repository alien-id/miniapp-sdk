import type { EventName, EventPayload, Events } from '@alien-id/contract';
import Emittery from 'emittery';
import { sendMessage, setupMessageListener } from './transport';

export type EventListener<T extends EventName = EventName> = (
  payload: EventPayload<T>,
) => void;

// Create Emittery-compatible event map from Events type
type EmitteryEventMap = {
  [K in keyof Events]: Events[K]['payload'];
};

class BridgeEmitter extends Emittery<EmitteryEventMap> {
  constructor() {
    super();
    // Setup message listener to receive events from host app
    setupMessageListener((message) => {
      if (message.type === 'event') {
        void this.emit(message.name, message.payload);
      }
    });
  }
}

const emitter = new BridgeEmitter();

export function on<T extends EventName>(
  name: T,
  listener: EventListener<T>,
): () => void {
  emitter.on(name, listener);
  return () => {
    emitter.off(name, listener);
  };
}

export function off<T extends EventName>(
  name: T,
  listener: EventListener<T>,
): void {
  emitter.off(name, listener);
}

export async function emit<T extends EventName>(
  name: T,
  payload: EventPayload<T>,
): Promise<void> {
  // Emit locally (await to ensure listeners are called)
  await emitter.emit(name, payload);

  // Send to host app via postMessage
  sendMessage({
    type: 'event',
    name,
    payload,
  });
}
