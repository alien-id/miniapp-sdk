# Alien Miniapp SDK

Miniapp infrastructure SDK for the Alien App ecosystem. Enables 3rd party developers to create lightweight applications (webviews) that run within the Alien mobile app (iOS/Android).

## Project Structure

Monorepo using Bun workspaces:

```
miniapp-sdk/
├── packages/
│   ├── bridge/       # Communication bridge (@alien_org/bridge)
│   ├── contract/     # Type definitions & protocol (@alien_org/contract)
│   └── react/        # React bindings (@alien_org/react)
├── examples/
│   ├── vite-miniapp/ # React + TypeScript example
│   └── miniapp-bridge/
├── docs/
│   ├── bridge.md          # Bridge documentation
│   ├── host-integration.md # Host app requirements
│   └── manifest.md        # Manifest requirements
```

## Packages

### @alien_org/bridge
Minimal, type-safe bridge for WebView ↔ Host App communication.
- API: `on()`, `off()`, `emit()`, `request()`
- Uses `window.__miniAppsBridge__` for native communication
- Graceful dev-mode fallback (logs warnings when bridge unavailable)

### @alien_org/contract
Defines the communication schema and type-safe contracts.
- Defines all Methods (request-response) and Events (one-way)
- Protocol versioning support via `releases.ts`
- `isMethodSupported(method, version)` - Check method compatibility
- `getMethodMinVersion(method)` - Get minimum required version
- TypeScript types for type-safe communication

### @alien_org/react
React bindings for the bridge (TMA-style patterns).
- `AlienProvider` - Context provider, wrap your app
- `useAuthToken()` - Get auth token from `window.__ALIEN_AUTH_TOKEN__`
- `useContractVersion()` - Get version from `window.__ALIEN_CONTRACT_VERSION__`
- `useMethodSupported(method)` - Check if method is supported
- `useEvent(name, callback)` - Subscribe to events
- `useRequest(method, responseEvent)` - Request with version checking & state
- `useAlien()` - Access full context (authToken, contractVersion, isInAlienApp)

## Communication Protocol

### Naming Convention
Both methods and events follow: `<domain>:<action>`
- Domain: Subsystem (e.g., `auth`, `storage.kv`, `ui.modal`)
- Action: Operation (e.g., `request`, `response.token`)

### Current Protocol (v0.0.14)
- Methods: `payment:request` → `{ recipient, amount, token, network, invoice, reqId }`
- Events: `payment:response` → `{ status, txHash?, errorCode?, reqId }`

### Message Flow
```
Miniapp (WebView)
    ↓ bridge API (on, off, emit, request)
    ↓ transport.ts (window.__miniAppsBridge__.postMessage)
    ↓ Native Bridge (injected by Alien App)
Host App (iOS/Android)
```

### Host App Requirements
The host app must inject (see `docs/host-integration.md`):
- `window.__miniAppsBridge__` - Bridge with `postMessage(data: string)`
- `window.__ALIEN_AUTH_TOKEN__` - JWT auth token
- `window.__ALIEN_CONTRACT_VERSION__` - Semantic version (e.g., '0.0.1')

## Development

Use Bun instead of Node.js.

```bash
bun install              # Install dependencies
bun run build           # Build all packages (uses tsdown)
bun test                # Run tests
bun run <script>        # Run package scripts
```

### Testing

Run tests with Bun's test runner:
```bash
cd packages/bridge
bun test --preload tests/setup.ts tests
```

Test files in `packages/bridge/tests/`:
- `transport.test.ts` - Message transport tests
- `events.test.ts` - Event subscription tests
- `request.test.ts` - Request-response pattern tests
- `index.test.ts` - Integration tests

Test files in `packages/contract/tests/`:
- `versions.test.ts` - isMethodSupported, getMethodMinVersion tests

### Linting & Formatting

Uses Biomejs (config: `biome.json`):
- Single quotes, 2-space indent, trailing commas, LF line endings

## Bridge API

### Events
```typescript
import { on, off, emit } from '@alien_org/bridge';

const unsubscribe = on('payment:response', (payload) => {
  console.log(payload.status, payload.reqId);
});

await emit('payment:response', { status: 'paid', txHash: '...', reqId: '...' });
```

### Request-Response
```typescript
import { request } from '@alien_org/bridge';

const response = await request(
  'payment:request',
  { recipient: 'wallet-123', amount: '100', token: 'SOL', network: 'solana', invoice: 'inv-123' },
  'payment:response',
  { timeout: 5000 }
);
```

## React API

```tsx
import { AlienProvider, useAuthToken, useEvent, useMethod, useIsMethodSupported } from '@alien_org/react';

// Wrap app with provider
<AlienProvider><App /></AlienProvider>

// Get injected auth token
const token = useAuthToken();

// Subscribe to events
useEvent('payment:response', (payload) => {
  console.log(payload.status);
});

// Check method compatibility before using
const { supported, minVersion } = useIsMethodSupported('payment:request');
if (!supported) return <div>Requires v{minVersion}</div>;

// Make requests with state management (auto version check)
const { execute, data, error, isLoading, supported } = useMethod(
  'payment:request',
  'payment:response',
);
await execute({ recipient: 'wallet-123', amount: '100', token: 'SOL', network: 'solana', invoice: 'inv-123' });
```

## Adding New Methods/Events

1. Define in `packages/contract/src/methods/definitions/methods.ts` or `events/definitions/events.ts`
2. Use `CreateMethodPayload` or `CreateEventPayload` types
3. Update version in `packages/contract/src/methods/versions/releases.ts`
4. Run `bun run build` in contract package

## Key Files

### Bridge Package
- `src/transport.ts` - Low-level message transport
- `src/request.ts` - Request-response with timeout (default 30s)
- `src/events.ts` - Event management using Emittery

### Contract Package
- `src/methods/definitions/methods.ts` - Method interface definitions
- `src/methods/versions/releases.ts` - Version → method mapping
- `src/methods/versions/index.ts` - isMethodSupported, getMethodMinVersion
- `src/events/definitions/events.ts` - Event interface definitions
- `src/utils.ts` - TypeScript utility types (WithReqId, Version, etc.)

### React Package
- `src/context.tsx` - AlienProvider and useAlien hook
- `src/hooks/useAuthToken.ts` - Auth token from window.__ALIEN_AUTH_TOKEN__
- `src/hooks/useContractVersion.ts` - Contract version from window.__ALIEN_CONTRACT_VERSION__
- `src/hooks/useMethodSupported.ts` - Check method compatibility
- `src/hooks/useEvent.ts` - Event subscription hook
- `src/hooks/useRequest.ts` - Request with version checking & state

## Bun Guidelines

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun install` instead of `npm install`
- Bun automatically loads .env, so don't use dotenv
- Prefer `Bun.file` over `node:fs`

## Documentation Guidelines

- Use Mermaid for all diagrams, flowcharts, and sequence charts (not ASCII art)
- Mermaid diagrams render properly in GitHub and most markdown viewers
- Example:
  ```mermaid
  sequenceDiagram
      participant A as Frontend
      participant B as Backend
      A->>B: Request
      B-->>A: Response
  ```

## Skills

Local Claude skills for common workflows:

- `/release` - Release packages to npm in correct dependency order. Handles version bumping, lockfile updates, tagging, and pushing in the correct order.
