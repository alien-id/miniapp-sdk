# @alien-id/react

React bindings for the Alien miniapp SDK.

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

### useAlien

Access the full Alien context:

```tsx
import { useAlien } from '@alien-id/react';

function MyComponent() {
  const { authToken, contractVersion, isInAlienApp } = useAlien();

  if (!isInAlienApp) {
    return <div>Please open in Alien App</div>;
  }

  return <div>Running v{contractVersion} in Alien App!</div>;
}
```
