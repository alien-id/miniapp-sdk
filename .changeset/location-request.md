---
'@alien-id/miniapps-contract': minor
---

Add one-time location sharing: `location:request` method and `location:response` event (v1.6.0).

The miniapp requests a single position snapshot (with optional `accuracy`/`maximumAge`/`timeout` options) and the host replies with a W3C-shaped payload — `latitude`, `longitude`, `altitude`, `heading`, `speed`, their matching `horizontalAccuracy`/`verticalAccuracy`/`headingAccuracy`/`speedAccuracy`, and `timestamp`, or an `errorCode` on failure. Every field is populatable from native iOS (`CLLocation`) and Android (`android.location.Location`). Mirrors Telegram's `LocationData` field set and adds `timestamp`.
