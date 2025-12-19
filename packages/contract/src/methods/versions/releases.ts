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
  '0.0.1': ['auth::init::request'],
};
