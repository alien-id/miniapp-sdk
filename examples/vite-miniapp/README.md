# Alien Miniapp SDK - Events Example

This example demonstrates how to use the `@alien-id/react` SDK to listen for events from the host app in a React + TypeScript + Vite application.

## What This Example Shows

- How to use the `useEvent` hook to listen for events from the host app
- How to check bridge availability with `useBridgeAvailable`
- How to access auth token and contract version with `useAuthToken` and `useContractVersion`
- Clean, modern UI showcasing event reception in real-time

## Features

- **Event Listening**: Automatically listens for `auth.init:response.token` events
- **Bridge Status**: Shows whether the bridge is available
- **Event Log**: Displays all received events with timestamps and payloads
- **Type Safety**: Full TypeScript support with type-safe event payloads

## Running the Example

```bash
bun run dev
```

The miniapp will run on `http://localhost:5173`

## Development Mode

When running outside of Alien App (e.g., in a regular browser), the SDK will:
- Warn that the bridge is not available (does not throw)
- Handle errors gracefully
- Allow your app to render and function (though bridge communication won't work)

This makes it easy to develop and test your miniapp UI without needing Alien App running.
