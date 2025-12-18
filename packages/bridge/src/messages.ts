import type {
  EventName,
  EventPayloads,
  MethodName,
  MethodPayloads,
} from '@alm/contract';

// Message types - using only contract types, no extensions
export interface EventMessage<T extends EventName = EventName> {
  type: 'event';
  name: T;
  payload: EventPayloads[T];
}

export interface MethodRequest<T extends MethodName = MethodName> {
  type: 'method';
  name: T;
  payload: MethodPayloads[T];
}

export interface MethodResponse<T extends MethodName = MethodName> {
  type: 'response';
  name: T;
  req_id?: string;
  payload: unknown; // Response payload type can be defined later
  error?: string;
}

export type Message = EventMessage | MethodRequest | MethodResponse;
