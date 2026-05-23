# @alien-id/miniapps-bridge

[![npm](https://img.shields.io/npm/v/@alien-id/miniapps-bridge.svg)](https://www.npmjs.com/package/@alien-id/miniapps-bridge)

Type-safe bridge for miniapp (webview) to host app communication.

**Strict Mode**: Throws errors when bridge is unavailable. For React apps, use `@alien-id/miniapps-react` which handles errors gracefully.

## Installation

```bash
bun add @alien-id/miniapps-bridge
```

## API

### Events

```typescript
import { on, off, emit } from '@alien-id/miniapps-bridge';

// Subscribe to events from host app
const unsubscribe = on('payment:response', (payload) => {
  console.log(payload.status, payload.reqId);
});

// Unsubscribe
unsubscribe();
// or: off('payment:response', listener);

// Emit event locally (does NOT send to the host app — use `send()` for that).
// Useful for tests, mocks, and replaying host events into local listeners.
await emit('payment:response', { status: 'paid', txHash: '...', reqId: '...' });
```

### Request-Response

```typescript
import { request } from '@alien-id/miniapps-bridge';

// Send method and wait for response event
// Signature: request(method, params, responseEvent, options?)
const response = await request(
  'payment:request',
  { recipient: 'wallet-123', amount: '100', token: 'SOL', network: 'solana', invoice: 'inv-123' },
  'payment:response',
  { timeout: 5000, reqId: 'custom-id' } // optional
);
// Default timeout: 30s, reqId auto-generated if not provided
```

### Fire-and-Forget Methods

```typescript
import { send } from '@alien-id/miniapps-bridge';

// Send one-way method without waiting for response
send('app:ready', {});
```

### Safe execution

Use `send.ifAvailable(...)` and `request.ifAvailable(...)` when you want
bridge calls to return structured results instead of throwing.

```typescript
import { request, send } from '@alien-id/miniapps-bridge';

const hapticResult = send.ifAvailable('haptic:impact', { style: 'medium' });

const paymentResult = await request.ifAvailable(
  'payment:request',
  {
    recipient: 'wallet-123',
    amount: '100',
    token: 'SOL',
    network: 'solana',
    invoice: 'inv-123',
  },
  'payment:response',
);
```

### Callability

`callability()` is the single canonical answer to "can I call this Method right now?". It returns a discriminated union that tells you both *whether* the Method is Callable and *why* it isn't when it isn't.

```typescript
import { callability, isBridgeAvailable } from '@alien-id/miniapps-bridge';

if (isBridgeAvailable()) {
  // Bridge is ready (cheap, just checks `window.__miniAppsBridge__`)
}

const result = callability('payment:request', { version: '1.0.0' });
if (result.callable) {
  // Bridge present AND Host's Contract Version supports the Method
} else if (result.reason === 'no-bridge') {
  // Miniapp is running outside the Alien App (e.g. a browser tab)
} else {
  // Host is on `result.has`, this Method needs `result.needs`
  console.warn(`Update Alien App to v${result.needs} (host is v${result.has})`);
}
```

Strict Track (`send`/`request`) gates on `callability()` automatically and throws the matching `BridgeError` subclass. Safe Track (`send.ifAvailable`/`request.ifAvailable`) returns the same errors via `SafeResult.error`.

### Launch Params

Launch params are injected by the host app into window globals. The bridge provides utilities to retrieve and manage them.

```typescript
import {
  getLaunchParams,
  retrieveLaunchParams,
  parseLaunchParams,
  mockLaunchParamsForDev,
  clearMockLaunchParams,
} from '@alien-id/miniapps-bridge';

// Get launch params (returns undefined if unavailable)
const params = getLaunchParams();
// { authToken, contractVersion?, hostAppVersion?, platform?, safeAreaInsets?, startParam?, displayMode }

// Get launch params (throws LaunchParamsError if unavailable)
const params = retrieveLaunchParams();

// Parse from JSON string
const params = parseLaunchParams('{"authToken": "..."}');

// Mock for development (injects into window globals)
mockLaunchParamsForDev({
  authToken: 'dev-token',
  contractVersion: '1.0.0',
  platform: 'ios',
  displayMode: 'standard',
});

// Clear mocked params
clearMockLaunchParams();
```

### Link interception

Use `enableLinkInterceptor()` to route external links through the host
app's `link:open` method.

```typescript
import { enableLinkInterceptor } from '@alien-id/miniapps-bridge';

const disable = enableLinkInterceptor({ openMode: 'external' });

// Later
disable();
```

### Mock bridge

Use `createMockBridge` for browser development and tests.

```typescript
import { createMockBridge } from '@alien-id/miniapps-bridge/mock';

const mock = createMockBridge({
  handlers: {
    'payment:request': (payload) => ({
      status: 'paid',
      txHash: 'mock-tx-123',
      reqId: payload.reqId,
    }),
  },
});

mock.emitEvent('host.back.button:clicked', {});
mock.cleanup();
```

## Error Handling

All errors extend `BridgeError` for easy catching:

```typescript
import {
  BridgeError,
  BridgeMethodUnsupportedError,
  BridgeUnavailableError,
  BridgeTimeoutError,
  LaunchParamsError,
} from '@alien-id/miniapps-bridge';

try {
  const response = await request(
    'payment:request',
    { recipient: 'wallet-123', amount: '100', token: 'SOL', network: 'solana', invoice: 'inv-123' },
    'payment:response'
  );
} catch (error) {
  if (error instanceof BridgeTimeoutError) {
    console.error(`Timeout: ${error.method} after ${error.timeout}ms`);
  } else if (error instanceof BridgeMethodUnsupportedError) {
    console.error(
      `${error.method} requires v${error.minVersion} (host is v${error.contractVersion})`,
    );
  } else if (error instanceof BridgeUnavailableError) {
    console.error('Not running in Alien App');
  } else if (error instanceof BridgeError) {
    console.error('Bridge error:', error.message);
  }
}
```

| Error | When |
|-------|------|
| `BridgeError` | Base class for all bridge errors |
| `BridgeUnavailableError` | Bridge not present (SSR, browser tab, or `window.__miniAppsBridge__` not injected) |
| `BridgeMethodUnsupportedError` | Method requires a newer Contract Version (has `method`, `contractVersion`, `minVersion`) |
| `BridgeTimeoutError` | Request timed out (has `method` and `timeout` properties) |
| `LaunchParamsError` | Launch params unavailable |

## How It Works

- **Miniapp → Host**: `window.__miniAppsBridge__.postMessage()`
- **Host → Miniapp**: `window.addEventListener('message')`
- **Message Format**: `{ type: 'event' | 'method', name: string, payload: object }`

## Examples

See [`examples/vite-miniapp`](../../examples/vite-miniapp/) for a complete React + TypeScript example.
