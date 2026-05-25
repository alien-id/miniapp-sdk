import { on } from '@alien-id/miniapps-bridge';
import type { EventName, EventPayload } from '@alien-id/miniapps-contract';
import { useEffect, useLayoutEffect, useRef } from 'react';

type EventCallback<E extends EventName> = (payload: EventPayload<E>) => void;

/**
 * Hook to subscribe to bridge events.
 * Automatically handles subscription cleanup on unmount.
 *
 * The bridge's `on()` is safe with or without the bridge present — it
 * registers the listener against the internal emitter, and the listener
 * simply never fires in Dev Mode. Don't gate on `useAlien().isBridgeAvailable`
 * here: that state flips false→true on provider hydration and triggered
 * a false-positive "Event listener will not be set up" warning on every
 * consumer's initial render. See auditor #5 N2.
 *
 * @param event - The event name to subscribe to.
 * @param callback - The callback to invoke when the event is received.
 *
 * @example
 * ```tsx
 * import { useEvent } from '@alien-id/miniapps-react';
 *
 * function MyComponent() {
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
  // Sync in a layout effect so the ref reflects the latest callback by
  // the time React yields after commit — see useBackButton.ts for the
  // detailed rationale (passive `useEffect` leaves a stale-callback
  // window for microtask-dispatched bridge events).
  useLayoutEffect(() => {
    callbackRef.current = callback;
  });

  useEffect(() => {
    const handler: EventCallback<E> = (payload) => {
      callbackRef.current(payload);
    };

    try {
      const unsubscribe = on(event, handler);
      return unsubscribe;
    } catch (error) {
      // `on()` is not expected to throw, but if a future change breaks
      // that, surface it as a dev-only warning instead of crashing the
      // consumer's render tree.
      console.warn(
        '[@alien-id/miniapps-react] Failed to set up event listener:',
        error instanceof Error ? error.message : String(error),
      );
      return;
    }
  }, [event]);
}
