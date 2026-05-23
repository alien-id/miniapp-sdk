# PRD-0001: Unified Callability across Bridge and React

Status: Implemented (2026-05-23)
Related ADRs: [0001](../adr/0001-callable-means-callable.md), [0002](../adr/0002-bridge-owns-callable-check.md), [0003](../adr/0003-callability-as-discriminated-union.md), [0004](../adr/0004-callability-canonical-in-bridge.md), [0005](../adr/0005-strict-track-gates-on-callability.md)

## Problem Statement

Miniapp developers can't reliably ask "can I call this **Method** right now?" The answer requires composing two independent boolean signals — whether the **Bridge** is present, and whether the **Host**'s **Contract Version** declares the method — and the SDK forces that composition on every caller. Today:

- Each React hook (`useMethod`, `useClipboard`, `useHaptic`, `useBackButton`, etc.) re-derives the answer inline with its own fail-open defaults; some hooks default `supported: true` when the host doesn't inject a contract version, others default it differently, and each one calls `isMethodSupported` directly from the contract package without going through the bridge's already-composed check.
- The bridge exposes two near-duplicate capability functions (`isAvailable` returning `boolean`, `checkAvailability` returning a `SafeResult<never> | undefined`) and an `isBridgeAvailable` utility; **Safe Track** functions (`send.ifAvailable`, `request.ifAvailable`) gate on the composed check, but **Strict Track** functions (`send`, `request`) only check bridge presence and silently send anything the host might not support.
- Consequently, calling a method the host doesn't recognize produces inconsistent symptoms depending on path: silent no-op for fire-and-forget Strict Track, a 30-second `BridgeTimeoutError` for request-response Strict Track, or a typed `BridgeMethodUnsupportedError` only on the Safe Track. The same misuse produces three different developer experiences.
- React hooks that need to render different UI for "you are in **Dev Mode**" versus "the host is outdated" cannot get that distinction from the SDK; they must read `isBridgeAvailable` and `contractVersion` from `useAlien()` and recompose. This is the friction the SDK was meant to remove.

## Solution

Introduce **Callability** as a single canonical type — a discriminated union — owned by the bridge package, surfaced everywhere a caller needs to know "can I call this?" Replace the two near-duplicate capability functions with one. Make every path through the bridge funnel through it. Provide one React hook (`useCallable`) for the rich type and a `callable: boolean` shortcut field on every call hook for the common "render or hide" case. Both **Tracks** (Strict and Safe) gate on **Callability** uniformly — failure on the Strict Track throws the matching typed `BridgeError` subclass immediately at the call site instead of silently no-opping or timing out.

Field names read as English: `{ callable: false, reason: 'host-outdated', needs: '0.2.0', has: '0.1.0' }`. The type IS the documentation; no docs page needed to learn the failure modes.

## User Stories

1. As a miniapp developer, I want a single hook that tells me whether a **Method** is **Callable** right now, so I don't have to compose two booleans from different parts of the SDK.

2. As a miniapp developer, when a **Method** isn't **Callable**, I want the SDK to tell me *why* (no bridge vs host outdated), so my UI can render the right call-to-action without me manually checking other SDK state.

3. As a miniapp developer, I want field names that read as natural language (`needs`, `has`) so the discriminated union explains itself when I hover over it in my editor.

4. As a miniapp developer, I want TypeScript to prevent me from reading `needs` or `has` when the method is callable, so I can't accidentally render "update your app" UI for a working call.

5. As a miniapp developer building a payment button, I want `usePayment().callable: boolean` so I can write `if (!callable) return <Disabled/>` without learning a discriminated union for the common render-or-hide case.

6. As a miniapp developer who needs to distinguish "user opened my app in a browser tab" from "user has an old version of the Alien app," I want one `useCallable('payment:request')` call that gives me both reasons via the same shape — not a manual composition of `isBridgeAvailable && isMethodSupported(...)`.

7. As a miniapp developer, when I call a Strict Track function (`send` or `request`) with a method the host doesn't support, I want it to throw `BridgeMethodUnsupportedError` immediately, not silently no-op or time out after 30 seconds.

8. As a miniapp developer, when I switch from Strict Track to Safe Track, I want the same failure modes to surface — just as `SafeResult.error` instead of a thrown exception — so my error-handling logic transfers cleanly between the two styles.

