import { expect, test } from 'bun:test';
import * as ReactPkg from '../src/index';

// The public value surface of @alien-id/miniapps-react, locked as a
// sorted set. Bidirectional: any new export AND any accidental internal
// leak fail this test. To change the surface, edit this list and the
// readers will know they crossed a public-API boundary.
//
// If a hook starts returning an error type, the matching BridgeError
// subclass MUST be re-exported here so consumers can `instanceof`-check
// it without reaching into the bridge package. Pre-fix regression:
// `BridgeBusyError` was surfaced by `useClipboard` and
// `useNotificationPermission` but was missing from this list — consumers
// could observe the error but not narrow on it.
const EXPECTED_VALUE_EXPORTS = [
  // Provider
  'AlienProvider',
  // Bridge re-exports
  'callability',
  'createMockBridge',
  'request',
  'send',
  // Errors — every BridgeError subclass any hook can return must appear here.
  'BridgeBusyError',
  'BridgeError',
  'BridgeMethodUnsupportedError',
  'BridgeTimeoutError',
  'BridgeUnavailableError',
  // Hooks
  'useAlien',
  'useBackButton',
  'useCallable',
  'useClipboard',
  'useClose',
  'useEvent',
  'useHaptic',
  'useLaunchParams',
  'useLinkInterceptor',
  'useMethod',
  'useNotificationPermission',
  'usePayment',
].sort();

test('react package value surface matches the expected set exactly', () => {
  const actual = Object.keys(ReactPkg).sort();
  expect(actual).toEqual(EXPECTED_VALUE_EXPORTS);
});

test('every Bridge*Error subclass returned by hooks is a function', () => {
  // Hand-derived from the hook implementations. If a hook adds a new
  // BridgeError subclass to its return surface, append it here AND to the
  // root re-exports in src/index.ts.
  const HOOK_SURFACED_ERRORS = [
    'BridgeBusyError',
    'BridgeMethodUnsupportedError',
    'BridgeTimeoutError',
    'BridgeUnavailableError',
  ];
  for (const name of HOOK_SURFACED_ERRORS) {
    expect(ReactPkg).toHaveProperty(name);
    expect(typeof (ReactPkg as Record<string, unknown>)[name]).toBe(
      'function',
    );
  }
});
