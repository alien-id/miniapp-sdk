import { on } from '@alien-id/bridge';
import type { EventName, EventPayload } from '@alien-id/contract';
import { useEffect, useRef } from 'react';

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
 *   useEvent('auth.init:response.token', (payload) => {
 *     console.log('Received token:', payload.token);
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

  useEffect(() => {
    const handler: EventCallback<E> = (payload) => {
      callbackRef.current(payload);
    };

    const unsubscribe = on(event, handler);
    return unsubscribe;
  }, [event]);
}
