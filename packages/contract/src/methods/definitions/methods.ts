import type { Empty, WithReqId } from '../../utils';
import type { CreateMethodPayload } from '../types/payload';

/**
 * Methods interface defining all available methods and their payloads.
 * @schema
 */
export interface Methods {
  /**
   * Miniapp ready method.
   * Sent by the miniapp to notify the host app that it has loaded and is ready to be displayed.
   * @since 0.0.1
   * @schema
   */
  'app:ready': CreateMethodPayload<Empty>;
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
  /**
   * Ping request method for testing communication.
   * @since 0.0.1
   * @schema
   */
  'ping:request': CreateMethodPayload<
    WithReqId<{
      /**
       * Message to send in the ping request.
       * @since 0.0.1
       * @schema
       */
      message: string;
    }>
  >;
  /**
   * Miniapp close acknowledgment method.
   * Sent by the miniapp to notify the host app that it has completed cleanup and is ready to be closed.
   * Note that if the miniapp takes longer than 10 seconds to close, the host app will force close the miniapp.
   * @since 0.0.13
   * @schema
   */
  'miniapp:close.ack': CreateMethodPayload<Empty>;
}
