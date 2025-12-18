import type {
  EventName,
  EventPayload,
  MethodName,
  MethodPayload,
} from '@alm/contract';

// Re-export types for convenience
export type { EventName, EventPayload, MethodName, MethodPayload };

// Export bridge class
export { Bridge } from './bridge';
// Export messages
export type {
  EventMessage,
  Message,
  MethodRequest,
  MethodResponse,
} from './messages';
// Export types
export type { EventListener } from './types';
// Export event utilities
export { parseEvent } from './utils/events';
// Export method utilities
export { buildMethodRequest, parseMethodResponse } from './utils/methods';

