# @alien-id/miniapps-contract

[![npm](https://img.shields.io/npm/v/@alien-id/miniapps-contract.svg)](https://www.npmjs.com/package/@alien-id/miniapps-contract)

Type definitions and version utilities for miniapp-host communication.

## Installation

```bash
bun add @alien-id/miniapps-contract
```

## Exports

### Types

```typescript
import type {
  // Method types
  Methods,                        // Interface of all methods
  MethodName,                     // Union of method names
  MethodPayload,                  // Payload type for a method
  CreateMethodPayload,            // Helper for defining methods
  MethodNameWithVersionedPayload, // Methods with versioned payloads
  MethodVersionedPayload,         // Versioned payload for a method
  MethodResponseEvent,            // Response event for a request method
  MethodResponseEvents,           // Exhaustive method-to-event map
  RequestMethodName,              // Subset of MethodName that expects a response

  // Event types
  Events,               // Interface of all events
  EventName,            // Union of event names
  EventPayload,         // Payload type for an event
  CreateEventPayload,   // Helper for defining events

  // Launch parameters
  LaunchParams,         // Host-injected params (authToken, contractVersion, etc.)
  Platform,             // 'ios' | 'android'
  DisplayMode,          // 'standard' | 'fullscreen' | 'immersive'
  SafeAreaInsets,       // Host-reported safe-area insets

  // Domain literals
  HapticImpactStyle,            // 'light' | 'medium' | 'heavy' | 'soft' | 'rigid'
  HapticNotificationType,       // 'success' | 'warning' | 'error'
  NotificationPermissionStatus, // 'granted' | 'denied' | 'rate_limited'
  PaymentErrorCode,             // Pre-broadcast payment errors
  PaymentTestScenario,          // Test-mode simulation scenarios
  PaymentWebhookStatus,         // On-chain payment webhook status
  SolanaChain,                  // 'solana:mainnet' | 'solana:devnet' | 'solana:testnet'
  SolanaCommitment,             // 'processed' | 'confirmed' | 'finalized'
  WalletSolanaErrorCode,        // WalletConnect-compatible error codes

  // Utilities
  Version,              // Semantic version string type
} from '@alien-id/miniapps-contract';
```

### Constants

```typescript
import {
  DISPLAY_MODES,
  PLATFORMS,
  WALLET_ERROR,
  releases,
} from '@alien-id/miniapps-contract';

PLATFORMS       // ['ios', 'android']
DISPLAY_MODES   // ['standard', 'fullscreen', 'immersive']
WALLET_ERROR    // Named WalletConnect-compatible Solana wallet error codes
releases        // Record<Version, MethodName[]> — version to methods mapping
```

### Version Utilities

```typescript
import {
  isMethodSupported,
  getMethodMinVersion,
  getReleaseVersion,
} from '@alien-id/miniapps-contract';

// Check if method is supported in a version
isMethodSupported('app:ready', '0.0.9');         // true
isMethodSupported('payment:request', '0.0.9');   // false

// Get minimum version that supports a method
getMethodMinVersion('app:ready');         // '0.0.9'
getMethodMinVersion('payment:request');   // '0.1.1'

// Get version where a method was introduced
getReleaseVersion('app:ready');           // '0.0.9'
```

## Available Methods

| Method | Since | Description |
|--------|-------|-------------|
| `app:ready` | 0.0.9 | Notify host that miniapp is ready |
| `payment:request` | 0.1.1 | Request payment |
| `clipboard:write` | 0.1.1 | Write text to clipboard |
| `clipboard:read` | 0.1.1 | Read text from clipboard |
| `link:open` | 0.1.3 | Open a URL |
| `haptic:impact` | 0.2.4 | Trigger haptic impact feedback |
| `haptic:notification` | 0.2.4 | Trigger haptic notification feedback |
| `haptic:selection` | 0.2.4 | Trigger haptic selection feedback |
| `wallet.solana:connect` | 1.0.0 | Request Solana wallet connection |
| `wallet.solana:disconnect` | 1.0.0 | Disconnect from Solana wallet |
| `wallet.solana:sign.transaction` | 1.0.0 | Sign a Solana transaction |
| `wallet.solana:sign.message` | 1.0.0 | Sign a Solana message |
| `wallet.solana:sign.send` | 1.0.0 | Sign and send a Solana transaction |
| `app:close` | 1.0.0 | Request host to close the miniapp |
| `host.back.button:toggle` | 1.0.0 | Show/hide back button |
| `notifications:permission.request` | 1.5.0 | Request OS push-notification permission |

## Available Events

| Event | Since | Description |
|-------|-------|-------------|
| `host.back.button:clicked` | 1.0.0 | Back button was clicked |
| `payment:response` | 0.1.1 | Payment result |
| `clipboard:response` | 0.1.1 | Clipboard read result |
| `wallet.solana:connect.response` | 1.0.0 | Wallet connection result |
| `wallet.solana:sign.transaction.response` | 1.0.0 | Transaction signing result |
| `wallet.solana:sign.message.response` | 1.0.0 | Message signing result |
| `wallet.solana:sign.send.response` | 1.0.0 | Sign and send result |
| `notifications:permission.response` | 1.5.0 | Notification permission result |

## LaunchParams

Parameters injected by the host app:

```typescript
interface LaunchParams {
  authToken: string | undefined;           // JWT auth token
  contractVersion: Version | undefined;    // Host's contract version
  hostAppVersion: string | undefined;      // Host app version
  platform: Platform | undefined;          // 'ios' | 'android'
  safeAreaInsets: SafeAreaInsets | undefined; // System UI insets (CSS px)
  startParam: string | undefined;          // Custom param (referrals, etc.)
  displayMode: DisplayMode;                 // 'standard' | 'fullscreen' | 'immersive'
}
```

### DisplayMode

Controls how the host app renders the miniapp webview.

| Mode | Header | Close / Options | WebView area | Use case |
| ---- | ------ | --------------- | ------------ | -------- |
| `standard` | Visible (title, close, options) | In header | Below header | Default for most miniapps |
| `fullscreen` | Hidden | Floating overlay | Entire screen | Games, media, maps |
| `immersive` | Hidden | **None** | Entire screen | Custom UIs that provide their own exit (must call `app:close`) |

In all modes the miniapp receives `safeAreaInsets` and should respect them for system UI (status bar, notch, home indicator).

## Adding New Methods/Events

1. Define in `src/methods/definitions/methods.ts` or `src/events/definitions/events.ts`
2. Add version mapping in `src/methods/versions/releases.ts`
3. Build: `bun run build`
