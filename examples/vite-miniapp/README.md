# Miniapp Example

This is a miniapp example that demonstrates how to use the `@alien-id/bridge` package in a React + TypeScript + Vite application.

## What This Example Shows

- How to **send methods** to the host app using `request()`
- How to **listen to events** from the host app using `on()`
- Type-safe communication with the bridge
- Request-response pattern with timeout handling

## Communication Pattern

- **Miniapp** → **Host App**: Sends methods (e.g., `auth.init:request`)
- **Host App** → **Miniapp**: Sends events (e.g., `auth.init:response.token`)

## Running the Example

```bash
bun run dev
```

The miniapp will run on `http://localhost:5173`
