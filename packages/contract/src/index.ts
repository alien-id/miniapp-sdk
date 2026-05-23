// Public surface of @alien-id/miniapps-contract. Grouped roughly by
// concern (events, launch params, methods, version utilities, shared
// utility types) so editors that follow exports surface the right
// neighbourhood for each symbol.

export type { Events } from './events/events';
export type {
  CreateEventPayload,
  EventName,
  EventPayload,
} from './events/types';
export type {
  DisplayMode,
  LaunchParams,
  Platform,
  SafeAreaInsets,
} from './launch-params';
export { DISPLAY_MODES, PLATFORMS } from './launch-params';
export type { Methods } from './methods/methods';
export type {
  CreateMethodPayload,
  MethodName,
  MethodNameWithVersionedPayload,
  MethodPayload,
  MethodResponseEvent,
  MethodResponseEvents,
  MethodVersionedPayload,
  RequestMethodName,
} from './methods/types';
export {
  getMethodMinVersion,
  getReleaseVersion,
  isMethodSupported,
  releases,
} from './methods/versions';
export type {
  HapticImpactStyle,
  HapticNotificationType,
  NotificationPermissionStatus,
  PaymentErrorCode,
  PaymentTestScenario,
  PaymentWebhookStatus,
  SolanaChain,
  SolanaCommitment,
  Version,
  WalletSolanaErrorCode,
} from './utils';
export { WALLET_ERROR } from './utils';
