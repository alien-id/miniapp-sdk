/**
 * Base class for all bridge-related errors.
 * Allows catching all bridge errors with a single catch block.
 *
 * Forwards `options.cause` to `Error` (ES2022) so callers can chain the
 * underlying error without losing context:
 *
 * ```ts
 * try { JSON.parse(raw); }
 * catch (e) { throw new BridgeError('bad payload', { cause: e }); }
 * ```
 */
export class BridgeError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'BridgeError';
  }
}

/**
 * Thrown when the bridge interface is not available.
 * This occurs when the miniapp is not running in Alien App.
 */
export class BridgeUnavailableError extends BridgeError {
  constructor() {
    super('Bridge is not available. This SDK requires Alien App environment.');
    this.name = 'BridgeUnavailableError';
  }
}

/**
 * Thrown when a request times out.
 */
export class BridgeTimeoutError extends BridgeError {
  readonly method: string;
  readonly timeout: number;

  constructor(method: string, timeout: number) {
    super(`Request timeout: ${method} (${timeout}ms)`);
    this.name = 'BridgeTimeoutError';
    this.method = method;
    this.timeout = timeout;
  }
}

/**
 * Thrown when a hook-level call is rejected because an identical request is
 * already in flight. Distinct from {@link BridgeUnavailableError} so UI can
 * branch on "wait for the active call" vs. "bridge missing".
 */
export class BridgeBusyError extends BridgeError {
  readonly method: string;

  constructor(method: string) {
    super(`A "${method}" call is already in flight.`);
    this.name = 'BridgeBusyError';
    this.method = method;
  }
}

/**
 * Thrown when a Method is not Callable in the Host's current Contract Version.
 */
export class BridgeMethodUnsupportedError extends BridgeError {
  readonly method: string;
  readonly contractVersion: string;
  readonly minVersion: string | undefined;

  constructor(
    method: string,
    contractVersion: string,
    minVersion: string | undefined,
  ) {
    const message = minVersion
      ? `Method "${method}" requires version ${minVersion}, but host provides ${contractVersion}`
      : `Method "${method}" is not supported`;
    super(message);
    this.name = 'BridgeMethodUnsupportedError';
    this.method = method;
    this.contractVersion = contractVersion;
    this.minVersion = minVersion;
  }
}
