import type { EventName, MethodName, MethodPayload } from '@alm/contract';
import type { Message, MethodResponse } from './messages';
import type { EventListener } from './types';
import { parseEvent } from './utils/events';
import { buildMethodRequest } from './utils/methods';

/**
 * Bridge class for type-safe communication
 * - Events can only be listened to (subscribed)
 * - Methods can only be emitted (called)
 */
export class Bridge {
  private eventListeners = new Map<
    EventName,
    Set<(payload: unknown) => void>
  >();
  private pendingRequests = new Map<
    string,
    {
      resolve: (value: unknown) => void;
      reject: (error: Error) => void;
    }
  >();

  /**
   * Subscribe to an event with type safety
   */
  on<T extends EventName>(name: T, listener: EventListener<T>): () => void {
    if (!this.eventListeners.has(name)) {
      this.eventListeners.set(name, new Set());
    }
    const listeners = this.eventListeners.get(name);
    if (listeners) {
      listeners.add(listener as (payload: unknown) => void);
    }

    // Return unsubscribe function
    return () => {
      const listeners = this.eventListeners.get(name);
      if (listeners) {
        listeners.delete(listener as (payload: unknown) => void);
        if (listeners.size === 0) {
          this.eventListeners.delete(name);
        }
      }
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
  processMessage(message: Message): void {
    if (message.type === 'event') {
      this.handleEvent(message.name, message.payload);
    } else if (message.type === 'response') {
      this.handleResponse(message);
    }
    // Method requests are ignored - methods can only be emitted, not handled
  }

  private handleEvent<T extends EventName>(name: T, payload: unknown): void {
    const listeners = this.eventListeners.get(name);
    if (listeners) {
      const parsedPayload = parseEvent(name, payload);
      for (const listener of listeners) {
        // Type assertion is safe here because we know the listener was registered with the correct type
        (listener as EventListener<T>)(parsedPayload);
      }
    }
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
