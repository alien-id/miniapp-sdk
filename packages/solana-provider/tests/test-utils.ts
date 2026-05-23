/**
 * Shape-mirror classes for the bridge error hierarchy. The solana-provider
 * tests `mock.module('@alien-id/miniapps-bridge', ...)`, which replaces the
 * real classes; production code uses `error instanceof Bridge*Error` to
 * branch, so the mocks must expose the same constructor signature and own
 * properties as the real classes in `packages/bridge/src/errors.ts`.
 */

export class BridgeMethodUnsupportedError extends Error {
  readonly method: string;
  readonly contractVersion: string;
  readonly minVersion: string | undefined;
  constructor(method: string, contractVersion: string, minVersion?: string) {
    super(`${method} requires ${minVersion}`);
    this.name = 'BridgeMethodUnsupportedError';
    this.method = method;
    this.contractVersion = contractVersion;
    this.minVersion = minVersion;
  }
}

export class BridgeUnavailableError extends Error {
  constructor() {
    super('Bridge unavailable');
    this.name = 'BridgeUnavailableError';
  }
}

export class BridgeTimeoutError extends Error {
  readonly method: string;
  readonly timeout: number;
  constructor(method: string, timeout: number) {
    super(`Timeout: ${method}`);
    this.name = 'BridgeTimeoutError';
    this.method = method;
    this.timeout = timeout;
  }
}

/** WALLET_ERROR mock matching the production contract. */
export const WALLET_ERROR_MOCK = {
  USER_REJECTED: 5000,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  REQUEST_EXPIRED: 8000,
} as const;
