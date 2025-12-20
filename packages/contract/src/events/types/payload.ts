/**
 * Creates event payload types.
 */
export interface CreateEventPayload<Payload = never> {
  payload: Payload;
}
