# Alien Miniapp SDK — Solana Wallet Example

A React + TypeScript + Vite example showing how `@alien-id/miniapps-solana-provider` slots into the `@solana/wallet-adapter` stack. Inside the Alien App the host bridge backs a wallet-standard provider that's auto-discovered by the adapter; outside, the adapter sees no wallets.

## What it shows

- **`@alien-id/miniapps-solana-provider`** — wallet-standard provider registered via `initAlienWallet()` in `main.tsx`. The adapter picks it up automatically; there's no per-call SDK wiring in the UI.
- **`useCallable('wallet.solana:connect')`** — the `CallabilityBanner` demonstrates the three Callability branches (callable, no-bridge, host-outdated) so the UI can render branch-specific guidance.
- **`useAlien`** — bridge availability, presence of the auth token, and Contract Version snapshot.
- **`@solana/wallet-adapter-react` + `WalletMultiButton`** — the standard Solana wallet selector. The Alien wallet appears in the modal when the bridge is injected.

## Running

```bash
bun run dev
```

The miniapp serves on `http://localhost:3000`.

### Expected behavior

| Environment | What you see |
| --- | --- |
| Inside the Alien App | Alien wallet appears in the wallet selector, `CallabilityBanner` renders the "ready" branch, connect/sign route through the native bridge. |
| Browser tab (out of host) | Wallet selector is empty (no other adapters registered in this example), `CallabilityBanner` renders the "no-bridge" branch. The UI stays alive; calls would surface `BridgeUnavailableError` if invoked. |
| Outdated Alien App | `CallabilityBanner` renders the "host-outdated" branch with the version mismatch surfaced via the discriminated union. |

## Mock bridge note

This example does **not** install a mock bridge. To test the wallet-adapter integration without the host, register a stub in `main.tsx` that conforms to `window.__miniAppsBridge__`'s shape (`postMessage(data: string)`), or run the miniapp inside an Alien App build with a development host.
