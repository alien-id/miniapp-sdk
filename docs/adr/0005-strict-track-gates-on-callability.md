# ADR-0005: Strict Track (`send`, `request`) gates on `Callability` and throws

Status: Accepted (2026-05-23)

## Context

Before PRD-0001 the two tracks behaved inconsistently. The Safe Track (`send.ifAvailable`, `request.ifAvailable`) consulted the composed capability answer and returned a typed `SafeResult.error` when the Method wasn't Callable. The Strict Track (`send`, `request`) only checked Bridge presence — if the Bridge was injected but the Host's Contract Version didn't declare the Method, `send` silently posted the message and `request` waited 30 seconds before producing a `BridgeTimeoutError`. The diagnostic ("host doesn't support this Method") was hidden behind a misleading timeout.

Three failure shapes for the same misuse — silent no-op, 30-second timeout, or typed `BridgeError` — depending purely on which track and which method shape the caller picked.

## Decision

`send(method, payload)` and `request(method, params, responseEvent, options)` both call `callability(method, { version })` as their first action and throw the matching `BridgeError` subclass if the result isn't `{ callable: true }`:

- `{ callable: false, reason: 'no-bridge' }` → `BridgeUnavailableError`
- `{ callable: false, reason: 'host-outdated' }` → `BridgeMethodUnsupportedError(method, has, needs)`

Version is read via `getLaunchParams()?.contractVersion` — no new bridge helper required. In the React layer the version resolution is deliberately distinct: hooks read `contractVersion` from `useAlien()` (the provider's snapshot) and forward it to `useCallable` explicitly, so React's reactivity picks up context changes. The split between bridge-level (`getLaunchParams()`) and React-level (`useAlien().contractVersion`) is intentional and is the only place the two layers ask the same question by different means.

## Consequences

- Both tracks (Strict and Safe) are now consistent: every path through the bridge funnels through one canonical capability check before any message leaves the page.
- Calling a Method the Host doesn't support throws `BridgeMethodUnsupportedError` immediately at the call site rather than producing a 30-second hang followed by a misleading `BridgeTimeoutError`. A class of latent bugs (Hosts running below the bundled Contract Version, Methods referenced but never released) that were previously hidden as silent no-ops now surface immediately.
- The behavioral change is breaking for direct consumers of Strict Track who relied on the silent no-op. Pre-1.0 status makes this acceptable; the diagnostic improvement is permanent.
- React hook consumers see no behavioral change here — they consume Safe Track internally and observe the same `SafeResult.error` they already did.

## Alternatives Considered

- **Keep Strict Track behaviour as-is, document the inconsistency.** Rejected — documenting a footgun is a worse fix than removing the footgun.
- **Throw a different new error class (e.g., `BridgeStrictTrackError`).** Rejected — `BridgeMethodUnsupportedError` is already the right type and is already produced by the Safe Track for the same condition. Adding a new class would diverge the two tracks again.
- **Convert Strict Track to log-and-no-op for unsupported Methods.** Rejected — the "strict" in Strict Track means it throws. Consumers who want silent degradation use the Safe Track.
