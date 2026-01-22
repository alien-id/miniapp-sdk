# Alien Miniapp SDK

TypeScript SDK for building miniapps that run inside the Alien mobile app. Provides type-safe communication between your webview and the host app.

## Packages

| Package | Description |
|---------|-------------|
| [`@alien-id/react`](./packages/react) | React hooks and context provider |
| [`@alien-id/bridge`](./packages/bridge) | Low-level WebView ↔ Host communication |
| [`@alien-id/contract`](./packages/contract) | Type definitions and protocol versioning |
| [`@alien-id/auth-client`](./packages/auth-client) | JWT verification for miniapp backends |

## Documentation

- [React Hooks](./packages/react/README.md)
- [Bridge API](./packages/bridge/README.md)
- [Contract Types](./packages/contract/README.md)
- [Host Integration](./docs/host-integration.md)
- [Payments](./docs/payments.md)

## License

[MIT](./LICENCE.md)
