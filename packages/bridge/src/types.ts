import type { EventName, EventPayload } from '@alm/contract';

/**
 * Type-safe event listener callback type
 */
export type EventListener<T extends EventName> = (
  payload: EventPayload<T>,
) => void;
