# Alien Miniapp SDK

[![Lint](https://github.com/alien-id/miniapp-sdk/actions/workflows/lint.yml/badge.svg)](https://github.com/alien-id/miniapp-sdk/actions/workflows/lint.yml)
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

## Documentation

- [React Hooks](./packages/react/README.md)
- [Bridge API](./packages/bridge/README.md)
- [Contract Types](./packages/contract/README.md)
- [Auth Client](./packages/auth-client/README.md)
- [Solana Provider](./packages/solana-provider/README.md)

## License

[MIT](./LICENCE.md)
