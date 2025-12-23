import { useAlien } from '../context';

/**
 * Hook to get the auth token injected by the host app.
 *
 * The token is injected by the Alien App via:
 * `window.__ALIEN_AUTH_TOKEN__ = 'token'`
 *
 * @returns The auth token string, or `undefined` if not available.
 *
 * @example
 * ```tsx
 * import { useAuthToken } from '@alien-id/react';
 *
 * function MyComponent() {
 *   const token = useAuthToken();
 *
 *   if (!token) {
 *     return <div>Waiting for authentication...</div>;
 *   }
 *
 *   return <div>Authenticated!</div>;
 * }
 * ```
 */
export function useAuthToken(): string | undefined {
  const { authToken } = useAlien();
  return authToken;
}
