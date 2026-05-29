import type { Version } from '../../utils';
import type {
  MethodName,
  MethodNameWithVersionedPayload,
  MethodVersionedPayload,
} from '../types/method-types';
import { ascendingReleaseVersions } from './compare';
import { type ReleaseItem, releases } from './releases';

/**
 * Find the earliest release that introduced a method (or a versioned
 * payload) within a release table.
 *
 * Walks the table's versions in **semver-ascending order** — the same
 * ordering `getMethodMinVersion` uses — so the two never diverge. Raw
 * `Object.keys` order would only agree by authoring convention; an
 * out-of-order table edit would silently return a later version.
 *
 * Exported for testing the ordering invariant against synthetic tables.
 *
 * @returns the earliest matching version, or `null` if no release lists it.
 */
export function selectReleaseVersion(
  table: Record<string, readonly ReleaseItem[]>,
  method: MethodName,
  payload?: MethodVersionedPayload<MethodNameWithVersionedPayload>,
): Version | null {
  const versions = ascendingReleaseVersions(Object.keys(table) as Version[]);
  return (
    versions.find((version) => {
      const releaseItems = table[version];
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
  return selectReleaseVersion(releases, method, payload);
}
