import {
  BridgeError,
  BridgeTimeoutError,
  BridgeUnavailableError,
  BridgeWindowUnavailableError,
} from '@alien_org/bridge';
import type { MethodName, Version } from '@alien_org/contract';

/**
 * Base class for all React SDK errors.
 */
export class ReactSDKError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReactSDKError';
  }
}

/**
 * Error thrown when a method is not supported by the current contract version.
 */
export class MethodNotSupportedError extends ReactSDKError {
  readonly method: MethodName;
  readonly contractVersion: Version | undefined;
  readonly minVersion: Version | undefined;

  constructor(
    method: MethodName,
    contractVersion: Version | undefined,
    minVersion: Version | undefined,
  ) {
    const message = minVersion
      ? `Method "${method}" requires version ${minVersion}, but host provides ${contractVersion ?? 'unknown'}`
      : `Method "${method}" is not supported`;
    super(message);
    this.name = 'MethodNotSupportedError';
    this.method = method;
    this.contractVersion = contractVersion;
    this.minVersion = minVersion;
  }
}

// Re-export bridge errors for convenience
export {
  BridgeError,
  BridgeTimeoutError,
  BridgeUnavailableError,
  BridgeWindowUnavailableError,
};
