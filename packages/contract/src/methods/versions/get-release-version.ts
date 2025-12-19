import type { Version } from '../../utils';
import type {
  MethodName,
  MethodNameWithVersionedPayload,
  MethodVersionedPayload,
} from '../types/method-types';
import { releases } from './releases';

/**
 * @returns Version of the specified method parameter release. Returns `null`
 * if passed method or parameter are unknown.
 * @param method - method name
 * @param param - method parameter
 */
export function getReleaseVersion<M extends MethodNameWithVersionedPayload>(
  method: M,
  payload: MethodVersionedPayload<M>,
): Version | null;

export function getReleaseVersion(method: MethodName): Version | null;
export function getReleaseVersion(
  method: MethodName,
  payload?: MethodVersionedPayload<MethodNameWithVersionedPayload>,
): Version | null {
  const versions = Object.keys(releases) as Version[];
  return (
    versions.find((version) => {
      const releaseItems = releases[version];
      if (!releaseItems) return false;
      return releaseItems.some((item) => {
        if (payload) {
          return (
            typeof item === 'object' &&
            item.method === method &&
            item.param === payload
          );
        }
        return item === method;
      });
    }) || null
  );
}
