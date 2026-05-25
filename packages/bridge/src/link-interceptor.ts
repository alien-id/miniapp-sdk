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

    // tagName check (not `instanceof HTMLAnchorElement`) so the interceptor
    // stays portable across DOM implementations — happy-dom and friends
    // ship their own anchor classes that don't satisfy the global one.
    let el = e.target as HTMLElement | null;
    while (el && el.tagName !== 'A') {
      el = el.parentElement;
    }
    const anchor = el as HTMLAnchorElement | null;
    if (!anchor?.href || anchor.hasAttribute('download')) return;

    let url: URL;
    try {
      url = new URL(anchor.href, window.location.href);
    } catch {
      return; // invalid URL — let the browser handle it
    }
    if (url.protocol === 'javascript:' || url.protocol === 'blob:') return;
    if (url.origin === window.location.origin) return;

    const result = send.ifAvailable('link:open', {
      url: url.href,
      openMode,
    });
    if (result.ok) {
      e.preventDefault();
    } else {
      // Pre-call refusal (e.g., host Contract Version below `link:open`).
      // Let the browser handle the navigation, but tell the dev why.
      console.warn(
        '[@alien-id/miniapps-bridge] link:open failed, falling back to browser:',
        result.error.message,
      );
    }
  }

  document.addEventListener('click', handler);
  return () => document.removeEventListener('click', handler);
}
