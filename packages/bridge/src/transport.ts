import type {
  EventName,
  EventPayload,
  MethodName,
  MethodPayload,
} from '@alien_org/contract';
import { BridgeUnavailableError } from './errors';

// Bridge interface for mobile/desktop clients
interface MiniAppsBridge {
  postMessage(data: string): void;
}

// Extend Window interface to include the bridge
declare global {
  interface Window {
    __miniAppsBridge__?: MiniAppsBridge;
  }
}

export type EventMessage<E extends EventName = EventName> = {
  type: 'event';
  name: E;
  payload: EventPayload<E>;
};

export type MethodMessage<M extends MethodName = MethodName> = {
  type: 'method';
  name: M;
  payload: MethodPayload<M>;
};

export type Message = EventMessage | MethodMessage;

/**
 * Gets the bridge instance if available.
 * Core function used internally by the bridge package.
 * @returns The bridge instance, or `undefined` if not available.
 */
export function getBridge(): MiniAppsBridge | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  const bridge = window.__miniAppsBridge__;
  if (!bridge || typeof bridge.postMessage !== 'function') {
    return undefined;
  }

  return bridge;
}

/**
 * Sends a message using the native bridge.
 * Throws errors if bridge is unavailable (strict behavior).
 */
export function sendMessage(message: Message): void {
  const bridge = getBridge();
  if (!bridge) {
    throw new BridgeUnavailableError();
  }

  bridge.postMessage(JSON.stringify(message));
}

/**
 * Type guard to validate if data is a valid Message.
 */
function isMessage(data: unknown): data is Message {
  return (
    data !== null &&
    typeof data === 'object' &&
    'type' in data &&
    'name' in data &&
    'payload' in data &&
    (data.type === 'event' || data.type === 'method')
  );
}

/**
 * Sets up a message listener that handles both stringified and object messages.
 * This works for all platforms (web, mobile, desktop).
 * Returns a no-op cleanup function if window is not available (e.g., SSR scenarios).
 */
export function setupMessageListener(
  handler: (message: Message) => void,
): () => void {
  if (typeof window === 'undefined') {
    // Return no-op cleanup function for SSR compatibility
    return () => {
      // No-op
    };
  }

  const messageHandler = (event: MessageEvent) => {
    let data: unknown = event.data;

    // Handle stringified messages (for old browsers or specific implementations)
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch {
        // Invalid JSON, ignore
        return;
      }
    }

    if (isMessage(data)) {
      handler(data);
    }
  };

  window.addEventListener('message', messageHandler);

  return () => {
    window.removeEventListener('message', messageHandler);
  };
}
