import type { MethodName, Version } from '@alien-id/contract';

/**
 * Error thrown when a method is not supported by the current contract version.
 */
export class MethodNotSupportedError extends Error {
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