9. As a miniapp developer testing in **Dev Mode** (browser tab, no bridge injected), I want every call hook to report `callable: false` consistently — not "some hooks fail open, some fail closed" — so my UI gating works identically in dev and production.

10. As a miniapp developer building a third-party Solana wallet provider, I want the bridge to throw `BridgeMethodUnsupportedError` if I call a Solana method against a host running an older contract version, so I can surface a clear "update Alien app" message instead of seeing a 30-second hang.

11. As a non-React SDK consumer (vanilla JS or future Vue/Svelte bindings), I want the same `Callability` type the React layer uses, so I get the same bulletproof discriminated reasons without depending on React.

12. As a miniapp developer reading the SDK's source, I want one function that answers the capability question — not three (`isAvailable`, `checkAvailability`, `isBridgeAvailable`) — so the surface area I have to learn is minimal.

13. As a miniapp developer reading the SDK's TypeScript types, I want `Callability` to encode all three states (`callable: true`, `no-bridge`, `host-outdated`) as discriminated variants, so I learn the SDK's runtime/protocol split from the type alone.

14. As a contributor to the SDK, I want to write a single `callability()` function that all execution paths (Strict, Safe, hooks, providers) consume, so I can change "what does callable mean?" in one place and have every consumer pick it up automatically.

15. As a contributor to the SDK, I want `callability()` to be a pure synchronous function over its inputs, so I can unit-test it without mocking the DOM, React, or any async runtime.

16. As a miniapp developer running my app in production, when the host returns an `errorCode` or my request times out *after* passing the **Callability** check, I want a typed error that's distinct from "host doesn't support this method" — so I can tell post-call failures apart from pre-call refusals.

17. As a miniapp developer, I want `useCallable('payment:request')` to be synchronous (no `await`), so I can call it during render and gate UI without `useEffect` + state.

18. As a miniapp developer, I want `useCallable` to use the type-safe literal union `MethodName` for its argument, so a typo in the method name is a compile error — not a runtime "always returns false."

19. As a miniapp developer, I want renaming a hook field from `supported` to `callable` to come with a clear migration message (or TypeScript error) so I don't silently miss the rename.

20. As a miniapp developer maintaining a long-running app, I want the SDK's behavior to be consistent across SDK upgrades — the same input always produces the same `Callability` value — so my UI doesn't subtly change behavior on a patch bump.

21. As a miniapp developer reading the SDK's exported names, I want `Callability` (the type) and `callable` (the field) and `useCallable` (the hook) to share a root word, so the vocabulary feels coherent.

22. As a miniapp developer encountering an unfamiliar method name in someone else's code, I want `useCallable('some-method-name')` to either work or fail at compile time — never silently default to `true` because the method isn't in the registry.

23. As a contributor writing tests for a new method, I want to be able to mock the bridge's bridge-availability and the host's contract version independently, so I can exercise all three `Callability` branches without spinning up the host.

24. As a miniapp developer migrating from the old `useIsMethodSupported` to the new `useCallable`, I want the migration to be a single rename plus a switch from `{ supported }` to `{ callable }` destructuring — no behavioral surprises mid-migration.

25. As a miniapp developer, when my app calls a fire-and-forget method (haptic, clipboard:write) in **Dev Mode**, I want a console warning telling me the bridge is unavailable — but I don't want the call to throw, so my dev experience is uninterrupted.

26. As a miniapp developer, I want `useCallable` to re-evaluate (and trigger a re-render) when `contractVersion` from context changes — even though that only happens once at mount in practice — so the hook plays well with React's reactivity model.

27. As a miniapp developer, I want the bridge's deleted functions (`isAvailable`, `checkAvailability`) to either not exist or produce a TypeScript error pointing me at `callability()`, so I can't accidentally consume the deprecated API.

## Implementation Decisions

The work spans three packages: `@alien-id/miniapps-bridge`, `@alien-id/miniapps-react`, and (lightly) `@alien-id/miniapps-solana-provider`. The contract package is untouched.

### The deep module: `callability()` in `bridge`

A new pure function is the entire load-bearing surface. Its interface, distilled:

