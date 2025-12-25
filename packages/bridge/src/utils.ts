import { getBridge } from './transport';

/**
 * Checks if the bridge is available.
 * Utility function for checking bridge availability.
 * @returns `true` if bridge is available, `false` otherwise.
 */
export function isBridgeAvailable(): boolean {
  return getBridge() !== undefined;
}
