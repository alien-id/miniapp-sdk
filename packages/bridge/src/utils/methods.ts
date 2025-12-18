import type { MethodName, MethodPayloads } from '@alm/contract';
import type { MethodRequest, MethodResponse } from '../messages';

/**
 * Build a method request with type safety
 */
export function buildMethodRequest<T extends MethodName>(
  name: T,
  payload: MethodPayloads[T],
): MethodRequest<T> {
  return {
    type: 'method',
    name,
    payload,
  };
}

/**
 * Parse a method response with type safety
 */
export function parseMethodResponse<T extends MethodName>(
  _name: T,
  response: unknown,
): MethodResponse<T> {
  // Validate response structure
  if (
    typeof response !== 'object' ||
    response === null ||
    !('type' in response) ||
    !('name' in response)
  ) {
    throw new Error('Invalid method response format');
  }

  return response as MethodResponse<T>;
}
