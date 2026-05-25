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

Access the Alien context (auth token, Contract Version, Bridge availability):

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

### useCallable

Ask whether a Method is **Callable** right now — bridge present AND host's Contract Version supports the Method. Returns a discriminated union so you can render different UI for "open in Alien App" vs "update Alien App":

```tsx
import { useCallable } from '@alien-id/miniapps-react';

function MyComponent() {
  const result = useCallable('payment:request');

  if (result.callable) return <PayButton />;
  if (result.reason === 'no-bridge') return <OpenInAlienApp />;
  return <UpdateAlienApp needs={result.needs} has={result.has} />;
}
```

For the common "render or hide" case, every call hook (`useMethod`, `usePayment`, `useClipboard`, etc.) also exposes a `callable: boolean` shortcut field so you don't need to learn the union.

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

In **Dev Mode** (no Bridge present), `useEvent` does not throw, does not
warn per consumer, and quietly registers the listener against the bridge's
in-memory emitter — the listener simply never fires because no real
events arrive. The `AlienProvider` already prints a single
"Bridge is not available" notice at boot, so the dev signal is centralised
and your component tree doesn't get spammed per `useEvent` call.

### useBackButton

Control the host app's native back button:

```tsx
import { useEffect } from 'react';
import { useBackButton } from '@alien-id/miniapps-react';

function DetailScreen() {
  const { show, hide, isVisible, callable } = useBackButton(() => {
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

### useClose

Request the host app to close the miniapp:

```tsx
import { useClose } from '@alien-id/miniapps-react';

function CloseButton() {
  const { close, callable } = useClose();

  if (!callable) return null;

  return <button onClick={close}>Close</button>;
}
```

### useMethod

Make bridge requests with state management and version checking:

```tsx
import { useMethod } from '@alien-id/miniapps-react';

function PayButton() {
  const { execute, data, error, isLoading, callable, reset } = useMethod(
    'payment:request',
    'payment:response',
  );

  if (!callable) {
    return <div>Payment not available</div>;
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
    if (data) console.log('Payment status:', data.status, data.txHash);
  };

  if (isLoading) return <button disabled>Processing...</button>;
  if (error) return <div>Error: {error.message}</div>;
  if (data) return <div>Status: {data.status}</div>;

  return <button onClick={handlePay}>Pay</button>;
}
```

`execute()` never enters the loading state on a pre-call refusal: if the method isn't Callable it writes the typed error (`BridgeUnavailableError` or `BridgeMethodUnsupportedError`) directly to `error` state — no `isLoading: true` flicker.

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
    callable,
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
  const { writeText, readText, isReading, callable } = useClipboard();

  if (!callable) return null;

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
  const { impactOccurred, callable } = useHaptic();

  return (
    <button onClick={() => callable && impactOccurred('medium')}>Like</button>
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

Unlike the call hooks, `useLinkInterceptor` does **not** return a
`callable` field. Link interception is a declarative side effect that
the consumer enables once at the app boundary — not a per-call
operation — so there is nothing for `callable` to gate. The hook is a
safe no-op in Dev Mode and when the Bridge is absent.

## Re-exports

The package re-exports utilities from `@alien-id/miniapps-contract` and `@alien-id/miniapps-bridge`:

```tsx
import {
  // From @alien-id/miniapps-bridge
  callability,
  createMockBridge,
  request,
  send,
  type Callability,
  type RequestOptions,

  // From @alien-id/miniapps-contract
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
  // Bridge errors (re-exported from @alien-id/miniapps-bridge)
  BridgeError,                  // Base class for all bridge errors
  BridgeUnavailableError,       // Bridge not present (no host, SSR, browser tab)
  BridgeMethodUnsupportedError, // Host's Contract Version is below method's min
  BridgeTimeoutError,           // Request timed out
  BridgeBusyError,              // Re-entrant hook call while one is in flight
} from '@alien-id/miniapps-react';
```

`BridgeBusyError` is returned by `useMethod`, `useClipboard.readText`, and
`useNotificationPermission.requestPermission` when you re-invoke them
before the previous call resolves. The first call keeps running; the
second observes a typed error so callers can branch on
`instanceof BridgeBusyError` instead of guessing from a falsy result.

## Development Mode

When running outside Alien App, the SDK will:

- Warn that the bridge is not available (does not throw)
- Handle errors gracefully by setting error state
- Allow your app to render and function (though bridge communication won't work)

### Strict Track caveat

The package also re-exports the bridge's **Strict Track** functions
(`send` and `request`) for imperative callers. Unlike the React hooks,
these **do throw** in Dev Mode — `send('foo', ...)` raises
`BridgeUnavailableError` immediately when no bridge is injected, and
`request(...)` does the same. If you want the Dev Mode degradation
behaviour the hooks provide, use `send.ifAvailable` / `request.ifAvailable`
(the **Safe Track**), which return a `SafeResult` instead of throwing.
