import type {
  EventName,
  EventPayloads,
  MethodName,
  MethodPayload,
} from '@alm/contract';
import Emittery from 'emittery';
import type { Message, MethodResponse } from './messages';
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
   * Send a method request and wait for response
   * Methods can only be emitted (called), not handled
   */
  async call<T extends MethodName>(
    name: T,
    payload: MethodPayload<T>,
  ): Promise<unknown> {
    const reqId = this.generateRequestId();
    const request = buildMethodRequest(name, payload, reqId);

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(reqId, { resolve, reject });

      // Send the request (implement your actual sending mechanism here)
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
   * Only processes events (for listening) and responses (for method calls)
   * Method requests are not handled - methods can only be emitted
   */
  async processMessage(message: Message): Promise<void> {
    if (message.type === 'event') {
      await this.handleEvent(message.name, message.payload);
    } else if (message.type === 'response') {
      this.handleResponse(message);
    }
    // Method requests are ignored - methods can only be emitted, not handled
  }

  private async handleEvent<T extends EventName>(
    name: T,
    payload: EventPayloads[T],
  ): Promise<void> {
    await this.emitter.emit(name, payload);
  }

  private handleResponse(response: MethodResponse): void {
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

  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
