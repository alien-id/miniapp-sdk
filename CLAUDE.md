# Alien Miniapp SDK

Miniapp infrastructure SDK for the Alien App ecosystem. Enables 3rd party developers to create lightweight applications (webviews) that run within the Alien mobile app (iOS/Android).

## Project Structure

Monorepo using Bun workspaces:

```
miniapp-sdk/
├── packages/
│   ├── auth-client/      # JWT verification (@alien-id/miniapps-auth-client)
│   ├── bridge/           # Communication bridge (@alien-id/miniapps-bridge)
│   ├── contract/         # Type definitions & protocol (@alien-id/miniapps-contract)
│   ├── react/            # React bindings (@alien-id/miniapps-react)
│   └── solana-provider/  # Solana wallet-standard provider (@alien-id/miniapps-solana-provider)
├── examples/
│   ├── vite-miniapp/     # React + TypeScript example
│   ├── solana-wallet/    # Solana wallet operations example
│   └── reown-appkit/     # WalletConnect relay mode example
```

## Packages

### @alien-id/miniapps-bridge
Minimal, type-safe bridge for WebView ↔ Host App communication.
- API: `on()`, `off()`, `emit()`, `request()`, `send()`
- Uses `window.__miniAppsBridge__` for native communication
- Graceful dev-mode fallback (logs warnings when bridge unavailable)

### @alien-id/miniapps-contract
Defines the communication schema and type-safe contracts.
- Defines all Methods (request-response) and Events (one-way)
- Protocol versioning support via `releases.ts`
- `isMethodSupported(method, version)` - Check method compatibility
- `getMethodMinVersion(method)` - Get minimum required version
- TypeScript types for type-safe communication

### @alien-id/miniapps-solana-provider
Solana wallet-standard provider for the Alien bridge.
- Implements `@wallet-standard/base` — auto-discovered by wallet adapters
- `initAlienWallet()` - Register the wallet (call once at app entry)
- `AlienSolanaWallet` - Wallet implementation (connect, sign, send)
- Uses bridge internally — miniapp devs just use their existing Solana stack

### @alien-id/miniapps-react
React bindings for the bridge (TMA-style patterns).
- `AlienProvider` - Context provider, wrap your app
- `useAlien()` - Access context (authToken, contractVersion, isBridgeAvailable)
- `useLaunchParams()` - Get all launch parameters
- `useIsMethodSupported(method)` - Check if method is supported
- `useEvent(name, callback)` - Subscribe to events
- `useMethod(method, responseEvent)` - Request with version checking & state
- `useBackButton(onPress)` - Control native back button
- `usePayment(options)` - Payment flow with state management
- `useClipboard()` - Clipboard read/write
- `useHaptic()` - Haptic feedback
- `useLinkInterceptor(options)` - Intercept link opens

## Communication Protocol

### Naming Convention
Both methods and events follow: `<domain>:<action>`
- Domain: Subsystem (e.g., `auth`, `storage.kv`, `ui.modal`)
- Action: Operation (e.g., `request`, `response.token`)

### Current Protocol (v1.0.0)
- Methods: `app:ready`, `app:close`, `payment:request`, `clipboard:write`, `clipboard:read`, `link:open`, `haptic:impact`, `haptic:notification`, `haptic:selection`, `host.back.button:toggle`, `wallet.solana:connect`, `wallet.solana:disconnect`, `wallet.solana:sign.transaction`, `wallet.solana:sign.message`, `wallet.solana:sign.send`
- Events: `host.back.button:clicked`, `payment:response`, `clipboard:response`, `wallet.solana:connect.response`, `wallet.solana:sign.transaction.response`, `wallet.solana:sign.message.response`, `wallet.solana:sign.send.response`

### Message Flow
```
Miniapp (WebView)
    ↓ bridge API (on, off, emit, request)
    ↓ transport.ts (window.__miniAppsBridge__.postMessage)
    ↓ Native Bridge (injected by Alien App)
Host App (iOS/Android)
```

