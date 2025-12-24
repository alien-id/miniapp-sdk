# @alien-id/react

React bindings for the Alien miniapp SDK. **This is the primary interface for developers** - the bridge package is used internally and you typically won't need to interact with it directly.

## Installation

```bash
bun add @alien-id/react
```

## Quick Start

Wrap your app with `AlienProvider`:

```tsx
import { AlienProvider } from '@alien-id/react';

function App() {
  return (
    <AlienProvider>
      <MyMiniapp />
    </AlienProvider>
  );
}
```

## Hooks

### useAuthToken

Get the auth token injected by the host app:

```tsx
import { useAuthToken } from '@alien-id/react';

function MyComponent() {
  const token = useAuthToken();

  if (!token) {
    return <div>Waiting for authentication...</div>;
  }

  return <div>Authenticated!</div>;
}
```

### useContractVersion

Get the contract version provided by the host app:

```tsx
import { useContractVersion } from '@alien-id/react';

function MyComponent() {
  const version = useContractVersion();

  return <div>Host version: {version ?? 'unknown'}</div>;
}
```

### useMethodSupported

Check if a method is supported by the host:

```tsx
import { useMethodSupported } from '@alien-id/react';

function MyComponent() {
  const { supported, minVersion } = useMethodSupported('auth.init:request');

  if (!supported) {
    return <div>Please update to v{minVersion}</div>;
  }

  return <div>Feature available!</div>;
}
```

### useEvent

Subscribe to bridge events:

```tsx
import { useEvent } from '@alien-id/react';

function MyComponent() {
  useEvent('auth.init:response.token', (payload) => {
    console.log('Received token:', payload.token);
  });

  return <div>Listening...</div>;
}
```

### useRequest

Make bridge requests with state management and version checking:

```tsx
import { useRequest } from '@alien-id/react';

function AuthButton() {
  const { execute, data, error, isLoading, supported } = useRequest(
    'auth.init:request',
    'auth.init:response.token',
  );

  if (!supported) {
    return <div>This feature is not available</div>;
  }

  const handleAuth = () => {
    execute({ appId: 'my-app', challenge: 'random' });
  };

  if (isLoading) return <button disabled>Loading...</button>;
  if (error) return <div>Error: {error.message}</div>;
  if (data) return <div>Token: {data.token}</div>;

  return <button onClick={handleAuth}>Authenticate</button>;
}
```

Disable version checking if needed:

```tsx
const { execute } = useRequest(
  'auth.init:request',
  'auth.init:response.token',
  { checkVersion: false }
);
```

### useBridgeAvailable

Check if the bridge is available (useful for conditional rendering):

```tsx
import { useBridgeAvailable } from '@alien-id/react';

function MyComponent() {
  const isAvailable = useBridgeAvailable();

  if (!isAvailable) {
    return <div>Please open in Alien App</div>;
  }

  return <div>Bridge is available!</div>;
}
```

### useAlien

Access the full Alien context:

```tsx
import { useAlien } from '@alien-id/react';

function MyComponent() {
  const { authToken, contractVersion, isBridgeAvailable } = useAlien();

  if (!isBridgeAvailable) {
    return <div>Please open in Alien App</div>;
  }

  return <div>Running v{contractVersion} in Alien App!</div>;
}
```

## Error Handling

The React SDK handles errors gracefully - bridge errors are caught and set in error state rather than throwing. This allows you to develop and test your miniapp outside of Alien App.

### Error Types

- **`ReactSDKError`**: Base class for all React SDK errors
  - **`MethodNotSupportedError`**: Thrown when a method is not supported by the current contract version

- **`BridgeError`**: Base class for all bridge errors (re-exported from `@alien-id/bridge`)
  - **`BridgeUnavailableError`**: Thrown when bridge is not available
  - **`BridgeTimeoutError`**: Thrown when a request times out
  - **`BridgeWindowUnavailableError`**: Thrown when window is undefined

### Example: Handling Errors

```tsx
import { useRequest, BridgeError } from '@alien-id/react';

function MyComponent() {
  const { execute, error } = useRequest('auth.init:request', 'auth.init:response.token');

  const handleClick = async () => {
    try {
      const result = await execute({ appId: 'my-app', challenge: 'random' });
      if (result) {
        console.log('Success:', result);
      }
    } catch (err) {
      // Errors are already handled by the hook and set in error state
      // This catch is optional - you can also check error state directly
      if (err instanceof BridgeError) {
        console.error('Bridge error:', err.message);
      }
    }
  };

  // Check error state directly
  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return <button onClick={handleClick}>Execute</button>;
}
```

## Development Mode

When running outside of Alien App (e.g., in a regular browser for development), the SDK will:
- **Warn** you that the bridge is not available (does not throw)
- Handle errors gracefully by setting error state
- Allow your app to render and function (though bridge communication won't work)

This makes it easy to develop and test your miniapp UI without needing Alien App running.
