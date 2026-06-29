# @alien-id/miniapps-contract

## 2.2.0-beta.0

### Minor Changes

- [#66](https://github.com/alien-id/miniapp-sdk/pull/66) [`b317e19`](https://github.com/alien-id/miniapp-sdk/commit/b317e198a490fc5fc2d7ca0014a3dbc5ab4e1be5) Thanks [@truehazker-eti](https://github.com/truehazker-eti)! - Add one-time location sharing: `location:request` method and `location:response` event (v1.6.0).

  The miniapp requests a single position snapshot (with optional `accuracy`/`maximumAge`/`timeout` options) and the host replies with a W3C-shaped payload — `latitude`, `longitude`, `altitude`, `heading`, `speed`, their matching `horizontalAccuracy`/`verticalAccuracy`/`headingAccuracy`/`speedAccuracy`, and `timestamp`, or an `errorCode` on failure. Every field is populatable from native iOS (`CLLocation`) and Android (`android.location.Location`). Mirrors Telegram's `LocationData` field set and adds `timestamp`.

## 2.1.1

### Patch Changes

- [#56](https://github.com/alien-id/miniapp-sdk/pull/56) [`85d46b2`](https://github.com/alien-id/miniapp-sdk/commit/85d46b22127140faec2a121a6839799218e7f05f) Thanks [@truehazker-eti](https://github.com/truehazker-eti)! - Fix `getReleaseVersion` to resolve the earliest release in semver order, matching `getMethodMinVersion`. It previously scanned the `releases` table in raw object-key order, so an out-of-order table edit could return a later version than the release that actually introduced a method. Both lookups now share a single semver-sorted ordering.

## 2.1.0

### Patch Changes

- [#52](https://github.com/alien-id/miniapp-sdk/pull/52) [`cf14b63`](https://github.com/alien-id/miniapp-sdk/commit/cf14b63593842dd4eadd87a460240283b10c34b5) Thanks [@truehazker-eti](https://github.com/truehazker-eti)! - Promote the v2 Callability rollup to stable. No behavioural changes vs `2.1.0-beta`; this release-only changeset strips the `-beta` prerelease tag so `bridge`, `contract`, `react`, and `solana-provider` ship `2.1.0` on the `latest` dist-tag alongside `auth-client@2.1.0`.
