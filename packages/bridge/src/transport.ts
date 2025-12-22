import type {
  EventName,
  EventPayload,
  MethodName,
  MethodPayload,
} from '@alien-id/contract';

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

/**
 * Sends a message using the native bridge.
 * Logs warnings instead of throwing errors to allow dev mode without host app.
 */
export function sendMessage(message: Message): void {
  if (typeof window === 'undefined') {
    console.warn(
      '[Bridge] Cannot send message: window is not available. This SDK requires a browser environment.',
      message,
    );
    return;
  }

  // Use native bridge if available
  const bridge = window.__miniAppsBridge__;
  if (!bridge || typeof bridge.postMessage !== 'function') {
    console.warn(
      '[Bridge] Cannot send message: bridge is not available. Running in dev mode without host app?',
      'Message:',
      message,
    );
    return;
  }

  // Fallback to postMessage if bridge is not available
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
 * Returns a no-op cleanup function if window is not available (e.g., in test environments).
 */
export function setupMessageListener(
  handler: (message: Message) => void,
): () => void {
  if (typeof window === 'undefined') {
    return () => {
      console.warn(
        '[Bridge] Cannot setup message listener: window is not available. This SDK requires a browser environment.',
      );
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
