import { send } from './send';
import { isBridgeAvailable } from './utils';

export interface LinkInterceptorOptions {
  /**
   * Where to open intercepted links.
   * - `external` (default): System browser or app handler
   * - `internal`: Within the host app
   * @default 'external'
   */
  openMode?: 'external' | 'internal';
}

/**
 * Intercepts clicks on external links and routes them through `link:open`.
 *
 * Same-origin links pass through for normal in-app navigation.
 * Skips: modifier keys, non-left-click, download links, `javascript:`/`blob:` protocols.
 *
 * @returns Cleanup function to remove the interceptor.
 *
 * @example
 * ```ts
 * const disable = enableLinkInterceptor();
 * // Later: disable();
 * ```
 */
export function enableLinkInterceptor(
  options: LinkInterceptorOptions = {},
): () => void {
  if (typeof window === 'undefined' || !isBridgeAvailable()) {
    return () => {};
  }

  const { openMode } = options;

  function handler(e: MouseEvent) {
    if (e.defaultPrevented) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0)
      return;

    let el = e.target as HTMLElement | null;
    while (el && el.tagName !== 'A') {
      el = el.parentElement;
    }
    if (!el) return;

    const anchor = el as HTMLAnchorElement;
    if (!anchor.href || anchor.hasAttribute('download')) return;

    try {
      const url = new URL(anchor.href, window.location.href);
      if (url.protocol === 'javascript:' || url.protocol === 'blob:') return;
      if (url.origin === window.location.origin) return;

      send('link:open', { url: url.href, openMode });
      e.preventDefault();
    } catch {
      // Invalid URL or bridge unavailable — let the browser handle it
    }
  }

  document.addEventListener('click', handler);
  return () => document.removeEventListener('click', handler);
}
