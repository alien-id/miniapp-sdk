import { expect, test } from 'bun:test';
import * as bridge from '../src/index';

test('should export on, off, emit', () => {
  expect(typeof bridge.on).toBe('function');
  expect(typeof bridge.off).toBe('function');
  expect(typeof bridge.emit).toBe('function');
});

test('should export request', () => {
  expect(typeof bridge.request).toBe('function');
});

test('should export types', () => {
  expect(bridge).toBeDefined();
});
