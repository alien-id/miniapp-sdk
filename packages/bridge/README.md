# @alien_org/bridge

[![npm](https://img.shields.io/npm/v/@alien_org/bridge.svg)](https://www.npmjs.com/package/@alien_org/bridge)

Type-safe bridge for miniapp (webview) to host app communication.

**Strict Mode**: Throws errors when bridge is unavailable. For React apps, use `@alien_org/react` which handles errors gracefully.

## API

### Events

```typescript
import { on, off, emit } from '@alien_org/bridge';

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
import { request } from '@alien_org/bridge';

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
import { send } from '@alien_org/bridge';

// Send one-way method without waiting for response
send('app:ready', {});
```

### Bridge Availability

```typescript
import { isBridgeAvailable } from '@alien_org/bridge';

if (isBridgeAvailable()) {
  // Bridge is ready
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
} from '@alien_org/bridge';

// Get launch params (returns undefined if unavailable)
const params = getLaunchParams();
// { authToken, contractVersion?, hostAppVersion?, platform?, startParam? }

// Get launch params (throws LaunchParamsError if unavailable)
const params = retrieveLaunchParams();

// Parse from JSON string
const params = parseLaunchParams('{"authToken": "..."}');

// Mock for development (injects into window globals)
mockLaunchParamsForDev({
  authToken: 'dev-token',
  contractVersion: '0.0.1',
  platform: 'ios',
});

// Clear mocked params
clearMockLaunchParams();
```

## Error Handling

All errors extend `BridgeError` for easy catching:

```typescript
import {
  BridgeError,
  BridgeUnavailableError,
  BridgeWindowUnavailableError,
  BridgeTimeoutError,
  LaunchParamsError,
} from '@alien_org/bridge';

try {
  const response = await request(
    'payment:request',
    { recipient: 'wallet-123', amount: '100', token: 'SOL', network: 'solana', invoice: 'inv-123' },
    'payment:response'
  );
} catch (error) {
  if (error instanceof BridgeTimeoutError) {
    console.error(`Timeout: ${error.method} after ${error.timeout}ms`);
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
| `LaunchParamsError` | Launch params unavailable |

## How It Works

- **Miniapp → Host**: `window.__miniAppsBridge__.postMessage()`
- **Host → Miniapp**: `window.addEventListener('message')`
- **Message Format**: `{ type: 'event' | 'method', name: string, payload: object }`

## Examples

See [`examples/vite-miniapp`](../../examples/vite-miniapp/) for a complete React + TypeScript example.
