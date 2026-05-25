import { emit, type Message } from '@alien-id/miniapps-bridge';

/**
 * Test driver for the real `@alien-id/miniapps-bridge`. Installs a stand-in
 * `window.__miniAppsBridge__` whose `postMessage` looks up a per-method
 * handler and either dispatches a response event via `emit(...)` so
 * `request()` resolves, or throws synchronously so `request()` rejects with
 * the typed error.
 *
 * Replaces `mock.module('@alien-id/miniapps-bridge', ...)` so production
 * `instanceof BridgeError` checks see the real classes — no shape mirrors.
 */
type Reply =
  | { kind: 'event'; name: string; payload: Record<string, unknown> }
  | { kind: 'throw'; error: Error }
  | { kind: 'noop' };

type Handler = (payload: Record<string, unknown>) => Reply;

export interface BridgeCall {
  method: string;
  payload: Record<string, unknown>;
}

const STORAGE_KEY = 'alien/launchParams';

export class BridgeDriver {
  /** Every method message the SUT has sent, in order. */
  readonly calls: BridgeCall[] = [];
  #handlers = new Map<string, Handler[]>();

  /**
   * Ensure `window` exists so the SUT's `typeof window === 'undefined'` SSR
   * short-circuit doesn't fire. Bun's test runtime doesn't define it by
   * default. Idempotent — call from `beforeEach` or any test that needs a
   * browser-ish global, with or without a bridge.
   */
  setupWindow(): void {
    const w = globalThis as unknown as { window?: unknown };
    if (!w.window) w.window = globalThis;
  }

  install(opts: { contractVersion?: string } = {}): void {
    this.setupWindow();
    const g = globalThis as unknown as Record<string, unknown>;
    g.__miniAppsBridge__ = {
      postMessage: (raw: string) => this.#dispatch(raw),
    };
    g.__ALIEN_AUTH_TOKEN__ = 'test-token';
    if (opts.contractVersion !== undefined) {
      g.__ALIEN_CONTRACT_VERSION__ = opts.contractVersion;
    }
  }

  uninstall(): void {
    const g = globalThis as unknown as Record<string, unknown>;
    delete g.__miniAppsBridge__;
    delete g.__ALIEN_AUTH_TOKEN__;
    delete g.__ALIEN_CONTRACT_VERSION__;
    // Launch params are cached in sessionStorage; clear so the next test
    // doesn't see stale params from a previous install().
    try {
      (globalThis as { sessionStorage?: Storage }).sessionStorage?.removeItem(
        STORAGE_KEY,
      );
    } catch {
      // No sessionStorage in this env — nothing to clear.
    }
    this.calls.length = 0;
    this.#handlers.clear();
  }

  /** Queue a successful response event for the next call to `method`. FIFO. */
  reply(
    method: string,
    event: string,
    payload: Record<string, unknown> = {},
  ): void {
    this.#enqueue(method, () => ({ kind: 'event', name: event, payload }));
  }

  /** Queue an error thrown from `postMessage` so `request()` rejects. */
  fail(method: string, error: Error): void {
    this.#enqueue(method, () => ({ kind: 'throw', error }));
  }

  /** Queue a silent acknowledgement — for fire-and-forget `send` calls. */
  accept(method: string): void {
    this.#enqueue(method, () => ({ kind: 'noop' }));
  }

  #enqueue(method: string, handler: Handler): void {
    const queue = this.#handlers.get(method) ?? [];
    queue.push(handler);
    this.#handlers.set(method, queue);
  }

  #dispatch(raw: string): void {
    const message = JSON.parse(raw) as Message;
    if (message.type !== 'method') return;

    const payload = message.payload as Record<string, unknown>;
    this.calls.push({ method: message.name, payload });

    const handler = this.#handlers.get(message.name)?.shift();
    if (!handler) {
      throw new Error(`BridgeDriver: no handler queued for "${message.name}"`);
    }

    const reply = handler(payload);
    if (reply.kind === 'throw') throw reply.error;
    if (reply.kind === 'noop') return;

    const reqId = payload.reqId as string;
    // `emit` is async; `request()`'s response handler resolves on the next
    // microtask. Fire-and-forget — the awaited `request()` is what gates
    // the test, not this emit.
    void emit(reply.name as never, { ...reply.payload, reqId } as never);
  }
}
