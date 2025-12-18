// Types
export type {
  EventName,
  EventPayload,
  EventPayloads,
  MethodName,
  MethodPayload,
  MethodPayloads,
} from '@alm/contract';

export type { EventListener } from './events';
// Events - subscribe and emit
export { emit, off, on } from './events';
export type { RequestOptions } from './request';

// Request - send request and wait for response
export { request } from './request';
