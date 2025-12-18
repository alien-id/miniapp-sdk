import { beforeEach, expect, test } from 'bun:test';
import { emit, off, on } from '../src/events';

beforeEach(() => {
  // Clean up listeners between tests
});

test('on - should register event listener', () => {
  let received = false;
  const removeListener = on('auth_data', () => {
    received = true;
  });

  emit('auth_data', { token: 'test-token', req_id: '123' });
  expect(received).toBe(true);

  removeListener();
});

test('on - should remove listener when cleanup function is called', () => {
  let callCount = 0;
  const removeListener = on('auth_data', () => {
    callCount++;
  });

  emit('auth_data', { token: 'test-token', req_id: '123' });
  expect(callCount).toBe(1);

  removeListener();
  emit('auth_data', { token: 'test-token', req_id: '456' });
  expect(callCount).toBe(1);
});

test('off - should remove specific listener', () => {
  let callCount1 = 0;
  let callCount2 = 0;

  const listener1 = () => {
    callCount1++;
  };
  const listener2 = () => {
    callCount2++;
  };

  on('auth_data', listener1);
  on('auth_data', listener2);

  emit('auth_data', { token: 'test-token', req_id: '123' });
  expect(callCount1).toBe(1);
  expect(callCount2).toBe(1);

  off('auth_data', listener1);
  emit('auth_data', { token: 'test-token', req_id: '456' });
  expect(callCount1).toBe(1);
  expect(callCount2).toBe(2);
});

test('emit - should emit to all registered listeners', () => {
  let callCount = 0;
  on('auth_data', () => {
    callCount++;
  });
  on('auth_data', () => {
    callCount++;
  });

  emit('auth_data', { token: 'test-token', req_id: '123' });
  expect(callCount).toBe(2);
});

test('emit - should pass correct payload', () => {
  let receivedPayload: unknown = null;
  on('auth_data', (payload) => {
    receivedPayload = payload;
  });

  const testPayload = { token: 'test-token', req_id: '123' };
  emit('auth_data', testPayload);
  expect(receivedPayload).toEqual(testPayload);
});
