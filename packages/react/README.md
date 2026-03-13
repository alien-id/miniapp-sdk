# @alien-id/miniapps-react

[![npm](https://img.shields.io/npm/v/@alien-id/miniapps-react.svg)](https://www.npmjs.com/package/@alien-id/miniapps-react)

React bindings for the Alien miniapp SDK. This is the primary interface for developers.

## Installation

```bash
bun add @alien-id/miniapps-react
```

## Quick Start

Wrap your app with `AlienProvider`:

```tsx
import { AlienProvider } from '@alien-id/miniapps-react';

function App() {
  return (
    <AlienProvider>
      <MyMiniapp />
    </AlienProvider>
  );
}
```

Provider options:

- `autoReady` - defaults to `true`; set to `false` if you want to call `ready()` manually
- `interceptLinks` - defaults to `true`; intercepts external links through the host app

## Hooks

### useAlien

Access the Alien context (auth token, contract version, bridge availability):

```tsx
import { useAlien } from '@alien-id/miniapps-react';

function MyComponent() {
  const { authToken, contractVersion, isBridgeAvailable } = useAlien();

  if (!isBridgeAvailable) {
    return <div>Please open in Alien App</div>;
  }

  return <div>Running v{contractVersion} in Alien App!</div>;
}
```

### useLaunchParams

Get all launch parameters injected by the host app:

```tsx
import { useLaunchParams } from '@alien-id/miniapps-react';

function MyComponent() {
  const launchParams = useLaunchParams();

  if (!launchParams) {
    return <div>Running outside Alien App</div>;
  }

  return <div>Platform: {launchParams.platform}</div>;
}
```

### useIsMethodSupported

Check if a method is supported by the host:

```tsx
import { useIsMethodSupported } from '@alien-id/miniapps-react';

function MyComponent() {
  const { supported, minVersion } = useIsMethodSupported('payment:request');

  if (!supported) {
    return <div>Please update to v{minVersion}</div>;
  }

  return <div>Feature available!</div>;
}
```

### useEvent

Subscribe to bridge events:

```tsx
import { useEvent } from '@alien-id/miniapps-react';

function MyComponent() {
  // Handle back button
  useEvent('host.back.button:clicked', () => {
    navigateBack();
  });

  return <div>Listening...</div>;
}
```

### useBackButton

Control the host app's native back button:

```tsx
import { useBackButton } from '@alien-id/miniapps-react';

function DetailScreen() {
  const { show, hide, isVisible, supported } = useBackButton(() => {
    navigate(-1);
  });

  useEffect(() => {
    show();
    return () => hide();
  }, [show, hide]);

  return <div>Detail content</div>;
}
```

The hook manages visibility, listens for clicks, and hides the button on unmount. Safe to pass inline callbacks — they're stabilized internally via ref.

### useMethod

Make bridge requests with state management and version checking:

```tsx
import { useMethod } from '@alien-id/miniapps-react';

function PayButton() {
  const { execute, data, error, isLoading, supported, reset } = useMethod(
    'payment:request',
    'payment:response',
  );

  if (!supported) {
    return <div>Payment not supported</div>;
  }

  const handlePay = async () => {
    const { error, data } = await execute({
      recipient: 'wallet-123',
      amount: '100',
      token: 'SOL',
      network: 'solana',
      invoice: 'inv-123',
    });
    if (error) {
      console.error(error);
      return;
    }
    console.log('Payment status:', data.status, data.txHash);
  };

  if (isLoading) return <button disabled>Processing...</button>;
  if (error) return <div>Error: {error.message}</div>;
  if (data) return <div>Status: {data.status}</div>;

  return <button onClick={handlePay}>Pay</button>;
}
```

Disable version checking if needed:

```tsx
const { execute } = useMethod('payment:request', 'payment:response', { checkVersion: false });
```

### usePayment

Handle payments with full state management:

```tsx
import { usePayment } from '@alien-id/miniapps-react';

function BuyButton({ orderId }: { orderId: string }) {
  const {
    pay,
    isLoading,
    isPaid,
    isCancelled,
    isFailed,
    txHash,
    errorCode,
    error,
    reset,
    supported,
  } = usePayment({
    timeout: 120000, // 2 minutes (default)
    onPaid: (txHash) => console.log('Paid!', txHash),
    onCancelled: () => console.log('Cancelled'),
    onFailed: (code, error) => console.log('Failed:', code, error),
    onStatusChange: (status) => console.log('Status:', status),
  });

  const handleBuy = () => pay({
    recipient: 'wallet-address',
    amount: '1000000',
    token: 'SOL',
    network: 'solana',
    invoice: orderId,
    item: { title: 'Premium Plan', iconUrl: 'https://example.com/icon.png', quantity: 1 },
  });

  if (isPaid) return <div>Thank you! TX: {txHash}</div>;

  return (
    <button onClick={handleBuy} disabled={isLoading}>
      {isLoading ? 'Processing...' : 'Buy Now'}
    </button>
  );
}
```

### useClipboard

Read and write text via the host app clipboard.

```tsx
import { useClipboard } from '@alien-id/miniapps-react';

function CopyButton() {
  const { writeText, readText, isReading, supported } = useClipboard();

  if (!supported) return null;

  return (
    <button
      onClick={async () => {
        writeText('Hello');
        console.log(await readText());
      }}
      disabled={isReading}
    >
      Copy
    </button>
  );
}
```

### useHaptic

Trigger native haptic feedback.

```tsx
import { useHaptic } from '@alien-id/miniapps-react';

function LikeButton() {
  const { impactOccurred, supported } = useHaptic();

  return (
    <button
      onClick={() => supported && impactOccurred('medium')}
    >
      Like
    </button>
  );
}
```

### useLinkInterceptor

Enable link interception manually when `AlienProvider` is configured
with `interceptLinks={false}`.

```tsx
import { useLinkInterceptor } from '@alien-id/miniapps-react';

function App() {
  useLinkInterceptor({ openMode: 'external' });
  return <a href="https://example.com">Open</a>;
}
```

## Re-exports

The package re-exports utilities from `@alien-id/miniapps-contract` and `@alien-id/miniapps-bridge`:

```tsx
import {
  // From @alien-id/miniapps-bridge
  createMockBridge,
  isAvailable,
  requestIfAvailable,
  send,
  sendIfAvailable,
  type RequestOptions,

  // From @alien-id/miniapps-contract
  isMethodSupported,
  getMethodMinVersion,
  type MethodName,
  type MethodPayload,
  type EventName,
  type EventPayload,
  type Version,
} from '@alien-id/miniapps-react';
```

## Error Handling

Bridge errors are caught and set in error state rather than throwing, allowing development outside Alien App.

### Error Types

```tsx
import {
  // React SDK errors
  ReactSDKError,           // Base class for React SDK errors
  MethodNotSupportedError, // Method not supported by contract version

  // Bridge errors (re-exported from @alien-id/miniapps-bridge)
  BridgeError,                  // Base class for bridge errors
  BridgeUnavailableError,       // Bridge not available
  BridgeTimeoutError,           // Request timed out
  BridgeWindowUnavailableError, // Window undefined (SSR)
} from '@alien-id/miniapps-react';
```

## Development Mode

When running outside Alien App, the SDK will:

- Warn that the bridge is not available (does not throw)
- Handle errors gracefully by setting error state
- Allow your app to render and function (though bridge communication won't work)
