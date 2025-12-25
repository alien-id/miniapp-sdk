/**
 * Base class for all bridge-related errors.
 * Allows catching all bridge errors with a single catch block.
 */
export class BridgeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BridgeError';
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, BridgeError);
    }
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
 * Thrown when window is undefined (e.g., SSR scenarios).
 */
export class BridgeWindowUnavailableError extends BridgeError {
  constructor() {
    super('Window is not available. This SDK requires a browser environment.');
    this.name = 'BridgeWindowUnavailableError';
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
