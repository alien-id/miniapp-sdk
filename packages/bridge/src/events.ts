import type {
  EventName,
  EventPayload,
  Events,
} from '@alien-id/miniapps-contract';
import Emittery from 'emittery';
import { setupMessageListener } from './transport';

export type EventListener<T extends EventName = EventName> = (
  payload: EventPayload<T>,
) => void;

// Create Emittery-compatible event map from Events type
type EmitteryEventMap = {
  [K in keyof Events]: Events[K]['payload'];
};

let emitter: Emittery<EmitteryEventMap> | undefined;

function getEmitter(): Emittery<EmitteryEventMap> {
  if (!emitter) {
    emitter = new Emittery<EmitteryEventMap>();
    setupMessageListener((message) => {
      if (message.type === 'event') {
        void emitter?.emit(message.name, message.payload);
      }
    });
  }
  return emitter;
}

export function on<T extends EventName>(
  name: T,
  listener: EventListener<T>,
): () => void {
  getEmitter().on(name, listener);
  return () => {
    getEmitter().off(name, listener);
  };
}

export function off<T extends EventName>(
  name: T,
  listener: EventListener<T>,
): void {
  getEmitter().off(name, listener);
}

export async function emit<T extends EventName>(
  name: T,
  payload: EmitteryEventMap[T],
): Promise<void> {
  await getEmitter().emit(name, payload);
}
