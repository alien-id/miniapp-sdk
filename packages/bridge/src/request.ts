import type {
  EventName,
  EventPayload,
  MethodName,
  MethodPayload,
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

export async function request<M extends MethodName, E extends EventName>(
  method: M,
  params: Omit<MethodPayload<M>, 'reqId'>,
  responseEvent: E,
  options: RequestOptions = {},
): Promise<EventPayload<E>> {
  const reqId = options.reqId || generateReqId();
  const timeout = options.timeout || 30000;

  // Add reqId to params
  const paramsWithReqId = {
    ...params,
    reqId,
  } as MethodPayload<M> & { reqId: string };

  return new Promise<EventPayload<E>>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error(`Request timeout: ${String(method)}`));
    }, timeout);

    const cleanup = () => {
      clearTimeout(timeoutId);
      off(responseEvent, handleResponse);
    };

    const handleResponse = (payload: EventPayload<E>) => {
      const response = payload as { reqId?: string };
      if (response.reqId === reqId) {
        cleanup();
        resolve(payload);
      }
    };

    on(responseEvent, handleResponse);

    // Send method request to host app via postMessage
    sendMessage({
      type: 'method',
      name: method,
      payload: paramsWithReqId as MethodPayload<MethodName>,
    });
  });
}