### Host App Requirements
The host app must inject:
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
cd packages/bridge && bun test
cd packages/contract && bun test
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
import { on, off, emit } from '@alien-id/miniapps-bridge';

const unsubscribe = on('payment:response', (payload) => {
  console.log(payload.status, payload.reqId);
});

await emit('payment:response', { status: 'paid', txHash: '...', reqId: '...' });
```

### Request-Response
```typescript
import { request } from '@alien-id/miniapps-bridge';

const response = await request(
  'payment:request',
  { recipient: 'wallet-123', amount: '100', token: 'SOL', network: 'solana', invoice: 'inv-123' },
  'payment:response',
  { timeout: 5000 }
);
```

## React API

```tsx
import { AlienProvider, useAlien, useLaunchParams, useEvent, useMethod, useIsMethodSupported } from '@alien-id/miniapps-react';

// Wrap app with provider
<AlienProvider><App /></AlienProvider>

// Access context
const { authToken, contractVersion, isBridgeAvailable } = useAlien();

// Get launch parameters
const { authToken, contractVersion, platform, safeAreaInsets, startParam } = useLaunchParams();

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
- `src/hooks/useAlien.ts` - Access context values
- `src/hooks/useLaunchParams.ts` - Launch parameters from window globals
- `src/hooks/useIsMethodSupported.ts` - Check method compatibility
- `src/hooks/useEvent.ts` - Event subscription hook
- `src/hooks/useMethod.ts` - Request with version checking & state
- `src/hooks/useBackButton.ts` - Native back button control
- `src/hooks/usePayment.ts` - Payment flow with state management
- `src/hooks/useClipboard.ts` - Clipboard read/write
- `src/hooks/useHaptic.ts` - Haptic feedback
- `src/hooks/useLinkInterceptor.ts` - Link open interception

### Solana Provider Package
- `src/wallet.ts` - AlienSolanaWallet (wallet-standard implementation)
- `src/account.ts` - AlienSolanaAccount (WalletAccount implementation)
- `src/register.ts` - initAlienWallet() registration function
- `src/utils.ts` - Base64/Base58 encoding utilities
- `src/icon.ts` - Wallet icon data URI

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

## Releases

