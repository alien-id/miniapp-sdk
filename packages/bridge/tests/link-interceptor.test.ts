import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { Window } from 'happy-dom';
import { enableLinkInterceptor } from '../src/link-interceptor';

/**
 * happy-dom types are a separate hierarchy from lib.dom.d.ts.
 * This helper isolates the only unavoidable cast at the boundary
 * where we assign happy-dom objects to globalThis.
 */
function setGlobal<T>(key: string, value: T) {
  Object.defineProperty(globalThis, key, {
    value,
    writable: true,
    configurable: true,
  });
}

function deleteGlobal(key: string) {
  Object.defineProperty(globalThis, key, {
    value: undefined,
    writable: true,
    configurable: true,
  });
}

let happyWindow: InstanceType<typeof Window>;
let bridgePostMessageCalls: string[];

beforeEach(() => {
  happyWindow = new Window({
    url: 'https://miniapp.example.com/page',
  });
  bridgePostMessageCalls = [];
  setGlobal('window', happyWindow);
  setGlobal('document', happyWindow.document);
});

afterEach(() => {
  happyWindow.close();
  deleteGlobal('window');
  deleteGlobal('document');
});

function setupBridge() {
  setGlobal(
    'window',
    Object.assign(happyWindow, {
      __miniAppsBridge__: {
        postMessage: (data: string) => bridgePostMessageCalls.push(data),
      },
    }),
  );
}

function createAnchor(href: string, attrs: Record<string, string> = {}) {
  const a = happyWindow.document.createElement('a');
  a.href = href;
  for (const [k, v] of Object.entries(attrs)) a.setAttribute(k, v);
  happyWindow.document.body.appendChild(a);
  return a;
}

function click(
  el: InstanceType<typeof happyWindow.HTMLElement>,
  opts: Record<string, unknown> = {},
) {
  el.dispatchEvent(
    new happyWindow.MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      ...opts,
    }),
  );
}

describe('enableLinkInterceptor', () => {
  test('returns noop when bridge is unavailable', () => {
    const cleanup = enableLinkInterceptor();
    expect(typeof cleanup).toBe('function');
    cleanup();
  });

  test('intercepts external link and sends link:open', () => {
    setupBridge();
    const cleanup = enableLinkInterceptor();

    click(createAnchor('https://external.com/page'));

    expect(bridgePostMessageCalls).toHaveLength(1);
    const msg = JSON.parse(bridgePostMessageCalls[0] ?? '');
    expect(msg).toEqual({
      type: 'method',
      name: 'link:open',
      payload: { url: 'https://external.com/page' },
    });
    cleanup();
  });

  test('does not intercept same-origin links', () => {
    setupBridge();
    const cleanup = enableLinkInterceptor();

    click(createAnchor('https://miniapp.example.com/other'));

    expect(bridgePostMessageCalls).toHaveLength(0);
    cleanup();
  });

  test('passes openMode option', () => {
    setupBridge();
    const cleanup = enableLinkInterceptor({ openMode: 'internal' });

    click(createAnchor('https://external.com'));

    const msg = JSON.parse(bridgePostMessageCalls[0] ?? '');
    expect(msg.payload.openMode).toBe('internal');
    cleanup();
  });

  test('skips modifier keys and non-left-click', () => {
    setupBridge();
    const cleanup = enableLinkInterceptor();
    const a = createAnchor('https://external.com');

    click(a, { metaKey: true });
    click(a, { ctrlKey: true });
    click(a, { shiftKey: true });
    click(a, { altKey: true });
    click(a, { button: 1 });
    click(a, { button: 2 });

    expect(bridgePostMessageCalls).toHaveLength(0);
    cleanup();
  });

  test('skips download links', () => {
    setupBridge();
    const cleanup = enableLinkInterceptor();

    click(createAnchor('https://external.com/file.pdf', { download: '' }));

    expect(bridgePostMessageCalls).toHaveLength(0);
    cleanup();
  });

  test('skips javascript: protocol', () => {
    setupBridge();
    const cleanup = enableLinkInterceptor();

    click(createAnchor('javascript:void(0)'));

    expect(bridgePostMessageCalls).toHaveLength(0);
    cleanup();
  });

  test('cleanup removes the listener', () => {
    setupBridge();
    const cleanup = enableLinkInterceptor();
    cleanup();

    click(createAnchor('https://external.com'));

    expect(bridgePostMessageCalls).toHaveLength(0);
  });

  test('intercepts mailto: links', () => {
    setupBridge();
    const cleanup = enableLinkInterceptor();

    click(createAnchor('mailto:test@example.com'));

    expect(bridgePostMessageCalls).toHaveLength(1);
    const msg = JSON.parse(bridgePostMessageCalls[0] ?? '');
    expect(msg.payload.url).toBe('mailto:test@example.com');
    cleanup();
  });
});
