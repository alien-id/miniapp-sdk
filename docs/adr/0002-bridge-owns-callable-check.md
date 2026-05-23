# ADR-0002: Bridge owns the Callable check; React never composes it manually

Status: Accepted (2026-05-23)

## Context

Before PRD-0001, every React hook re-derived "is this Method Callable right now?" inline. `useMethod`, `useClipboard`, `useHaptic`, `useBackButton`, and friends each imported `isMethodSupported` from `@alien-id/miniapps-contract`, read `isBridgeAvailable` and `contractVersion` from `useAlien()`, and composed the answer with slightly different fail-open defaults. The result was a five-place duplication of the same protocol question, with subtle behavioral drift between hooks.

The bridge package already needed the composed answer internally — Safe Track functions gated on it before sending — but exposed it only via two near-duplicate functions (`isAvailable` returning `boolean`, `checkAvailability` returning a `SafeResult`), neither of which the React hooks consumed.

## Decision

React hooks consume `callability(method, { version })` from `@alien-id/miniapps-bridge` (via the thin `useCallable` wrapper) whenever they need to know if a Method is Callable. They do not import `isMethodSupported` from `@alien-id/miniapps-contract` for runtime composition, and they do not manually combine `isBridgeAvailable && isMethodSupported`.

Version resolution differs deliberately between layers: in the bridge package, `callability()` reads the Contract Version from `getLaunchParams()?.contractVersion`. In the React layer, `useCallable` reads it from `useAlien().contractVersion` (the provider's snapshot) and forwards explicitly so the hook re-evaluates on context change. The split is intentional — see also [ADR-0005](./0005-strict-track-gates-on-callability.md) — and is the only seam where the two layers can answer the same question.

## Consequences

- The previous five-place duplication collapses into a single seam in the bridge. A hook author can no longer subtly diverge from the canonical Callable definition — the bridge owns it and there is no other way to ask.
- The runtime dependency graph from React becomes linear: `react → bridge → contract`. Contract is a type-only dependency from React's perspective; the only contract-package symbols React imports at runtime, if any, are types.
- Tests for React hooks mock `window.__miniAppsBridge__` instead of stubbing `isMethodSupported`. This mirrors how the bridge is mocked in its own tests and removes the React/contract test seam.

## Alternatives Considered

- **Each hook keeps its own composition.** Status quo; rejected because it produced the inconsistencies that motivated PRD-0001.
- **Put `callability()` in the contract package.** Contract is pure types and protocol metadata; reading `window.__miniAppsBridge__` is a runtime concern that doesn't belong there. Rejected — see [ADR-0004](./0004-callability-canonical-in-bridge.md).
- **Put `callability()` in the React package.** Then non-React consumers (Solana provider, vanilla JS, future Vue/Svelte bindings) would have to recompose. Rejected — see [ADR-0004](./0004-callability-canonical-in-bridge.md).