```ts
export type Callability =
  | { callable: true }
  | { callable: false; reason: 'no-bridge' }
  | { callable: false; reason: 'host-outdated'; needs: Version; has: Version }

export function callability(method: MethodName, options?: { version?: Version }): Callability
```

This replaces two existing bridge functions. Both are deleted:
- `isAvailable(method, options): boolean`
- `checkAvailability(method, options): SafeResult<never> | undefined`

The function is synchronous, has no React or DOM dependency beyond `isBridgeAvailable()` (which reads `window.__miniAppsBridge__`), and is the only place in the codebase that composes "bridge present AND method supported." Every other path in the bridge consumes it.

### Strict Track gating

`send(method, payload)` and `request(method, params, responseEvent, options)` both call `callability(method, { version: getLaunchParams()?.contractVersion })` as their first action. If the result is `{ callable: false, reason: 'no-bridge' }`, they throw `BridgeUnavailableError`. If `{ callable: false, reason: 'host-outdated' }`, they throw `BridgeMethodUnsupportedError(method, has, needs)`. Otherwise they proceed to send.

Behavioral change: previously `send` silently sent unsupported methods and `request` returned `BridgeTimeoutError` after 30 seconds. Now both throw immediately with a typed error. This is intentional — see ADR-0005.

### Safe Track delegation

`send.ifAvailable` and `request.ifAvailable` consume `callability()` directly instead of the deleted `checkAvailability`. When the result is `callable: false`, they return `{ ok: false, error: <matching BridgeError instance> }` — the SafeResult error type stays as `BridgeError` (or its subclasses), so existing consumer code that checks `error instanceof BridgeUnavailableError` continues to work.

### Bridge errors

`BridgeUnavailableError`, `BridgeMethodUnsupportedError`, and `BridgeTimeoutError` keep their constructors and field shapes. They are now thrown in more situations (Strict Track gating) and constructed in fewer (no longer constructed inside `checkAvailability`, since `checkAvailability` is gone). `BridgeWindowUnavailableError` is removed — `callability()` collapses the no-window case into `BridgeUnavailableError`, so no public API surfaced the window-specific subclass.

`BridgeBusyError` is introduced for re-entrant call rejection in hook-level Safe Track wrappers (e.g., a second `execute()` call while the first is still in flight). Distinct from `BridgeUnavailableError` so UI can branch on "wait for the active call" vs. "bridge missing".

### React: one new hook, one deleted hook

New: `useCallable(method: MethodName): Callability`. Implementation reads `contractVersion` from `useAlien()` and forwards to `callability(method, { version: contractVersion })`. The hook is one line of logic.

Deleted: `useIsMethodSupported`. Its previous return shape (`{ supported, contractVersion, minVersion }`) was a flat decomposition of what the discriminated union now encodes more precisely.

Deleted from `react/src/errors.ts`: `ReactSDKError` (base class) and `MethodNotSupportedError`. The latter was a near-duplicate of `BridgeMethodUnsupportedError` with no React-specific fields, only constructed in `useMethod`'s now-removed inline version check. The file collapses to re-exports of bridge errors.

### React: all call hooks refactor to consume Safe Track + expose `callable: boolean`

Every call hook (`useMethod`, `usePayment`, `useClipboard`, `useHaptic`, `useBackButton`, `useNotificationPermission`, `useClose`, plus any others) is refactored:

- Internal calls to `request(...)` become `request.ifAvailable(...)`. Internal try/catch and inline version-check blocks are removed; the hook reads the SafeResult and writes to state.
- The hook return type renames the boolean field from `supported` to `callable` for vocabulary alignment with `CONTEXT.md`. The field is computed by `callability(method, { version: contractVersion }).callable`.
- Hooks no longer import `isMethodSupported` or `getMethodMinVersion` from `@alien-id/miniapps-contract`. The only contract imports become type imports.

`AlienProvider` keeps exposing `isBridgeAvailable` and `contractVersion` on its context value — they remain useful for non-method UI ("running in dev mode" banners, debug overlays) — but hooks no longer read them for capability composition.

