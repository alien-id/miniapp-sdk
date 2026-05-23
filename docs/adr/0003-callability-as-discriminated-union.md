# ADR-0003: `useCallable` returns a discriminated `Callability` union, not a boolean

Status: Accepted (2026-05-23)
Amends: [ADR-0001](./0001-callable-means-callable.md)

## Context

[ADR-0001](./0001-callable-means-callable.md) established that the boolean field on call hooks (`callable`) is the composed answer (**Method Support** AND **Bridge Availability**). That field is sufficient for the common "render or hide" case, but it loses the reason a Method isn't Callable — and the reason determines what UI to render.

A miniapp running in a browser tab needs to render "open this in the Alien App." A miniapp running inside an outdated host needs to render "update your Alien App to version X." Both produce `callable: false`, but they require completely different call-to-action UI. Pre-PRD-0001 the only way to distinguish them was to read `isBridgeAvailable` and `contractVersion` from `useAlien()` and recompose — exactly the leak the PRD set out to remove.

Surveying peer SDKs: Telegram's `@telegram-apps/sdk` returns `boolean` from `.isAvailable()`, Farcaster's `@farcaster/miniapp-sdk` returns `Promise<string[]>` from `getCapabilities()`, Worldcoin's `@worldcoin/minikit-js` returns `boolean` from `isInWorldApp()` plus per-call `fallback` callbacks. None surface the reason a Method isn't Callable in a type-safe form.

## Decision

The dedicated query hook `useCallable(method)` returns a discriminated union with three branches:

```ts
type Callability =
  | { callable: true }
  | { callable: false; reason: 'no-bridge' }
  | { callable: false; reason: 'host-outdated'; needs: Version; has: Version }
```

TypeScript narrowing prevents reading `needs` or `has` outside the `'host-outdated'` branch. Field names (`needs`, `has`) read as plain English so the type explains itself on hover.

The call hooks (`useMethod`, `usePayment`, `useClipboard`, `useHaptic`, etc.) still expose `callable: boolean` as a shortcut for the common "render or hide" case — most consumers don't need the rich type. Two roles, two shapes: the query hook gives the full picture, the call hooks give the boolean.

## Consequences

- UI gated on "why" can be written without manual decomposition: `switch (callability.reason)` is exhaustive and type-checked.
- The SDK deviates deliberately from the Telegram/Farcaster/Worldcoin convention. Future contributors comparing the SDK to those should not "fix" us into their pattern — the deviation is the value.
- The discriminated union shape is stable. Adding a fourth branch (e.g., `'host-disconnected'` for a future reconnection flow) is a breaking change consumers can opt into via TypeScript's exhaustiveness check.

## Alternatives Considered

- **Boolean + companion fields (`callable: false; reason?: string; needs?: string`).** Loses the type-narrowing guarantee — `needs` is always optional, even when meaningful. Rejected.
- **Throw on `useCallable` when not Callable.** Hooks can't throw on render usefully (React renders the error boundary, not the fallback UI). Rejected.
- **Async API (`Promise<Callability>`).** The composition is a pure synchronous read; making it async would force consumers into `useEffect` + state for a question that's resolved at mount. Rejected — see user story 17 in PRD-0001.
- **Match Telegram's `isAvailable(): boolean` exactly.** Loses the reason; reintroduces the manual recomposition the PRD removed. Rejected.
