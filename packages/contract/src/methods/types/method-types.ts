import type { If, IsNever } from '../../utils';
import type { Methods } from '../definitions/methods';

export type MethodName = keyof Methods;

export type MethodPayload<M extends MethodName> = Methods[M]['payload'];

/**
 * Method names which have versioned payload.
 */
export type MethodNameWithVersionedPayload = {
  [M in MethodName]: If<IsNever<Methods[M]['versionedPayload']>, never, M>;
}[MethodName];

/**
 * Method payload which appear only in the specific version.
 */
export type MethodVersionedPayload<M extends MethodNameWithVersionedPayload> =
  Methods[M]['versionedPayload'];