**Deferred from this PR: `useLinkInterceptor`.** The link-interceptor hook is a global document-level click listener that fire-and-forgets `link:open` through the Strict Track `send()` wrapped in a blanket try/catch. Behaviorally it already degrades to "do nothing" when the bridge is absent, so unifying it with the Callability model is cosmetic; it ships unchanged in this rollout and is tracked as follow-up work alongside the other deferred hook hygiene items.

### Solana provider

No structural change. The provider's existing call sites (`wallet.ts` — connect, disconnect, signTransaction, signMessage, signAndSend) all use the Strict Track `request()`. After this work, those calls will throw `BridgeMethodUnsupportedError` synchronously if the host runs a contract version that doesn't include the relevant Solana method, instead of timing out. The provider's existing `normalizeWalletError` catch block should be reviewed to ensure these new immediate throws produce meaningful wallet-standard errors.

### CONTEXT.md vocabulary

The terms used throughout this PRD are defined in `/CONTEXT.md`: **Bridge**, **Host**, **Method**, **Event**, **Contract Version**, **Method Support**, **Bridge Availability**, **Callable**, **Callability**, **Dev Mode**, **Safe Track**, **Strict Track**. Implementation code, tests, and any new documentation should use these terms exactly — no drift into "compatibility," "availability," "support," "interface," etc.

## Testing Decisions

### What makes a good test here

Test the external behavior of the deep module — `callability()` — exhaustively. It is pure, synchronous, and has three input axes (bridge presence, host's contract version, method's min version) that combine into three output branches. Every branch is reachable with a minimal stub of `window.__miniAppsBridge__` and a `Version` string. The bridge errors are stable; the discriminated union is stable; this test suite changes only when the protocol fundamentally changes.

For the call-track functions (`send`, `request`, `send.ifAvailable`, `request.ifAvailable`), test that each one funnels through `callability()` and produces the correct outcome on each branch (throw vs SafeResult error vs success). Do not test internal calls or implementation details — test that the user-visible contract holds.

For React hooks, test the rendering contract (`callable` field correctness, error/data state transitions) and that the hook re-evaluates when context changes. Do not snapshot internals or assert call counts on `request`.

### Modules to test

1. **`bridge/src/callability.ts`** (new). Comprehensive: every combination of `{ bridge present | bridge absent } × { version provided | version absent } × { method supported in version | unsupported }`. Confirm each combination produces the right discriminated variant. Confirm `MethodName` literal typing prevents passing arbitrary strings at the type level (a `@ts-expect-error` line).

2. **`bridge/src/send.ts` and `request.ts`** (modified). For each Callability branch: `callable: true` → call proceeds; `no-bridge` → throws `BridgeUnavailableError`; `host-outdated` → throws `BridgeMethodUnsupportedError(method, has, needs)`. Confirm the error instance carries the right fields. For `request`, separately confirm the post-Callability behavior (success, timeout, host-returned error) still works.

3. **`bridge/src/send.ts` and `request.ts` — Safe Track (`send.ifAvailable`, `request.ifAvailable`)** (modified). Same three branches, but the `no-bridge` and `host-outdated` cases produce `SafeResult.error` instead of throws. Confirm `error instanceof BridgeMethodUnsupportedError` for the host-outdated case so existing consumer code continues to discriminate. Covered by `packages/bridge/tests/send.safe.test.ts` and `packages/bridge/tests/request.safe.test.ts`.

