# Bridge Usage Examples

This directory contains examples showing how to use the bridge from both the miniapp and host app sides.

## Files

- **`miniapp.ts`** - Example code for the miniapp (runs in webview)
- **`host-app.ts`** - Example code for the host app (native app with webview)

## Quick Start

### Miniapp Side

```typescript
import { on, emit, request } from '@alien-id/bridge';

// Listen to events from host
on('auth_data', (payload) => {
  console.log('Received:', payload);
});

// Send event to host
emit('user_action', { action: 'click' });

// Request data from host
const response = await request('get_auth_data', { token: '...' });
```

### Host App Side

```typescript
// Listen for messages from webview
webview.addEventListener('message', (event) => {
  const { type, name, payload } = event.data;
  
  if (type === 'method') {
    // Handle method request
    if (name === 'get_auth_data') {
      const { req_id } = payload;
      // Process request...
      webview.postMessage({
        type: 'event',
        name: 'auth_data',
        payload: { token: '...', req_id }
      });
    }
  } else if (type === 'event') {
    // Handle event
    console.log('Event from miniapp:', name, payload);
  }
});

// Send event to webview
webview.postMessage({
  type: 'event',
  name: 'auth_data',
  payload: { token: '...' }
});
```

## Message Format

All messages follow this format:

```typescript
{
  type: 'event' | 'method',
  name: string,  // EventName or MethodName
  payload: object
}
```

### Method Requests

When miniapp calls `request('get_auth_data', params)`:
- Host receives: `{ type: 'method', name: 'get_auth_data', payload: { ...params, req_id: '...' } }`
- Host responds: `{ type: 'event', name: 'auth_data', payload: { ...response, req_id: '...' } }`

### Events

When miniapp calls `emit('user_action', data)`:
- Host receives: `{ type: 'event', name: 'user_action', payload: data }`

When host sends event:
- Miniapp receives via `on('event_name', handler)`

## Platform Integration

The host app examples show pseudocode. Adapt to your platform:

- **iOS**: Use `WKWebView` with `WKScriptMessageHandler`
- **Android**: Use `WebView` with `@JavascriptInterface`
- **React Native**: Use `react-native-webview` with `onMessage` and `postMessage`
- **Electron**: Use `webContents.sendMessage` and `ipcRenderer`

See `host-app.ts` for platform-specific examples.
