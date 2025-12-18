import type {
  EventName,
  EventPayloads,
  MethodName,
  MethodPayloads,
} from '@alm/contract';
import Emittery from 'emittery';
import type { EventMessage, Message, MethodResponse } from './messages';
import { buildMethodRequest } from './utils/methods';

/**
 * Bridge class for type-safe communication
 * - Events can only be listened to (subscribed)
 * - Methods can only be emitted (called)
 */
export class Bridge {
  private emitter = new Emittery<EventPayloads>();
  private pendingRequests = new Map<
    string,
    {
      resolve: (value: unknown) => void;
      reject: (error: Error) => void;
    }
  >();

  /**
   * Subscribe to an event with type safety
   * Returns an unsubscribe function
   */
  on<T extends EventName>(
    name: T,
    listener: (payload: EventPayloads[T]) => void,
  ): () => void {
    this.emitter.on(name, listener);
    return () => {
      this.emitter.off(name, listener);
    };
  }

  /**
   * Subscribe to an event once with type safety
   * Returns a promise that resolves with the event data
   */
  once<T extends EventName>(name: T): Promise<EventPayloads[T]> {
    return this.emitter.once(name);
  }

  /**
   * Subscribe to all events with type safety
   * Returns an unsubscribe function
   */
  onAny(
    listener: (eventName: EventName, payload: EventPayloads[EventName]) => void,
  ): () => void {
    this.emitter.onAny(listener);
    return () => {
      this.emitter.offAny(listener);
    };
  }

  /**
   * Emit a method request
   * If req_id is provided in payload, waits for response. Otherwise, just emits the request.
   */
  async call<T extends MethodName>(
    name: T,
    payload: MethodPayloads[T],
  ): Promise<unknown> {
    const request = buildMethodRequest(name, payload);
    const reqId = payload.req_id;

    // If no req_id, just emit and return immediately
    if (!reqId) {
      this.sendMessage(request);
      return Promise.resolve(undefined);
    }

    // If req_id provided, wait for response
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(reqId, { resolve, reject });

      this.sendMessage(request);

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(reqId)) {
          this.pendingRequests.delete(reqId);
          reject(new Error(`Method request ${String(name)} timed out`));
        }
      }, 30000);
    });
  }

  /**
   * Process an incoming message
   * Consumes events and method responses
   */
  async processMessage(message: Message): Promise<void> {
    if (message.type === 'event') {
      const eventMessage = message as EventMessage<EventName>;
      await this.handleEvent(eventMessage.name, eventMessage.payload);
    } else if (message.type === 'response') {
      this.handleResponse(message);
    }
  }

  private async handleEvent<T extends EventName>(
    name: T,
    payload: EventPayloads[T],
  ): Promise<void> {
    await this.emitter.emit(name, payload);
  }

  private handleResponse(response: MethodResponse): void {
    if (!response.req_id) return;

    const pending = this.pendingRequests.get(response.req_id);
    if (pending) {
      this.pendingRequests.delete(response.req_id);
      if (response.error) {
        pending.reject(new Error(response.error));
      } else {
        pending.resolve(response.payload);
      }
    }
  }

  /**
   * Override this method to implement your actual message sending mechanism
   * (e.g., postMessage, WebSocket, etc.)
   */
  protected sendMessage(_message: Message): void {
    // Implement your actual sending mechanism here
    // console.log('Sending message:', message);
  }
}
