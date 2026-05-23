import { expect, test } from 'bun:test';
import { BridgeError } from '../src/errors';
import { LaunchParamsError } from '../src/launch-params';

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
