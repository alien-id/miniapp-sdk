import { expect, test } from 'bun:test';
import { BridgeError } from '../src/errors';
import { LaunchParamsError, parseLaunchParams } from '../src/launch-params';

test('LaunchParamsError - is a BridgeError so a single catch handles all', () => {
  const err = new LaunchParamsError('missing authToken');

  expect(err).toBeInstanceOf(BridgeError);
  expect(err).toBeInstanceOf(Error);
  expect(err.name).toBe('LaunchParamsError');
  expect(err.message).toBe('missing authToken');
});

test('LaunchParamsError - forwards options.cause', () => {
  const cause = new SyntaxError('Unexpected token');
  const err = new LaunchParamsError('parse failed', { cause });

  expect(err.cause).toBe(cause);
});

test('parseLaunchParams - throws LaunchParamsError when authToken is missing', () => {
  expect(() => parseLaunchParams('{}')).toThrow(LaunchParamsError);
});

test('parseLaunchParams - throws LaunchParamsError when authToken is not a string', () => {
  expect(() => parseLaunchParams('{"authToken": 123}')).toThrow(
    LaunchParamsError,
  );
  expect(() => parseLaunchParams('{"authToken": null}')).toThrow(
    LaunchParamsError,
  );
  expect(() => parseLaunchParams('{"authToken": {}}')).toThrow(
    LaunchParamsError,
  );
});

test('parseLaunchParams - throws LaunchParamsError on invalid JSON, chaining cause', () => {
  try {
    parseLaunchParams('not-json{');
    throw new Error('expected throw');
  } catch (e) {
    expect(e).toBeInstanceOf(LaunchParamsError);
    expect((e as LaunchParamsError).cause).toBeInstanceOf(SyntaxError);
  }
});

test('parseLaunchParams - returns the parsed payload when authToken is a string', () => {
  const params = parseLaunchParams(
    JSON.stringify({ authToken: 'tok', contractVersion: '1.0.0' }),
  );
  expect(params.authToken).toBe('tok');
  expect(params.contractVersion).toBe('1.0.0');
});
