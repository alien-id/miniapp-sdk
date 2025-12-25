import type { WithReqId } from '../../utils';
import type { CreateEventPayload } from '../types/payload';

/**
 * Events interface defining all available events and their payloads.
 * @since 0.0.1
 * @schema
 */
export interface Events {
  /**
   * Authentication initialization response event with token.
   * @since 0.0.1
   * @schema
   */
  'auth.init:response.token': CreateEventPayload<
    WithReqId<{
      /**
       * Authentication token.
       * @since 0.0.1
       * @schema
       */
      token: string;
    }>
  >;
  /**
   * Ping response event for testing communication.
   * @since 0.0.1
   * @schema
   */
  'ping:response': CreateEventPayload<
    WithReqId<{
      /**
       * Echoed message from the ping request.
       * @since 0.0.1
       * @schema
       */
      message: string;
      /**
       * Timestamp when the ping was processed.
       * @since 0.0.1
       * @schema
       */
      timestamp: string;
    }>
  >;
}
