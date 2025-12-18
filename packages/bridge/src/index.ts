import type {
  EventName,
  EventPayload,
  EventPayloads,
  MethodName,
  MethodPayload,
} from '@alm/contract';

// Re-export types for convenience
export type {
  EventName,
  EventPayload,
  EventPayloads,
  MethodName,
  MethodPayload,
};

// Export bridge class
export { Bridge } from './bridge';
// Export messages
export type {
  EventMessage,
  Message,
  MethodRequest,
  MethodResponse,
} from './messages';
// Export method utilities
export { buildMethodRequest, parseMethodResponse } from './utils/methods';
