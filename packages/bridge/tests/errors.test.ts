import { expect, test } from 'bun:test';
import {
  BridgeError,
  BridgeMethodUnsupportedError,
  BridgeTimeoutError,
  BridgeUnavailableError,
} from '../src/errors';

test('BridgeError - accepts and exposes cause via options', () => {
  const cause = new TypeError('boom');
  const err = new BridgeError('wrap', { cause });

  expect(err.cause).toBeInstanceOf(TypeError);
  expect(err.cause).toBe(cause);
  expect(err.message).toBe('wrap');
  expect(err).toBeInstanceOf(Error);
});

test('BridgeError - cause is optional', () => {
  const err = new BridgeError('plain');
  expect(err.cause).toBeUndefined();
});

test('BridgeError subclasses - keep their existing constructors working', () => {
  const unavailable = new BridgeUnavailableError();
  expect(unavailable).toBeInstanceOf(BridgeError);
  expect(unavailable.name).toBe('BridgeUnavailableError');

  const timeout = new BridgeTimeoutError('payment:request', 5000);
  expect(timeout).toBeInstanceOf(BridgeError);
  expect(timeout.method).toBe('payment:request');
  expect(timeout.timeout).toBe(5000);

  const unsupported = new BridgeMethodUnsupportedError(
    'payment:request',
    '0.1.0',
    '0.2.0',
  );
  expect(unsupported).toBeInstanceOf(BridgeError);
  expect(unsupported.method).toBe('payment:request');
  expect(unsupported.contractVersion).toBe('0.1.0');
  expect(unsupported.minVersion).toBe('0.2.0');
});

test('BridgeUnavailableError - stack does not contain BridgeError base frame', () => {
  const err = new BridgeUnavailableError();
  // The base BridgeError constructor frame should be stripped so users see
  // the subclass as the throw site, not the abstract base.
  expect(err.stack ?? '').not.toContain('at new BridgeError');
});
