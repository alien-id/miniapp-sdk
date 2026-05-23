// Transitional convenience for back-compat imports: when the React
// package used to ship its own `ReactSDKError`/`MethodNotSupportedError`
// classes, consumers reached for them from `@alien-id/miniapps-react`.
// Those classes are gone (PRD-0001 collapsed all errors into bridge
// errors), but this module keeps the same import path working so
// existing app code that does
// `import { BridgeTimeoutError } from '@alien-id/miniapps-react'` (via
// this file or via the root) doesn't need a same-PR rewrite. New code
// should import from the root barrel, not from `./errors`.
export {
  BridgeBusyError,
  BridgeError,
  BridgeMethodUnsupportedError,
  BridgeTimeoutError,
  BridgeUnavailableError,
} from '@alien-id/miniapps-bridge';
