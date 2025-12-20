import type {
  EventName,
  EventPayload,
  MethodName,
  MethodPayload,
} from '@alien-id/contract';

export interface Message {
  type: 'event' | 'method';
  name: EventName | MethodName;
  payload: EventPayload<EventName> | MethodPayload<MethodName>;
}

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
 * Detects if we're running in an iframe/webview context.
 */
function isInIframe(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.parent !== window;
  } catch {
    // Cross-origin iframe will throw, assume we're in iframe
    return true;
  }
}

/**
 * Sends a message using the appropriate transport method.
 * Priority: native bridge > postMessage (iframe) > postMessage (window)
 */
export function sendMessage(message: Message): void {
  if (typeof window === 'undefined') {
    console.warn('[Bridge] Cannot send message: window is not available');
    return;
  }

  try {
    // Priority 1: Use native bridge if available (mobile/desktop)
    const bridge = window.__miniAppsBridge__;
    if (bridge && typeof bridge.postMessage === 'function') {
      bridge.postMessage(JSON.stringify(message));
      return;
    }

    // Priority 2: Use postMessage (web/iframe)
    const target = isInIframe() ? window.parent : window;

    // For web clients, use postMessage directly (modern browsers support objects)
    // For maximum compatibility with old browsers, we could stringify, but
    // modern browsers (IE11+) support structured cloning
    target.postMessage(JSON.stringify(message), '*');
  } catch (error) {
    console.error('[Bridge] Failed to send message:', error);
  }
}

/**
 * Sets up a message listener that handles both stringified and object messages.
 * This works for all platforms (web, mobile, desktop).
 */
export function setupMessageListener(
  handler: (message: Message) => void,
): () => void {
  if (typeof window === 'undefined') {
    return () => {};
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

    // Verify message structure
    if (
      data &&
      typeof data === 'object' &&
      'type' in data &&
      'name' in data &&
      'payload' in data &&
      (data.type === 'event' || data.type === 'method')
    ) {
      handler(data as Message);
    }
  };

  window.addEventListener('message', messageHandler);

  return () => {
    window.removeEventListener('message', messageHandler);
  };
}
