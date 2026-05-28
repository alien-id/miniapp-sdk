---
"@alien-id/miniapps-bridge": patch
"@alien-id/miniapps-contract": patch
"@alien-id/miniapps-react": patch
"@alien-id/miniapps-solana-provider": patch
---

Promote the v2 Callability rollup to stable. No behavioural changes vs `2.1.0-beta`; this release-only changeset strips the `-beta` prerelease tag so `bridge`, `contract`, `react`, and `solana-provider` ship `2.1.0` on the `latest` dist-tag alongside `auth-client@2.1.0`.
