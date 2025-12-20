import type { WithReqId } from '../../utils';

/**
 * Events interface defining all available events and their payloads.
 * @since 0.0.1
 * @schema
 */
export interface Events {
  /**
   * Authentication initialization token event.
   * @since 0.0.1
   * @schema
   */
  'auth::init::token': WithReqId<{
    /**
     * Authentication token.
     * @since 0.0.1
     * @schema
     */
    token: string;
  }>;
}
