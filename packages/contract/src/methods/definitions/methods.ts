import type { WithReqId } from '../../utils';
import type { CreateMethodPayload } from '../types/payload';

/**
 * Methods interface defining all available methods and their payloads.
 * @schema
 */
export interface Methods {
  /**
   * Authentication initialization request method.
   * @since 0.0.1
   * @schema
   */
  'auth.init:request': CreateMethodPayload<
    WithReqId<{
      /**
       * Application identifier.
       * @since 0.0.1
       * @schema
       */
      appId: string;
      /**
       * Challenge string for authentication.
       * @since 0.0.1
       * @schema
       */
      challenge: string;
    }>
  >;
}
