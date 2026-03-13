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

// Emit event to host app (also triggers local listeners)
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

Use the safe variants when you want bridge calls to return structured
results instead of throwing.

```typescript
import {
  requestIfAvailable,
  sendIfAvailable,
} from '@alien-id/miniapps-bridge';

const hapticResult = sendIfAvailable(
  'haptic:impact',
  { style: 'medium' },
);

const paymentResult = await requestIfAvailable(
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

The same helpers are also available as `send.ifAvailable(...)` and
`request.ifAvailable(...)`.

### Bridge Availability

```typescript
import {
  isAvailable,
  isBridgeAvailable,
} from '@alien-id/miniapps-bridge';

if (isBridgeAvailable()) {
  // Bridge is ready
}

if (isAvailable('payment:request', { version: '1.0.0' })) {
  // Method is supported by the current host version
}
```

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
  BridgeWindowUnavailableError,
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
    console.error(`Unsupported method: ${error.method}`);
  } else if (error instanceof BridgeUnavailableError) {
    console.error('Not running in Alien App');
  } else if (error instanceof BridgeWindowUnavailableError) {
    console.error('Window unavailable (SSR?)');
  } else if (error instanceof BridgeError) {
    console.error('Bridge error:', error.message);
  }
}
```

| Error | When |
|-------|------|
| `BridgeError` | Base class for all bridge errors |
| `BridgeUnavailableError` | `window.__miniAppsBridge__` not found |
| `BridgeWindowUnavailableError` | `window` is undefined (SSR) |
| `BridgeTimeoutError` | Request timed out (has `method` and `timeout` properties) |
| `BridgeMethodUnsupportedError` | Method requires a newer contract version |
| `LaunchParamsError` | Launch params unavailable |

## How It Works

- **Miniapp → Host**: `window.__miniAppsBridge__.postMessage()`
- **Host → Miniapp**: `window.addEventListener('message')`
- **Message Format**: `{ type: 'event' | 'method', name: string, payload: object }`

## Examples

See [`examples/vite-miniapp`](../../examples/vite-miniapp/) for a complete React + TypeScript example.
