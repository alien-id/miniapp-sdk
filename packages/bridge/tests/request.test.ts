import { expect, test } from 'bun:test';
import { emit } from '../src/events';
import { request } from '../src/request';

test('request - should wait for response with matching req_id', async () => {
  const customReqId = 'test-req-123';
  const promise = request(
    'get_auth_data',
    { token: 'test-token' },
    { reqId: customReqId },
  );

  setTimeout(() => {
    emit('auth_data', { token: 'test-token', req_id: customReqId });
  }, 10);

  const result = await promise;
  expect(result).toBeDefined();
  expect((result as { req_id?: string }).req_id).toBe(customReqId);
}, 100);

test('request - should support custom req_id', async () => {
  const customReqId = 'custom-123';
  const promise = request(
    'get_auth_data',
    { token: 'test-token' },
    { reqId: customReqId },
  );

  setTimeout(() => {
    emit('auth_data', { token: 'test-token', req_id: customReqId });
  }, 10);

  const result = await promise;
  expect((result as { req_id?: string }).req_id).toBe(customReqId);
}, 100);

test('request - should timeout if no response', async () => {
  const promise = request(
    'get_auth_data',
    { token: 'test-token' },
    { timeout: 50 },
  );

  expect(promise).rejects.toThrow('Request timeout');
}, 100);

test('request - should ignore responses with different req_id', async () => {
  const promise = request(
    'get_auth_data',
    { token: 'test-token' },
    { reqId: 'req-1' },
  );

  setTimeout(() => {
    emit('auth_data', { token: 'test-token', req_id: 'req-2' });
  }, 10);

  setTimeout(() => {
    emit('auth_data', { token: 'test-token', req_id: 'req-1' });
  }, 50);

  const result = await promise;
  expect(result.req_id).toBe('req-1');
}, 100);
