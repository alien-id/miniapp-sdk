# Alien Miniapp SDK

[![Lint](https://github.com/alien-id/miniapp-sdk/actions/workflows/lint.yml/badge.svg)](https://github.com/alien-id/miniapp-sdk/actions/workflows/lint.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENCE.md)

TypeScript SDK for building miniapps that run inside the Alien mobile app. Provides type-safe communication between your webview and the host app.

## Packages

| Package | Version | Description |
|---------|---------|-------------|
| [`@alien_org/react`](./packages/react) | [![npm](https://img.shields.io/npm/v/@alien_org/react.svg)](https://www.npmjs.com/package/@alien_org/react) | React hooks and context provider |
| [`@alien_org/bridge`](./packages/bridge) | [![npm](https://img.shields.io/npm/v/@alien_org/bridge.svg)](https://www.npmjs.com/package/@alien_org/bridge) | Low-level WebView ↔ Host communication |
| [`@alien_org/contract`](./packages/contract) | [![npm](https://img.shields.io/npm/v/@alien_org/contract.svg)](https://www.npmjs.com/package/@alien_org/contract) | Type definitions and protocol versioning |
| [`@alien_org/auth-client`](./packages/auth-client) | [![npm](https://img.shields.io/npm/v/@alien_org/auth-client.svg)](https://www.npmjs.com/package/@alien_org/auth-client) | JWT verification for miniapp backends |
| [`@alien_org/solana-provider`](./packages/solana-provider) | [![npm](https://img.shields.io/npm/v/@alien_org/solana-provider.svg)](https://www.npmjs.com/package/@alien_org/solana-provider) | Solana wallet provider (Wallet Standard) |

## Documentation

- [React Hooks](./packages/react/README.md)
- [Bridge API](./packages/bridge/README.md)
- [Contract Types](./packages/contract/README.md)
- [Host Integration](./docs/host-integration.md)
- [Solana Provider](./packages/solana-provider/README.md)
- [Payments](./docs/payments.md)

## License

[MIT](./LICENCE.md)
