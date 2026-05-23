# Alien Miniapp SDK — Reown AppKit Example

A React + TypeScript + Vite example showing how `@alien-id/miniapps-solana-provider` cohabits with [Reown AppKit](https://docs.reown.com/appkit/overview) (formerly WalletConnect). Inside the Alien App the host bridge surfaces the Alien wallet through wallet-standard discovery; outside, AppKit transparently routes through WalletConnect / Phantom / other Solana wallets.

## What it shows

- **`@alien-id/miniapps-solana-provider`** — wallet-standard provider registered in `main.tsx`. AppKit's Solana adapter discovers it automatically when the bridge is present.
- **`useCallable('wallet.solana:connect')`** — the `CallabilityBanner` demonstrates the three Callability branches (callable, no-bridge, host-outdated). The same Solana flow works in all three states; the banner explains which one is active.
- **`useAlien`** — bridge availability, presence of the auth token, and Contract Version snapshot.
- **`@reown/appkit` web components** — `<appkit-button>` and `<appkit-network-button>` render the AppKit connect / account / network UI. AppKit is the WalletConnect-aware UX layer; the SDK provides one of the wallets behind it.

## Running

```bash
bun run dev
```

The miniapp serves on `http://localhost:3000`.

### Expected behavior

| Environment | What you see |
| --- | --- |
| Inside the Alien App | Alien wallet appears in AppKit's selector alongside any WalletConnect/Phantom options. Sign / send routes through the native bridge. `CallabilityBanner` renders the "ready" branch. |
| Browser tab (out of host) | AppKit shows its WalletConnect-based selector with other Solana wallets. `CallabilityBanner` renders the "no-bridge" branch, explaining that AppKit will fall back to non-Alien wallets. |
| Outdated Alien App | `CallabilityBanner` renders the "host-outdated" branch with the version mismatch. AppKit may still let the user connect a different wallet. |

## Mock bridge note

This example does **not** install a mock bridge. The example is structured to be useful even when the bridge is absent — AppKit's other wallet connections continue to work. To exercise the Alien-specific path in isolation, run the miniapp inside an Alien App build with a development host.
