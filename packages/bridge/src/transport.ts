import type { EventName, EventPayloads, MethodName } from '@alm/contract';

export interface Message {
  type: 'event' | 'method';
  name: EventName | MethodName;
  payload: EventPayloads[EventName];
}

function getTarget(): Window | null {
  if (typeof window === 'undefined') return null;
  // In iframe/webview, use parent; otherwise use window
  return window.parent !== window ? window.parent : window;
}

export function sendMessage(message: Message): void {
  const target = getTarget();
  if (!target) {
    console.warn('[Bridge] Cannot send message: window is not available');
    return;
  }

  try {
    target.postMessage(message, '*');
  } catch (error) {
    console.error('[Bridge] Failed to send message:', error);
  }
}

export function setupMessageListener(
  handler: (message: Message) => void,
): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const messageHandler = (event: MessageEvent<Message>) => {
    // Verify message structure
    if (
      event.data &&
      typeof event.data === 'object' &&
      'type' in event.data &&
      'name' in event.data &&
      'payload' in event.data
    ) {
      handler(event.data);
    }
  };

  window.addEventListener('message', messageHandler);

  return () => {
    window.removeEventListener('message', messageHandler);
  };
}
