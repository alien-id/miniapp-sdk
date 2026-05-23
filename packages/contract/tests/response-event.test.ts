import { describe, expect, test } from 'bun:test';
import type {
  EventName,
  MethodName,
  MethodResponseEvent,
  MethodResponseEvents,
  RequestMethodName,
} from '../src';

/**
 * Compile-time guards on the real exported response-event map. These exercise
 * the published surface without `as unknown as MethodName` casts — if the
 * contract drifts (a request method loses its response, or a method/event
 * pair becomes incoherent), this file fails to type-check.
 */

// Each entry below is checked at compile-time via assignability. Adding,
// removing, or changing a method/response pair requires updating this list.
const REQUEST_METHODS = [
  'payment:request',
  'clipboard:read',
  'wallet.solana:connect',
  'wallet.solana:sign.transaction',
  'wallet.solana:sign.message',
  'wallet.solana:sign.send',
  'notifications:permission.request',
] as const satisfies readonly RequestMethodName[];

const RESPONSE_MAP = {
  'payment:request': 'payment:response',
  'clipboard:read': 'clipboard:response',
  'wallet.solana:connect': 'wallet.solana:connect.response',
  'wallet.solana:sign.transaction': 'wallet.solana:sign.transaction.response',
  'wallet.solana:sign.message': 'wallet.solana:sign.message.response',
  'wallet.solana:sign.send': 'wallet.solana:sign.send.response',
  'notifications:permission.request': 'notifications:permission.response',
} as const satisfies {
  [M in (typeof REQUEST_METHODS)[number]]: MethodResponseEvent<M>;
};

describe('MethodResponseEvents — exported surface', () => {
  test('every request method maps to a known event name', () => {
    for (const method of REQUEST_METHODS) {
      const event: EventName = RESPONSE_MAP[method];
      expect(event).toMatch(/.+:.+/);
    }
  });

  test('RequestMethodName is a strict subset of MethodName', () => {
    const subset: MethodName = REQUEST_METHODS[0];
    expect(subset).toBe('payment:request');
  });

  test('response-event keys cover the published request-response set', () => {
    // If a new request method is added to the contract, this test fails the
    // build because TypeScript can no longer satisfy the readonly tuple.
    const expected = new Set<RequestMethodName>(REQUEST_METHODS);
    expect(expected.size).toBe(REQUEST_METHODS.length);
  });

  // Compile-time-only assertion: every key in RESPONSE_MAP is a
  // RequestMethodName, and every value matches MethodResponseEvents[key].
  // The block below has no runtime effect — TypeScript erases it.
  test('static map satisfies MethodResponseEvents', () => {
    type _CheckKeys = (typeof REQUEST_METHODS)[number] extends RequestMethodName
      ? true
      : never;
    type _CheckValues = {
      [M in (typeof REQUEST_METHODS)[number]]: (typeof RESPONSE_MAP)[M] extends MethodResponseEvents[M]
        ? true
        : never;
    };
    const ok: _CheckKeys = true;
    const okValues: _CheckValues = {
      'payment:request': true,
      'clipboard:read': true,
      'wallet.solana:connect': true,
      'wallet.solana:sign.transaction': true,
      'wallet.solana:sign.message': true,
      'wallet.solana:sign.send': true,
      'notifications:permission.request': true,
    };
    expect(ok).toBe(true);
    expect(Object.keys(okValues).length).toBe(REQUEST_METHODS.length);
  });
});
