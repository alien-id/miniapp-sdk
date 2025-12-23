# @alien-id/bridge

A minimal, type-safe bridge for communication between the miniapp (webview) and the host app.

## How It Works

**Important**: This bridge is designed to work **only** in the **Alien App** environment. The host app must be Alien App, which provides the required bridge interface.

The bridge uses the native bridge to communicate between the webview and the host app:

- **Miniapp → Host**: Messages are sent via `window.__miniAppsBridge__.postMessage()` (provided by Alien App)
- **Host → Miniapp**: Messages are received via `window.addEventListener('message')`
- **Message Format**: `{ type: 'event' | 'method', name: string, payload: object }`

**Development Mode**: If the bridge is not available (e.g., running in a regular browser for development), the SDK will log warnings to the console but will not throw errors. This allows developers to test their miniapp code outside of Alien App. However, actual communication will not work - requests will timeout and events will not be received.

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

## Examples

See the [`examples/`](../../examples/) directory for a complete miniapp example:

- **Miniapp**: [`examples/vite-miniapp`](../../examples/vite-miniapp/) - React + TypeScript example showing how to use the bridge in your miniapp

For host app integration, see the [Host App Implementation](../../docs/bridge.md#host-app-implementation) section in the bridge documentation.
