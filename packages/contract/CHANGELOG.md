# @alien-id/miniapps-contract

## 2.1.1

### Patch Changes

- [#56](https://github.com/alien-id/miniapp-sdk/pull/56) [`85d46b2`](https://github.com/alien-id/miniapp-sdk/commit/85d46b22127140faec2a121a6839799218e7f05f) Thanks [@truehazker-eti](https://github.com/truehazker-eti)! - Fix `getReleaseVersion` to resolve the earliest release in semver order, matching `getMethodMinVersion`. It previously scanned the `releases` table in raw object-key order, so an out-of-order table edit could return a later version than the release that actually introduced a method. Both lookups now share a single semver-sorted ordering.

## 2.1.0

### Patch Changes

- [#52](https://github.com/alien-id/miniapp-sdk/pull/52) [`cf14b63`](https://github.com/alien-id/miniapp-sdk/commit/cf14b63593842dd4eadd87a460240283b10c34b5) Thanks [@truehazker-eti](https://github.com/truehazker-eti)! - Promote the v2 Callability rollup to stable. No behavioural changes vs `2.1.0-beta`; this release-only changeset strips the `-beta` prerelease tag so `bridge`, `contract`, `react`, and `solana-provider` ship `2.1.0` on the `latest` dist-tag alongside `auth-client@2.1.0`.
