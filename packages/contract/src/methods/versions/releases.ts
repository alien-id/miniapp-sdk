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
  '0.0.1': ['auth.init:request'],
  '0.0.8': ['ping:request'],
  '0.0.9': ['app:ready'],
  '0.0.13': ['miniapp:close.ack', 'host.back.button:toggle'],
};
