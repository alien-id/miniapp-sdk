import type { Events } from '../definitions/events';

export type EventName = keyof Events;

export type EventPayload<E extends EventName> = Events[E]['payload'];
