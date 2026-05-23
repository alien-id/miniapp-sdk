# Alien Miniapp SDK

[![CI](https://github.com/alien-id/miniapp-sdk/actions/workflows/ci.yml/badge.svg)](https://github.com/alien-id/miniapp-sdk/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENCE.md)

TypeScript SDK for building miniapps that run inside the Alien mobile app. Provides type-safe communication between your webview and the host app.

## Packages

| Package | Version | Description |
|---------|---------|-------------|
| [`@alien-id/miniapps-react`](./packages/react) | [![npm](https://img.shields.io/npm/v/@alien-id/miniapps-react.svg)](https://www.npmjs.com/package/@alien-id/miniapps-react) | React hooks and context provider |
| [`@alien-id/miniapps-bridge`](./packages/bridge) | [![npm](https://img.shields.io/npm/v/@alien-id/miniapps-bridge.svg)](https://www.npmjs.com/package/@alien-id/miniapps-bridge) | Low-level WebView ↔ Host communication |
| [`@alien-id/miniapps-contract`](./packages/contract) | [![npm](https://img.shields.io/npm/v/@alien-id/miniapps-contract.svg)](https://www.npmjs.com/package/@alien-id/miniapps-contract) | Type definitions and protocol versioning |
| [`@alien-id/miniapps-auth-client`](./packages/auth-client) | [![npm](https://img.shields.io/npm/v/@alien-id/miniapps-auth-client.svg)](https://www.npmjs.com/package/@alien-id/miniapps-auth-client) | JWT verification for miniapp backends |
| [`@alien-id/miniapps-solana-provider`](./packages/solana-provider) | [![npm](https://img.shields.io/npm/v/@alien-id/miniapps-solana-provider.svg)](https://www.npmjs.com/package/@alien-id/miniapps-solana-provider) | Solana wallet provider (Wallet Standard) |

## Quickstart

The fastest path to a working miniapp is the [`examples/vite-miniapp/`](./examples/vite-miniapp) example. It boots a React + Vite app wired to `@alien-id/miniapps-react`, demonstrates `useMethod` / `useEvent` / `useCallable`, and degrades gracefully when run outside the Alien host.

```bash
git clone https://github.com/alien-id/miniapp-sdk.git
cd miniapp-sdk
bun install
bun run --filter './packages/*' build
cd examples/vite-miniapp
bun run dev
```

For wallet-flavoured starters see [`examples/solana-wallet/`](./examples/solana-wallet) (vanilla `@solana/wallet-adapter`) or [`examples/reown-appkit/`](./examples/reown-appkit) (Reown AppKit / WalletConnect relay mode).

## Architecture

The SDK is layered to keep each concern in one place:

```
react  ─►  bridge  ─►  contract
                       (types only)
```

- **[`CONTEXT.md`](./CONTEXT.md)** — the project's domain vocabulary. Read this first if you're new to the codebase; the rest of the docs use these terms exactly.
- **[`docs/prd/0001-unified-callability.md`](./docs/prd/0001-unified-callability.md)** — the PRD that drove the current `Callability` design (the SDK's "can I call this Method right now?" answer).
- **[`docs/adr/`](./docs/adr/)** — Architecture Decision Records. Each ADR pins one decision: see the [ADR index](./docs/adr/README.md) for the catalogue.

The canonical "can I call this Method?" answer is the `Callability` discriminated union, owned by the bridge package, surfaced to React as `useCallable(method)`. The three branches (`callable: true`, `'no-bridge'`, `'host-outdated'`) are exhaustive and TypeScript-narrowable — see [ADR-0003](./docs/adr/0003-callability-as-discriminated-union.md).

## Comparison to peer SDKs

The Alien Miniapp SDK was designed alongside Telegram, Worldcoin, and Farcaster's mini-app SDKs. The deliberate divergences (recorded in [ADR-0003](./docs/adr/0003-callability-as-discriminated-union.md)):

| SDK | Capability answer | Reason on unavailable? |
| --- | --- | --- |
| `@telegram-apps/sdk` | `boolean` from `.isAvailable()` | No |
| `@farcaster/miniapp-sdk` | `Promise<string[]>` from `getCapabilities()` | No |
| `@worldcoin/minikit-js` | `boolean` from `isInWorldApp()` + per-call `fallback` callbacks | No |
| **`@alien-id/miniapps-react`** | **Synchronous `Callability` discriminated union** | **Yes — `'no-bridge'` vs `'host-outdated'` with `needs` / `has` versions** |

The deviation is the value: the reason a Method isn't Callable determines what UI to render. Forcing consumers to manually decompose `isBridgeAvailable && isMethodSupported(method, contractVersion)` to figure out which CTA to show was the friction the SDK set out to remove.

## Documentation

- [React Hooks](./packages/react/README.md)
- [Bridge API](./packages/bridge/README.md)
- [Contract Types](./packages/contract/README.md)
- [Auth Client](./packages/auth-client/README.md)
- [Solana Provider](./packages/solana-provider/README.md)

## License

[MIT](./LICENCE.md)
