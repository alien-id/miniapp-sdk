import { request as _request } from './request';
import { requestIfAvailable } from './request-safe';
import { send as _send } from './send';
import { sendIfAvailable } from './send-safe';

// Types
export type {
  EventName,
  EventPayload,
  MethodName,
  MethodPayload,
} from '@alien-id/miniapps-contract';
// Errors
export {
  BridgeError,
  BridgeMethodUnsupportedError,
  BridgeTimeoutError,
  BridgeUnavailableError,
  BridgeWindowUnavailableError,
} from './errors';
export type { EventListener } from './events';
// Events - subscribe and emit
export { emit, off, on } from './events';
// Launch params
export {
  clearMockLaunchParams,
  getLaunchParams,
  LaunchParamsError,
  mockLaunchParamsForDev,
  parseLaunchParams,
  retrieveLaunchParams,
} from './launch-params';
// Link interceptor
export type { LinkInterceptorOptions } from './link-interceptor';
export { enableLinkInterceptor } from './link-interceptor';
export type { RequestOptions } from './request';
// Request-safe types
export type { SafeRequestOptions } from './request-safe';
// Safe result types
export type { AvailabilityOptions, SafeResult } from './safe-result';
// Safe execution
export { isAvailable } from './safe-result';
export { requestIfAvailable, sendIfAvailable };
export type { EventMessage, Message, MethodMessage } from './transport';
export { isBridgeAvailable } from './utils';

/**
 * Sends a one-way method to the host app.
 * Also exposes `.ifAvailable()` for safe execution.
 */
export const send = Object.assign(_send, {
  ifAvailable: sendIfAvailable,
});

/**
 * Sends a request to the host app and waits for a response.
 * Also exposes `.ifAvailable()` for safe execution.
 */
export const request = Object.assign(_request, {
  ifAvailable: requestIfAvailable,
});
