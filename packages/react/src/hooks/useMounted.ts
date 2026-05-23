import { useEffect, useRef } from 'react';

/**
 * Returns a ref that flips to `false` on unmount. Hooks awaiting bridge
 * responses use this to skip `setState` after their host returns when the
 * component has already gone away.
 *
 * StrictMode caveat: in development, React invokes the effect-cleanup
 * pair twice on mount. The first pass calls the cleanup, which sets
 * `current = false`, before the second pass sets it back to `true`. The
 * ref therefore briefly reads `false` between the two passes. This is
 * fine for the "skip setState after unmount" use case — by the time a
 * real bridge response arrives, React has finished its double-mount and
 * `current` reflects the true mount state. Do not use this ref for
 * decisions made synchronously inside render or inside another effect's
 * setup that fires immediately after mount.
 */
export function useMounted(): { readonly current: boolean } {
  const ref = useRef(true);
  useEffect(() => {
    ref.current = true;
    return () => {
      ref.current = false;
    };
  }, []);
  return ref;
}
