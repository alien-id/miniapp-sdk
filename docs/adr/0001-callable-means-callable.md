# ADR-0001: `callable` in React hooks means Callable, not just Method Support

Status: Accepted (2026-05-23)

## Context

React hooks (`useMethod`, `usePayment`, `useClipboard`, `useHaptic`, `useCallable`, etc.) need a single boolean field that answers "can I render the active UI right now?" Two independent runtime signals contribute to that answer:

1. **Method Support** — does the Host's Contract Version cover this Method?
2. **Bridge Availability** — is `window.__miniAppsBridge__` injected right now?

Either one alone is insufficient. The protocol may declare a Method that the running host hasn't shipped; the host may be the right version but the miniapp could be running outside it (browser tab, dev server). Forcing each hook consumer to compose these two signals manually was the friction PRD-0001 set out to remove.

## Decision

The single boolean field exposed on every call hook is named `callable` and means **Callable** — the composed answer (Method Support **AND** Bridge Availability). Not **Method Support** alone.

Pre-PRD-0001 the field was named `supported` and ambiguously meant either signal depending on the hook; that naming is gone. The rename to `callable` is recorded alongside the deletion of the standalone `useIsMethodSupported` hook in favor of `useCallable`, which exposes the full `Callability` discriminated union — see [ADR-0003](./0003-callability-as-discriminated-union.md) and [ADR-0004](./0004-callability-canonical-in-bridge.md).

## Consequences

- In Dev Mode (miniapp running in a browser tab, no Host injecting the Bridge), every call hook reports `callable: false` and UI gated on `callable` will render the disabled/unavailable branch. Devs who want their UI to render in Dev Mode should fake the Bridge in their dev harness (see `mockLaunchParamsForDev`) rather than have the SDK fail open.
- The discriminated `Callability` union from `useCallable` is the way to ask "why is it not callable?" (see [ADR-0003](./0003-callability-as-discriminated-union.md)). Hooks that need to branch UI on `no-bridge` vs `host-outdated` consume the query hook, not the boolean shortcut.
- The contract-only check (**Method Support**, ignoring the Bridge) is still available as `isMethodSupported` from `@alien-id/miniapps-contract`, but is not surfaced as a React hook field. This keeps the React surface aligned with the runtime answer; the protocol-only answer is a contract-package concern.

## Alternatives Considered

- **Two-field hook return (`callable` + `supported`).** Doubles the surface area of every hook return type and reintroduces the original ambiguity ("which one do I gate on?"). Rejected.
- **Keep `supported` and let it mean Callable.** "Supported" already implies the protocol question in the contract package (`isMethodSupported`). Reusing it for the composed answer caused the divergence the PRD removed. Rejected.
- **Fail open in Dev Mode (`callable: true` when bridge is absent).** Makes UI render in dev but hides the dev/prod difference and would surprise devs in production when calls silently no-op. Rejected.