The SDK uses [changesets](https://github.com/changesets/changesets) in canonical
bot-driven mode. See `RELEASING.md` for the full mental model. The shape:

1. Every feature PR includes a `.changeset/*.md` declaring which packages bump
   and how. Add via `bun changeset`.
2. On push to `main`, `changesets/action` opens or updates a `chore: release
   packages` Version PR with computed bumps + CHANGELOGs + regenerated lockfile.
3. Merging the Version PR triggers the publish path, gated by the `npm-publish`
   environment reviewer.
4. `scripts/publish-topological.ts` walks packages in dependency order
   (computed from `package.json` deps at runtime), packs each with
   `bun pm pack`, and uploads via `npm publish <tgz> --provenance` (OIDC,
   sigstore attestation).
5. `bun pm pack` is used instead of `bun publish` because `bun publish` lacks
   `--provenance`. `npm pack` is avoided because Bun's `workspace:*` is not
   substituted by it (open issue oven-sh/bun#24687).
6. `ci:version` script uses `rm bun.lock && bun install` (not
   `bun install --no-frozen-lockfile`) because the latter does not refresh
   workspace versions in the lockfile under Bun.

Pre-release lines: enter via one-line PR (`bun changeset pre enter beta` or
`...alpha`), exit via one-line PR (`bun changeset pre exit`). No separate
snapshot workflow.

## Skills

Local Claude skills for common workflows:

- `/release` - Drive the changesets-based release flow (add changeset, manage
  Version PRs, toggle pre mode, recover from partial failures).

<!-- skrrt:ship -->
## Git workflow — skrrt skills

Use the installed skrrt skills for all git shipping operations:

- **Commits**: Use `/commit` to stage changes and write conventional commits with gitmojis.
- **Pull requests**: Use `/pr` to push branches and open PRs or MRs with the matching forge CLI.
- **Releases**: Releases are automated by `changesets/action`. Use the local
  `/release` skill (repo-scoped) to drive the changesets flow — adding
  changesets, toggling pre mode, and recovering from partial failures. Do NOT
  use a generic release-notes drafting skill here; CHANGELOGs and GitHub
  releases are created by `changesets/action` and the publish workflow.

Do not write raw `git commit`, `gh pr create`, `gh release create`, `glab mr create`, or
`glab release create` commands manually when these skills are available.

### Deployment conventions (Skrrt)

These rules apply regardless of branching strategy:

- **Tag format:** `vX.Y.Z` (production), `vX.Y.Z-rc.N` (release candidate), `vX.Y.Z-{env}.N` (custom tier). Always use annotated tags.
- **Tags are immutable.** Never delete or move a tag. If a release is bad, cut a new patch version.
- **Build once, promote the same artifact.** The artifact tested in staging must be identical to what reaches production. Never rebuild from a tag.
- **Lower environments do not need tags.** Dev deploys from branch HEAD on merge. Preview environments are per-PR and SHA-scoped.
- **Manual `workflow_dispatch`** can promote an existing artifact to any environment. It complements the tag-driven flow, not replaces it.

<!-- skrrt:branching -->
## Branching strategy — GitHub Flow

This project uses **GitHub Flow**. All agents and contributors must follow these rules:

### Branch rules

- `main` is the only long-lived branch and is always deployable.
- All work happens on short-lived, descriptively named branches.
- Never commit directly to `main` — all changes reach `main` through a pull request.
- PRs always target `main`.
- Feature branches must be up to date with `main` before merging.
- Feature branches are deleted after merge.
- CI runs on every PR.
- Releases are cut by tagging commits on `main`.
- Do not create `develop`, `release/*`, or `hotfix/*` branches.

### Branch naming

Use `<type>/<short-description>` with lowercase and hyphens:
- Features: `feat/add-auth`, `feat/search-index`
- Fixes: `fix/login-redirect`, `fix/null-check`
- Other: `docs/api-guide`, `chore/update-deps`, `refactor/auth-module`

### Keeping branches up to date (Skrrt convention)

- Before opening a PR, rebase the feature branch onto `main`: `git pull --rebase origin main`
- If the rebase has conflicts, resolve them and run `git rebase --continue`.
- If the rebase cannot be resolved cleanly, abort with `git rebase --abort` and ask the user for help.

### PR merge strategy (Skrrt convention)

- Use **squash merge** — each PR becomes one clean commit on `main`.
- This keeps `main` history linear: one commit = one PR = one logical change.

### Tagging and environment (Skrrt convention)

Tags are placed **on `main` only** — never on feature branches. See shared deployment conventions above.

| Environment | Trigger | Tag? |
| --- | --- | --- |
| Dev | Merge to `main` (squash merge) | No |
| Staging | Tag `vX.Y.Z-rc.N` on `main` | Yes |
| Production | Tag `vX.Y.Z` on `main` | Yes |

- Promote to staging by tagging an RC on `main`. If it fails, merge fixes via PR and tag a new RC.
- Promote to production by tagging a clean semver release on the validated commit.

### Agent lifecycle (full auto)

1. Create a branch from `main`: `git switch -c <type>/<description>`
2. If the change touches `packages/*/src/**`, `packages/*/package.json`,
   `packages/*/README.md`, or `packages/*/tsdown.config.ts`, run `bun changeset`
   to declare the release intent. Commit the resulting `.changeset/*.md`.
3. Commit using `/commit`.
4. Before opening a PR, rebase onto `main`: `git pull --rebase origin main`
5. Push and open a PR using `/pr` — target is always `main`.
6. After squash merge, the branch is deleted automatically by the forge.
7. Releasing is automatic from there: `changesets/action` opens a
   `chore: release packages` Version PR, a maintainer merges it, the
   `npm-publish` environment reviewer approves, and packages publish in
   topological order. **No manual tag creation or pushing.**
<!-- /skrrt:branching -->
