import { describe, expect, test } from 'bun:test';
import {
  FIRE_AND_FORGET_METHOD_NAMES,
  getResponseEvent,
  METHOD_NAMES,
  REQUEST_METHOD_NAMES,
} from '../src';

/**
 * Runtime guards on the exported method/response-event surface.
 *
 * The exhaustive `satisfies` clause in `response-event.ts` already
 * enforces at build time that every method is classified; these tests
 * verify the runtime arrays line up with that classification.
 */

describe('METHOD_NAMES surface', () => {
  test('REQUEST_METHOD_NAMES and FIRE_AND_FORGET_METHOD_NAMES partition METHOD_NAMES', () => {
    const all = new Set<string>(METHOD_NAMES);
    const req = new Set<string>(REQUEST_METHOD_NAMES);
    const ff = new Set<string>(FIRE_AND_FORGET_METHOD_NAMES);

    // Disjoint
    for (const m of req) expect(ff.has(m)).toBe(false);

    // Covering — every method belongs to exactly one partition
    for (const m of all) expect(req.has(m) || ff.has(m)).toBe(true);
    expect(req.size + ff.size).toBe(all.size);
  });

  test('every method appears exactly once in METHOD_NAMES', () => {
    expect(new Set(METHOD_NAMES).size).toBe(METHOD_NAMES.length);
  });
});

describe('getResponseEvent', () => {
  test('returns a "<domain>:<action>" string for every request method', () => {
    for (const method of REQUEST_METHOD_NAMES) {
      const event = getResponseEvent(method);
      expect(event, `${method} has no response event`).toMatch(/.+:.+/);
    }
  });

  test('each request method maps to a unique response event', () => {
    const events = REQUEST_METHOD_NAMES.map((m) => getResponseEvent(m));
    expect(new Set(events).size).toBe(events.length);
  });
});
