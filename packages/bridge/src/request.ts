import type {
  EventName,
  EventPayloads,
  MethodName,
  MethodPayloads,
} from '@alien-id/contract';
import { off, on } from './events';
import { sendMessage } from './transport';

export interface RequestOptions {
  reqId?: string;
  timeout?: number;
}

function generateReqId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

// TODO: Move it somewhere else
// Mapping between methods and their response events
// Each method request expects a response via the corresponding event
const METHOD_TO_RESPONSE_EVENT: Record<MethodName, EventName> = {
  get_auth_data: 'auth_data',
  ping: 'pong',
} as const;

function getResponseEvent(method: MethodName): EventName {
  const event = METHOD_TO_RESPONSE_EVENT[method];
  if (!event) {
    throw new Error(
      `No response event mapping found for method: ${String(method)}`,
    );
  }
  return event;
}

export async function request(
  method: MethodName,
  params: MethodPayloads[MethodName],
  options: RequestOptions = {},
): Promise<EventPayloads[EventName]> {
  const reqId = options.reqId || generateReqId();
  const timeout = options.timeout || 30000;
  const responseEvent = getResponseEvent(method);

  const paramsWithReqId = {
    ...params,
    req_id: reqId,
  } as MethodPayloads[MethodName];

  return new Promise<EventPayloads[EventName]>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error(`Request timeout: ${String(method)}`));
    }, timeout);

    const cleanup = () => {
      clearTimeout(timeoutId);
      off(responseEvent, handleResponse);
    };

    const handleResponse = (payload: EventPayloads[EventName]) => {
      const response = payload as { req_id?: string };
      if (response.req_id === reqId) {
        cleanup();
        resolve(payload);
      }
    };

    on(responseEvent, handleResponse);

    // Send method request to host app via postMessage
    sendMessage({
      type: 'method',
      name: method,
      payload: paramsWithReqId as unknown as EventPayloads[EventName],
    });
  });
}
