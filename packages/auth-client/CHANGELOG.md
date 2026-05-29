# @alien-id/miniapps-auth-client

## 2.1.1

### Patch Changes

- [#56](https://github.com/alien-id/miniapp-sdk/pull/56) [`85d46b2`](https://github.com/alien-id/miniapp-sdk/commit/85d46b22127140faec2a121a6839799218e7f05f) Thanks [@truehazker-eti](https://github.com/truehazker-eti)! - Remove the redundant custom JWKS modulus-floor resolver and rely on jose's built-in RSA key-size enforcement. jose already rejects sub-2048-bit RSA keys at verification time (and the algorithm allowlist only permits RS256/EdDSA), so the bespoke resolver — and its extra per-verification JWKS fetch — added no security guarantee. Behavior is unchanged; one network round-trip per verification is eliminated.

## 2.1.0

### Patch Changes

- [#49](https://github.com/alien-id/miniapp-sdk/pull/49) [`0e53ac1`](https://github.com/alien-id/miniapp-sdk/commit/0e53ac15a23aec3e682dbc058fbc6e25d9893d20) Thanks [@truehazker-eti](https://github.com/truehazker-eti)! - Tighten phrasing in the README around token verification and the `jwksUrl` parameter. No runtime changes.
