---
"@alien-id/miniapps-contract": patch
---

Fix `getReleaseVersion` to resolve the earliest release in semver order, matching `getMethodMinVersion`. It previously scanned the `releases` table in raw object-key order, so an out-of-order table edit could return a later version than the release that actually introduced a method. Both lookups now share a single semver-sorted ordering.
