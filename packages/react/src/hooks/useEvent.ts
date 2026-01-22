import { on } from '@alien-id/bridge';
import type { EventName, EventPayload } from '@alien-id/contract';
import { useEffect, useRef } from 'react';
import { useAlien } from './useAlien';

type EventCallback<E extends EventName> = (payload: EventPayload<E>) => void;

/**
 * Hook to subscribe to bridge events.
 * Automatically handles subscription cleanup on unmount.
 *
 * @param event - The event name to subscribe to.
 * @param callback - The callback to invoke when the event is received.
 *
 * @example
 * ```tsx
 * import { useEvent } from '@alien-id/react';
 *
 * function MyComponent() {
 *   useEvent('miniapp:close', () => {
 *     // Cleanup before miniapp closes
 *     saveState();
 *   });
 *
 *   useEvent('host.back.button:clicked', () => {
 *     // Handle back button press
 *     navigateBack();
 *   });
 *
 *   return <div>Listening for events...</div>;
 * }
 * ```
 */
export function useEvent<E extends EventName>(
  event: E,
  callback: EventCallback<E>,
): void {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;
  const { isBridgeAvailable } = useAlien();

  useEffect(() => {
    // Return early if bridge is not available
    if (!isBridgeAvailable) {
      console.warn(
        '[@alien-id/react] Bridge is not available. Event listener will not be set up. Running in dev mode?',
      );
      return;
    }

    const handler: EventCallback<E> = (payload) => {
      callbackRef.current(payload);
    };

    try {
      const unsubscribe = on(event, handler);
      return unsubscribe;
    } catch (error) {
      // Handle any errors gracefully (shouldn't happen with on(), but just in case)
      console.warn(
        '[@alien-id/react] Failed to set up event listener:',
        error instanceof Error ? error.message : String(error),
      );
      return;
    }
  }, [event, isBridgeAvailable]);
}
