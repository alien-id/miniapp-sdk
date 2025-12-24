// Re-export request options type
export type { RequestOptions } from '@alien-id/bridge';
// Re-export types from contract for convenience
export type {
  EventName,
  EventPayload,
  MethodName,
  MethodPayload,
  Version,
} from '@alien-id/contract';
// Re-export version utilities from contract
export { getMethodMinVersion, isMethodSupported } from '@alien-id/contract';
// Context & Provider
export { AlienProvider, type AlienProviderProps, useAlien } from './context';
// Errors
export {
  BridgeError,
  BridgeTimeoutError,
  BridgeUnavailableError,
  BridgeWindowUnavailableError,
  MethodNotSupportedError,
  ReactSDKError,
} from './errors';
// Hooks
export {
  type MethodSupportResult,
  type UseRequestOptions,
  useAuthToken,
  useBridgeAvailable,
  useContractVersion,
  useEvent,
  useMethodSupported,
  useRequest,
} from './hooks';
