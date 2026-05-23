# ADR-0004: `Callability` is canonical in the bridge package, not React-specific

Status: Accepted (2026-05-23)
Amends: [ADR-0001](./0001-callable-means-callable.md), [ADR-0002](./0002-bridge-owns-callable-check.md)

## Context

[ADR-0003](./0003-callability-as-discriminated-union.md) settled on a discriminated `Callability` union as the type-safe answer to "can I call this Method?" The next question is which package owns the type and the function that returns it.

The bridge already needs the composed answer internally — both the Strict Track (`send`, `request`) and Safe Track (`send.ifAvailable`, `request.ifAvailable`) gate on it before sending. The React layer needs the same answer for hook fields. Vanilla-JS and future Vue/Svelte consumers will need it too. Before PRD-0001, the bridge surfaced this answer via two near-duplicate functions (`isAvailable` returning `boolean`, `checkAvailability` returning `SafeResult<never> | undefined`), and the React layer ignored both and recomposed from scratch.

## Decision

`Callability` and the function `callability(method, options)` that returns it live in `@alien-id/miniapps-bridge`. They replace the two near-duplicate functions `isAvailable` and `checkAvailability`, both deleted. React's `useCallable` becomes a one-line wrapper that reads `contractVersion` from context and forwards to the bridge.

Putting the rich type at the seam — not in React — means every consumer of the bridge benefits, not just hook users. The Solana provider, future Vue/Svelte bindings, and vanilla-JS miniapps all get the same bulletproof discriminated union when asking "can I call this?". The bridge surface shrinks (two functions → one), and the distinction between *capability detection ahead of a call* (returns `Callability`) and *runtime failure during a call* (throws `BridgeError` subclass) becomes clean — today's bridge conflated them.

## Consequences

- The thrown error classes (`BridgeUnavailableError`, `BridgeMethodUnsupportedError`, `BridgeTimeoutError`, `BridgeBusyError`) stay — they remain meaningful for the Strict Track (`send`, `request`) and for the Safe Track's (`send.ifAvailable`, `request.ifAvailable`) `SafeResult.error` field when a call fails after passing the capability check.
- Public Strict/Safe entry points funnel through `callability()`, which collapses the no-window case into `BridgeUnavailableError`. There is no dedicated window-specific error subclass; the SDK exposes a single "bridge unavailable" signal regardless of whether the window global or the underlying transport was the culprit.
- This is a breaking change to the bridge's public API; pre-1.0 status makes it acceptable.
- The same `Callability` type is available to any future binding (Vue, Svelte, vanilla JS) without depending on React.

## Alternatives Considered

- **Keep `Callability` in React only; bridge keeps `isAvailable` + `checkAvailability`.** Loses the non-React benefit and keeps the dual-function surface that motivated the PRD. Rejected.
- **Keep `isAvailable` as a thin boolean shortcut next to `callability()`.** Recreates the duplication; consumers immediately ask "which one do I use?" Rejected.
- **Surface a window-specific error subclass for back-compat.** The previous draft kept a dedicated subclass for the "no `window.__miniAppsBridge__`" case, but no public API ever reached it, and `callability()` collapses the case into `BridgeUnavailableError`. Keeping a dead export is worse than the one-line breaking change. Rejected.
