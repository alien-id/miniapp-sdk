import type {
  EventName,
  EventPayloads,
  MethodName,
  MethodPayloads,
} from '@alm/contract';
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

// TODO: Create a proper mapping between methods and their response events
// For now, we use req_id to match responses, so we listen to all events
// and filter by req_id. This is a temporary solution.
function getResponseEvent(method: MethodName): EventName {
  // Temporary: use the first available event (auth_data)
  // This should be replaced with a proper method -> event mapping
  return 'auth_data' as EventName;
}

export async function request(
  method: MethodName,
  params: MethodPayloads[MethodName],
  options: RequestOptions = {},
): Promise<EventPayloads[EventName]> {
  const reqId = options.reqId || generateReqId();
  const timeout = options.timeout || 30000;
  // TODO: Replace with proper method -> event mapping
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
