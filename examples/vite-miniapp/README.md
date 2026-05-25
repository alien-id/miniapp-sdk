# Alien Miniapp SDK — Request & Event Example

A React + TypeScript + Vite example for `@alien-id/miniapps-react`. It exercises both the request/response track (`useMethod`) and the event subscription track (`useEvent`), with a UI for inspecting raw payloads and the host's reply.

## What it shows

- **`useMethod`** — type-safe request/response calls. The hook constrains the response event to the method's contract, surfaces typed `BridgeError` subclasses, and exposes loading/error/data state.
- **`useEvent`** — subscribe to events from the host app, including the response that pairs with the active request.
- **`useCallable`** — pre-call Callability check (`bridge present` + `host Contract Version covers the Method`) so the UI can render the right unavailable state.
- **`useAlien`** — bridge availability, presence (not value) of the auth token, and Contract Version snapshot.

## Running

```bash
bun run dev
```

The miniapp serves on `http://localhost:5173`. When running outside the Alien App, the SDK keeps the UI alive and clearly marks the bridge as unavailable — bridge calls report a typed `BridgeUnavailableError` instead of throwing.

## Notes for production builds

- The example never renders the auth token's contents — only its presence — and your production miniapp should follow the same pattern.
- The "raw JSON" override on the form is intentionally typed-cast and is meant for debugging the protocol; production code paths should always go through typed payload builders.
