# @alien-id/bridge

A minimal, type-safe bridge for communication between the miniapp (webview) and the host app.

## How It Works

**Important**: This bridge is designed to work **only** in the **Alien App** environment. The host app must be Alien App, which provides the required bridge interface.

The bridge uses the native bridge to communicate between the webview and the host app:

- **Miniapp → Host**: Messages are sent via `window.__miniAppsBridge__.postMessage()` (provided by Alien App)
- **Host → Miniapp**: Messages are received via `window.addEventListener('message')`
- **Message Format**: `{ type: 'event' | 'method', name: string, payload: object }`

**Strict Behavior**: This package throws errors when the bridge is unavailable. If you're building a React app, use `@alien-id/react` instead, which handles errors gracefully and provides a better developer experience.

## API

### Subscribe to Events (from host app)

```typescript
import { on } from '@alien-id/bridge';

const unsubscribe = on('auth_data', (payload) => {
  console.log('Received from host:', payload);
});

// Later, unsubscribe
unsubscribe();
```

### Emit Events (to host app)

```typescript
import { emit } from '@alien-id/bridge';

emit('auth_data', { token: 'test-token', reqId: '123' });
```

### Send Request and Wait for Response

```typescript
import { request } from '@alien-id/bridge';

// Auto-generates reqId
const response = await request('get_auth_data', { token: 'test-token' });

// Or specify reqId
const response = await request(
  'get_auth_data',
  { token: 'test-token' },
  { reqId: 'custom-123' }
);

// With timeout
const response = await request(
  'get_auth_data',
  { token: 'test-token' },
  { timeout: 5000 }
);
```

## Host App Integration

**Note**: Alien App already provides the bridge interface. This section is for reference only.

The host app needs to:

1. **Listen for messages from webview**:

   ```javascript
   webview.addEventListener('message', (event) => {
     const { type, name, payload } = event.data;
     
     if (type === 'method') {
       // Handle method request
       handleMethod(name, payload);
     } else if (type === 'event') {
       // Handle event
       handleEvent(name, payload);
     }
   });
   ```

2. **Send events to webview**:

   ```javascript
   webview.postMessage({
     type: 'event',
     name: 'auth_data',
     payload: { token: '...', reqId: '...' }
   });
   ```

3. **Respond to method requests**:

   ```javascript
   function handleMethod(name, payload) {
     if (name === 'get_auth_data') {
       const { reqId } = payload;
       // Process request...
       webview.postMessage({
         type: 'event',
         name: 'auth_data',
         payload: { token: 'result', reqId }
       });
     }
   }
   ```

All types are provided by `@alien-id/contract` for full type safety.

## Error Handling

This package uses strict error handling - it throws errors when the bridge is unavailable. Error classes are organized hierarchically:

- **`BridgeError`**: Base class for all bridge-related errors
  - **`BridgeUnavailableError`**: Thrown when `window.__miniAppsBridge__` is not available
  - **`BridgeTimeoutError`**: Thrown when a request times out
  - **`BridgeWindowUnavailableError`**: Thrown when `window` is undefined

### Example: Handling Errors

```typescript
import { request, BridgeError, BridgeUnavailableError } from '@alien-id/bridge';

try {
  const response = await request('auth.init:request', params, 'auth.init:response.token');
} catch (error) {
  if (error instanceof BridgeUnavailableError) {
    console.error('Bridge is not available - are you running in Alien App?');
  } else if (error instanceof BridgeError) {
    console.error('Bridge error:', error.message);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

**Note**: For React applications, use `@alien-id/react` which handles these errors gracefully and provides a better developer experience.

## Examples

See the [`examples/`](../../examples/) directory for a complete miniapp example:

- **Miniapp**: [`examples/vite-miniapp`](../../examples/vite-miniapp/) - React + TypeScript example showing how to use the bridge in your miniapp

For host app integration, see the [Host App Implementation](../../docs/bridge.md#host-app-implementation) section in the bridge documentation.
