// Re-export Callability + Safe Track + types + errors from the bridge.
// React never throws its own SDK errors — it surfaces the bridge's typed
// errors directly so a single `instanceof BridgeUnavailableError` check
// works across hook state, direct calls, and any future framework binding.
export type {
  AvailabilityOptions,
  Callability,
  CallabilityOptions,
  LinkInterceptorOptions,
  RequestOptions,
  SafeRequestOptions,
  SafeResult,
} from '@alien-id/miniapps-bridge';
export {
  BridgeBusyError,
  BridgeError,
  BridgeMethodUnsupportedError,
  BridgeTimeoutError,
  BridgeUnavailableError,
  callability,
  request,
  send,
} from '@alien-id/miniapps-bridge';
// Re-export mock bridge from dedicated entrypoint
export type {
  MethodCall,
  MockBridgeInstance,
  MockBridgeOptions,
} from '@alien-id/miniapps-bridge/mock';
export { createMockBridge } from '@alien-id/miniapps-bridge/mock';
// Re-export types from contract for convenience
export type {
  EventName,
  EventPayload,
  HapticImpactStyle,
  HapticNotificationType,
  MethodName,
  MethodPayload,
  Version,
} from '@alien-id/miniapps-contract';
// Provider
export { AlienProvider, type AlienProviderProps } from './context';
// Hooks
export {
  type ClipboardErrorCode,
  type NotificationPermissionStatus,
  type PaymentCallbacks,
  type PaymentErrorCode,
  type PaymentParams,
  type PaymentResponseStatus,
  type PaymentResult,
  type PaymentStatus,
  type UseBackButtonReturn,
  type UseClipboardOptions,
  type UseClipboardReturn,
  type UseCloseReturn,
  type UseHapticReturn,
  type UseMethodExecuteResult,
  type UseNotificationPermissionOptions,
  type UseNotificationPermissionReturn,
  type UsePaymentOptions,
  type UsePaymentReturn,
  useAlien,
  useBackButton,
  useCallable,
  useClipboard,
  useClose,
  useEvent,
  useHaptic,
  useLaunchParams,
  useLinkInterceptor,
  useMethod,
  useNotificationPermission,
  usePayment,
} from './hooks';
