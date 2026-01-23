# @alien_org/contract

[![npm](https://img.shields.io/npm/v/@alien_org/contract.svg)](https://www.npmjs.com/package/@alien_org/contract)

Type definitions and version utilities for miniapp-host communication.

## Installation

```bash
bun add @alien_org/contract
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

  // Event types
  Events,               // Interface of all events
  EventName,            // Union of event names
  EventPayload,         // Payload type for an event
  CreateEventPayload,   // Helper for defining events

  // Launch parameters
  LaunchParams,         // Host-injected params (authToken, contractVersion, etc.)
  Platform,             // 'ios' | 'android'

  // Utilities
  Version,              // Semantic version string type
} from '@alien_org/contract';
```

### Constants

```typescript
import { PLATFORMS, releases } from '@alien_org/contract';

PLATFORMS  // ['ios', 'android']
releases   // Record<Version, MethodName[]> - version to methods mapping
```

### Version Utilities

```typescript
import {
  isMethodSupported,
  getMethodMinVersion,
  getReleaseVersion,
} from '@alien_org/contract';

// Check if method is supported in a version
isMethodSupported('app:ready', '0.0.9');         // true
isMethodSupported('payment:request', '0.0.9');   // false

// Get minimum version that supports a method
getMethodMinVersion('app:ready');         // '0.0.9'
getMethodMinVersion('payment:request');   // '0.0.14'

// Get version where a method was introduced
getReleaseVersion('app:ready');           // '0.0.9'
```

## Available Methods

| Method | Since | Description |
|--------|-------|-------------|
| `app:ready` | 0.0.9 | Notify host that miniapp is ready |
| `miniapp:close.ack` | 0.0.14 | Acknowledge close request |
| `host.back.button:toggle` | 0.0.14 | Show/hide back button |
| `payment:request` | 0.0.14 | Request payment |

## Available Events

| Event | Since | Description |
|-------|-------|-------------|
| `miniapp:close` | 0.0.14 | Host is closing miniapp |
| `host.back.button:clicked` | 0.0.14 | Back button was clicked |
| `payment:response` | 0.0.14 | Payment result |

## LaunchParams

Parameters injected by the host app:

```typescript
interface LaunchParams {
  authToken: string | undefined;        // JWT auth token
  contractVersion: Version | undefined; // Host's contract version
  hostAppVersion: string | undefined;   // Host app version
  platform: Platform | undefined;       // 'ios' | 'android'
  startParam: string | undefined;       // Custom param (referrals, etc.)
}
```

## Adding New Methods/Events

1. Define in `src/methods/definitions/methods.ts` or `src/events/definitions/events.ts`
2. Add version mapping in `src/methods/versions/releases.ts`
3. Build: `bun run build`
