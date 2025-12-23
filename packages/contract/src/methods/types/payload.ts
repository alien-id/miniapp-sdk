import type { UnionKeys } from '../../utils';

/**
 * Creates method payload types.
 */
export interface CreateMethodPayload<
  Payload = never,
  VersionedPayload extends UnionKeys<Payload> = never,
> {
  payload: Payload;
  versionedPayload: VersionedPayload;
}
