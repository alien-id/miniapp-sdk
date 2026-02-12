import type { Version } from '../../utils';
import type {
  MethodName,
  MethodNameWithVersionedPayload,
  MethodVersionedPayload,
} from '../types/method-types';

export const releases: Record<
  Version,
  (
    | MethodName
    | {
        method: MethodNameWithVersionedPayload;
        param: MethodVersionedPayload<MethodNameWithVersionedPayload>;
      }
  )[]
> = {
  '0.0.9': ['app:ready'],
  '0.0.14': ['miniapp:close.ack', 'host.back.button:toggle'],
  '0.1.1': ['payment:request', 'clipboard:write', 'clipboard:read'],
  '0.1.3': ['link:open'],
  '0.2.4': ['haptic:impact', 'haptic:notification', 'haptic:selection'],
};
