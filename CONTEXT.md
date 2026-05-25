# Alien Miniapp SDK

Vocabulary for the SDK that lets miniapps (webviews) talk to the Alien host app over an injected native bridge.

## Language

**Bridge**:
The injected native channel (`window.__miniAppsBridge__`) the host app uses to receive method calls from the miniapp and deliver events back.
_Avoid_: channel, transport, native interface, IPC

**Host**:
The Alien mobile app (iOS/Android) that hosts the miniapp webview and provides the bridge.
_Avoid_: parent app, container, shell

**Miniapp**:
A third-party webview application running inside the host.
_Avoid_: app, child, embed

**Method**:
A named operation the miniapp invokes on the host (e.g. `payment:request`). May or may not produce a response event.
_Avoid_: command, action, RPC, function call

**Event**:
A named message the host emits to the miniapp (e.g. `payment:response`). One-way, never has a response.
_Avoid_: message, notification, callback

**Contract Version**:
The semver string the host injects as `window.__ALIEN_CONTRACT_VERSION__`, declaring which methods and events it understands.
_Avoid_: protocol version, API version, SDK version

**Method Support**:
A boolean: "is this **Method** declared in the **Host**'s **Contract Version**?" Pure protocol question, no runtime state. Computed by `isMethodSupported(method, version)`.
_Avoid_: compatibility, availability (those are different — see below)

**Bridge Availability**:
A boolean: "is `window.__miniAppsBridge__` present right now?" Pure runtime question, no protocol state. Computed by `isBridgeAvailable()`.
_Avoid_: connected, ready, online

**Callable**:
"Can this **Method** be invoked right now?" Composes **Method Support** AND **Bridge Availability**. Surfaced as `callable: boolean` on call hooks (`useMethod`, `usePayment`, etc.) and as the discriminated `Callability` union from the dedicated `useCallable` query hook.
_Avoid_: usable, ready, enabled, supported

**Callability**:
The discriminated union describing why a **Method** is or isn't **Callable**. Three branches: `{ callable: true }`, `{ callable: false; reason: 'no-bridge' }`, or `{ callable: false; reason: 'host-outdated'; needs: Version; has: Version }`. Returned by `useCallable(method)` so consumers can render branch-specific UI without manual decomposition.
_Avoid_: status, availability, support state

**Dev Mode**:
The miniapp runs outside the **Host** (browser tab, local dev server). The **Bridge** is absent. The SDK degrades gracefully — fire-and-forget methods no-op with a console warning; request-response methods return an error in their `SafeResult`.
_Avoid_: standalone, offline, mock mode

**Safe Track**:
The bridge functions that never throw and return `SafeResult<T>`: `send.ifAvailable`, `request.ifAvailable`. Used by every React hook.
_Avoid_: graceful API, safe API

**Strict Track**:
The bridge functions that throw on failure: `send`, `request`. Used by imperative callers who want exceptions.
_Avoid_: throwing API, strict API

## Relationships

- A **Method** belongs to exactly one **Contract Version** (its minimum). A **Host** running a higher **Contract Version** supports all earlier **Methods**.
- A **Method** may declare one **Event** as its response, or none (fire-and-forget).
- **Callable** = **Method Support** ∧ **Bridge Availability**. Either alone is insufficient.
- In **Dev Mode**, **Bridge Availability** is false, therefore **Callable** is false for every **Method**, regardless of **Method Support**.

## Example dialogue

> **Dev:** "My `usePayment` hook shows `supported: false` in dev. The method exists in v0.1.1 and I'm on v0.2.0 — why is it not supported?"
> **SDK author:** "`supported` doesn't mean **Method Support** alone — it means **Callable**. In **Dev Mode** the **Bridge** isn't injected, so nothing is **Callable**. The protocol *would* support `payment:request` if you were inside the **Host**."

## Flagged ambiguities

- "supported" used to mean both **Method Support** (contract-only) and **Callable** (contract + bridge) — resolved: in React hooks, `supported` means **Callable**. The contract-only check is `isMethodSupported`, not exposed as a React `supported` field.