4. **`react/src/hooks/useCallable.ts`** (new). Two tests: when `contractVersion` is present in context and the method is supported, returns `{ callable: true }`; when the bridge is absent (context's `isBridgeAvailable: false`), returns `{ callable: false, reason: 'no-bridge' }`. The `host-outdated` branch is covered indirectly through `callability()`'s own tests — no need to repeat from React.

5. **One representative call hook (e.g., `react/src/hooks/useMethod.ts`)** (modified). Confirm the new `callable: boolean` shortcut field appears in the return shape; confirm `execute()` writes `BridgeUnavailableError` to `error` state when the bridge is absent (rather than throwing); confirm a successful round-trip writes to `data`. The other call hooks (`useClipboard`, `useHaptic`, etc.) are mechanical refactors of the same pattern — exhaustive coverage of each is not necessary if the pattern is verified once.

### Prior art

Existing tests follow this style already:
- `packages/bridge/tests/callability.test.ts` exhaustively covers the discriminated union across every combination of bridge presence and host Contract Version. Use it as the structural template for any future capability-style test.
- `packages/contract/tests/versions.test.ts` exhaustively tests `isMethodSupported` across version combinations — the same exhaustive style applies to `callability()`'s composed answer.
- `packages/bridge/tests/request.test.ts`, `packages/bridge/tests/request.safe.test.ts`, `packages/bridge/tests/send.test.ts`, and `packages/bridge/tests/send.safe.test.ts` model the throw-vs-SafeResult dichotomy clearly across both tracks.
- React hook tests live in the React package and use `@testing-library/react`'s `renderHook` — `packages/react/tests/useCallable.test.tsx` matches this style.

## Out of Scope

This PRD covers only the **Callability** unification (architecture review candidate #2). The following candidates from the original review are explicitly *not* part of this work and remain open for future PRDs:

- **Wrapper hooks (#1).** The repetitive boilerplate across `useClipboard`, `useHaptic`, `useBackButton` is not addressed here beyond the mechanical changes (drop inline checks, rename `supported` to `callable`). `useLinkInterceptor` is explicitly excluded from even the mechanical changes — see the implementation section above for the rationale; it ships unchanged. A parameterised hook factory or a deeper merging of these into a single `useTypedMethod` is a separate decision.

- **Contract registry consolidation (#3).** Methods, events, versions, and the mock-bridge response map remain split across multiple files in `packages/contract` and `packages/bridge/src/mock.ts`. Collapsing them into a single registry is a separate PRD.

- **`usePayment` state-machine duplication (#4).** This hook will still be 300+ lines after the refactor (it gets the mechanical updates above but keeps its custom `PaymentStatus` enum and callback wiring). Unifying its state machine with `useMethod` is a separate decision.

- **Solana provider error-validation duplication (#5).** The provider's five near-identical `response.errorCode` / required-field check blocks remain. Adding a bridge-level response validator is a separate PRD.

- **Request/response correlation as a named seam (#6).** `request.ts`'s reqId generation and matching stays inline; the mock bridge keeps its manually-maintained `METHOD_RESPONSE_MAP`. Extracting a `RequestCorrelator` is separate work.

- **`send.ifAvailable()`-style availability checks (#7).** Resolved indirectly here — all `*IfAvailable` functions now route through `callability()` — but the wider hygiene of "fire-and-forget calls in dev mode" (console warnings, mock bridge integration) is a separate UX concern.

- **Behavioral changes for non-React consumers.** While `Callability` lives in the bridge package and is available to any consumer, this PRD does not document a migration path for hypothetical vanilla-JS users. If a non-React consumer is found in the wild, that's separate.

## Further Notes

- This work is breaking for consumers of `isAvailable`, `checkAvailability`, `useIsMethodSupported`, `MethodNotSupportedError`, and the `supported: boolean` field on every call hook (renamed to `callable: boolean`). Pre-1.0 status (`miniapps-*@0.x` per recent commits) makes the breaks acceptable, but the changelog and any release notes should call them out plainly.

- The previous attempt to keep parallel boolean/SafeResult capability functions in the bridge (`isAvailable` and `checkAvailability`) created the friction this PRD removes. Avoid reintroducing parallel APIs for the same question in the future — see ADR-0004 for the rationale.

- The dev-mode behavior ("graceful, prints a console warning, doesn't crash") is preserved. All call hooks use Safe Track internally after this refactor; nothing throws out of a hook unless the host actively returns an error. Only direct consumers of Strict Track see the new immediate throws.

- The Telegram, Worldcoin, and Farcaster Mini App SDKs were surveyed during design. None of them surface a discriminated capability type — they expose boolean predicates and let consumers compose. Our deliberate deviation is recorded in ADR-0003. Future contributors comparing the SDK to those should not "fix" us into their pattern.

- Migration suggestion for downstream consumers: do a project-wide find/replace of the hook field destructuring (`{ supported }` → `{ callable }`), then run `tsc`. Most remaining type errors will be the deleted `MethodNotSupportedError` (replace with `BridgeMethodUnsupportedError` — same shape) and the deleted `useIsMethodSupported` (replace with `useCallable`, then narrow the discriminated union at the use site).
