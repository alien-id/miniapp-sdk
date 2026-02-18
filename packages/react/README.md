# @alien_org/react

[![npm](https://img.shields.io/npm/v/@alien_org/react.svg)](https://www.npmjs.com/package/@alien_org/react)

React bindings for the Alien miniapp SDK. This is the primary interface for developers.

## Installation

```bash
bun add @alien_org/react
```

## Quick Start

Wrap your app with `AlienProvider`:

```tsx
import { AlienProvider } from '@alien_org/react';

function App() {
  return (
    <AlienProvider>
      <MyMiniapp />
    </AlienProvider>
  );
}
```

## Hooks

### useAlien

Access the Alien context (auth token, contract version, bridge availability):

```tsx
import { useAlien } from '@alien_org/react';

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
import { useLaunchParams } from '@alien_org/react';

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
import { useIsMethodSupported } from '@alien_org/react';

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
import { useEvent } from '@alien_org/react';

function MyComponent() {
  // Handle miniapp close (cleanup before close)
  useEvent('miniapp:close', () => {
    saveState();
  });

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
import { useBackButton } from '@alien_org/react';

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
import { useMethod } from '@alien_org/react';

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
import { usePayment } from '@alien_org/react';

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

## Re-exports

The package re-exports utilities from `@alien_org/contract` and `@alien_org/bridge`:

```tsx
import {
  // From @alien_org/bridge
  send,
  type RequestOptions,

  // From @alien_org/contract
  isMethodSupported,
  getMethodMinVersion,
  type MethodName,
  type MethodPayload,
  type EventName,
  type EventPayload,
  type Version,
} from '@alien_org/react';
```

## Error Handling

Bridge errors are caught and set in error state rather than throwing, allowing development outside Alien App.

### Error Types

```tsx
import {
  // React SDK errors
  ReactSDKError,           // Base class for React SDK errors
  MethodNotSupportedError, // Method not supported by contract version

  // Bridge errors (re-exported from @alien_org/bridge)
  BridgeError,                  // Base class for bridge errors
  BridgeUnavailableError,       // Bridge not available
  BridgeTimeoutError,           // Request timed out
  BridgeWindowUnavailableError, // Window undefined (SSR)
} from '@alien_org/react';
```

## Development Mode

When running outside Alien App, the SDK will:

- Warn that the bridge is not available (does not throw)
- Handle errors gracefully by setting error state
- Allow your app to render and function (though bridge communication won't work)
