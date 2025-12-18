import type {
  EventName,
  EventPayload,
  MethodName,
  MethodPayload,
} from '@alm/contract';

// Message types
export interface EventMessage<T extends EventName = EventName> {
  type: 'event';
  name: T;
  payload: EventPayload<T>;
}

export interface MethodRequest<T extends MethodName = MethodName> {
  type: 'method';
  name: T;
  req_id: string;
  payload: MethodPayload<T>;
}

export interface MethodResponse<T extends MethodName = MethodName> {
  type: 'response';
  name: T;
  req_id: string;
  payload: unknown; // Response payload type can be defined later
  error?: string;
}

export type Message = EventMessage | MethodRequest | MethodResponse;
