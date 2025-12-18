import type { EventName, EventPayload } from '@alm/contract';

/**
 * Parse an event message with type safety
 */
export function parseEvent<T extends EventName>(
  _name: T,
  payload: unknown,
): EventPayload<T> {
  // Runtime validation can be added here if needed
  // For now, we rely on TypeScript types for compile-time safety
  return payload as EventPayload<T>;
}
