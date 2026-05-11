import { describe, expect, test } from 'bun:test';
import { buildBearerChallenge, buildDPoPChallenge } from '../src/index';

describe('buildBearerChallenge', () => {
  test('emits scheme + realm auth-param', () => {
    expect(buildBearerChallenge({ realm: 'oauth' })).toBe(
      'Bearer realm="oauth"',
    );
  });

  test('emits error code as quoted auth-param after realm', () => {
    expect(
      buildBearerChallenge({ realm: 'oauth', error: 'invalid_token' }),
    ).toBe('Bearer realm="oauth", error="invalid_token"');
  });

  test('emits error_description as a quoted auth-param', () => {
    expect(
      buildBearerChallenge({
        realm: 'oauth',
        error: 'invalid_token',
        errorDescription: 'token expired',
      }),
    ).toBe(
      'Bearer realm="oauth", error="invalid_token", error_description="token expired"',
    );
  });

  test('emits scope as a space-delimited quoted auth-param', () => {
    expect(
      buildBearerChallenge({
        realm: 'oauth',
        error: 'insufficient_scope',
        scope: ['read', 'write'],
      }),
    ).toBe(
      'Bearer realm="oauth", error="insufficient_scope", scope="read write"',
    );
  });

  test('rejects CR/LF in any caller-supplied value (header injection)', () => {
    expect(() =>
      buildBearerChallenge({ realm: 'oauth\r\nX-Evil: 1' }),
    ).toThrow();
    expect(() =>
      buildBearerChallenge({
        realm: 'oauth',
        errorDescription: 'line1\nline2',
      }),
    ).toThrow();
  });

  test('rejects unescaped double-quote in caller values (quote injection)', () => {
    expect(() => buildBearerChallenge({ realm: 'oa"uth' })).toThrow();
    expect(() =>
      buildBearerChallenge({ realm: 'oauth', errorDescription: 'a"b' }),
    ).toThrow();
  });
});

describe('buildDPoPChallenge', () => {
  test('emits scheme + algs as a space-delimited quoted auth-param (RFC 9449 §7.1)', () => {
    expect(buildDPoPChallenge({ algs: ['EdDSA'] })).toBe('DPoP algs="EdDSA"');
  });

  test('emits multiple algs space-delimited inside one auth-param', () => {
    expect(buildDPoPChallenge({ algs: ['EdDSA', 'ES256'] })).toBe(
      'DPoP algs="EdDSA ES256"',
    );
  });

  test('emits error + error_description after algs', () => {
    expect(
      buildDPoPChallenge({
        algs: ['EdDSA'],
        error: 'invalid_token',
        errorDescription: 'cnf.jkt mismatch',
      }),
    ).toBe(
      'DPoP algs="EdDSA", error="invalid_token", error_description="cnf.jkt mismatch"',
    );
  });
});
