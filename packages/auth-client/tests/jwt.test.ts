import { beforeAll, describe, expect, test } from 'bun:test';
import * as jose from 'jose';
import { type AuthClient, createAuthClient } from '../src/index';

describe('AuthClient tests', () => {
  const issuer = 'https://sso.alien-api.com';
  const audience = '00000001040000000000000800000000';
  let publicKeyJwk: jose.JWK;
  let privateKey: jose.CryptoKey;
  let client: AuthClient;

  beforeAll(async () => {
    const { publicKey, privateKey: priv } = await jose.generateKeyPair(
      'RS256',
      {
        modulusLength: 2048,
      },
    );
    privateKey = priv;
    publicKeyJwk = await jose.exportJWK(publicKey);
    publicKeyJwk.alg = 'RS256';
    publicKeyJwk.use = 'sig';

    const jwks = jose.createLocalJWKSet({
      keys: [publicKeyJwk],
    });

    client = createAuthClient({ jwks, issuer, audience });
  });

  test('should verify a valid token', async () => {
    const payload = {
      sub: '00000001010000000000000200000000',
      iss: issuer,
      aud: [audience],
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
      client_id: audience,
      jti: 'jti-valid',
    };

    const token = await new jose.SignJWT(payload)
      .setProtectedHeader({ alg: 'RS256', typ: 'at+jwt' })
      .sign(privateKey);

    const result = await client.verifyToken(token);
    expect(result.sub).toBe('00000001010000000000000200000000');
  });

  test('createAuthClient accepts default audience-only config', () => {
    expect(() => createAuthClient({ audience: 'test-audience' })).not.toThrow();
  });

  test('RFC 8414 §2: createAuthClient rejects non-HTTPS jwksUrl', () => {
    expect(() =>
      createAuthClient({
        audience: 'test-audience',
        jwksUrl: 'http://sso.example.com/oauth/jwks',
      }),
    ).toThrow(/https/i);
  });

  test('RFC 8414 §2: createAuthClient accepts HTTPS jwksUrl', () => {
    expect(() =>
      createAuthClient({
        audience: 'test-audience',
        jwksUrl: 'https://sso.example.com/oauth/jwks',
      }),
    ).not.toThrow();
  });

  test('should throw error for expired token', async () => {
    const payload = {
      sub: '00000001010000000000000200000000',
      iss: issuer,
      aud: [audience],
      exp: Math.floor(Date.now() / 1000) - 10, // Expired 10 seconds ago
      iat: Math.floor(Date.now() / 1000) - 20,
      client_id: audience,
      jti: 'jti-expired',
    };

    const token = await new jose.SignJWT(payload)
      .setProtectedHeader({ alg: 'RS256', typ: 'at+jwt' })
      .sign(privateKey);

    expect(client.verifyToken(token)).rejects.toThrow(/exp/);
  });

  test('should throw error for wrong signature', async () => {
    const { privateKey: otherPrivateKey } = await jose.generateKeyPair('RS256');

    const token = await new jose.SignJWT({
      sub: '00000001010000000000000200000000',
      iss: issuer,
      aud: [audience],
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
      client_id: audience,
      jti: 'jti-wrongsig',
    })
      .setProtectedHeader({ alg: 'RS256', typ: 'at+jwt' })
      .sign(otherPrivateKey);

    expect(client.verifyToken(token)).rejects.toThrow(/signature/);
  });

  test('should throw error for malformed token', async () => {
    const token = 'not.a.valid.token';
    expect(client.verifyToken(token)).rejects.toThrow();
  });

  test('should throw error for wrong algorithm', async () => {
    const secret = new TextEncoder().encode('strong_secret_key_here');
    const token = await new jose.SignJWT({
      sub: '00000001010000000000000200000000',
      iss: issuer,
      aud: [audience],
    })
      .setProtectedHeader({ alg: 'HS256' })
      .sign(secret);

    expect(client.verifyToken(token)).rejects.toThrow();
  });

  test('RFC 7515 §10.7: unsigned tokens (alg=none) are rejected', async () => {
    // Construct a "none"-alg JWS by hand. jose refuses to mint these, so we
    // assemble the b64url segments ourselves to lock in that the verifier
    // refuses them via its algorithms allowlist.
    const enc = (obj: object) =>
      Buffer.from(JSON.stringify(obj))
        .toString('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
    const header = enc({ alg: 'none', typ: 'at+jwt' });
    const payload = enc({
      sub: '00000001010000000000000200000000',
      iss: issuer,
      aud: [audience],
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
      client_id: audience,
      jti: 'jti-none',
    });
    const token = `${header}.${payload}.`;

    expect(client.verifyToken(token)).rejects.toThrow();
  });

  test('should throw error if zod validation fails', async () => {
    const token = await new jose.SignJWT({ iss: issuer, aud: [audience] })
      .setProtectedHeader({ alg: 'RS256', typ: 'at+jwt' })
      .setExpirationTime('1h')
      .sign(privateKey);

    expect(client.verifyToken(token)).rejects.toThrow();
  });

  test("should throw error if token is signed but has no 'exp' claim", async () => {
    const token = await new jose.SignJWT({
      sub: '00000001010000000000000200000000',
      iss: issuer,
      aud: [audience],
      iat: Math.floor(Date.now() / 1000),
      client_id: audience,
      jti: 'jti-noexp',
    })
      .setProtectedHeader({ alg: 'RS256', typ: 'at+jwt' })
      .sign(privateKey);

    expect(client.verifyToken(token)).rejects.toThrow();
  });

  test('RFC 9068 §4: RS256 with typ=at+jwt verifies', async () => {
    const token = await new jose.SignJWT({
      sub: '00000001010000000000000200000000',
      iss: issuer,
      aud: [audience],
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
      client_id: audience,
      jti: 'jti-1',
    })
      .setProtectedHeader({ alg: 'RS256', typ: 'at+jwt' })
      .sign(privateKey);

    const result = await client.verifyToken(token);
    expect(result.sub).toBe('00000001010000000000000200000000');
  });

  test('RFC 9068 §4 + RFC 7515 §4.1.9: RS256 with typ=application/at+jwt verifies', async () => {
    const token = await new jose.SignJWT({
      sub: '00000001010000000000000200000000',
      iss: issuer,
      aud: [audience],
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
      client_id: audience,
      jti: 'jti-2',
    })
      .setProtectedHeader({ alg: 'RS256', typ: 'application/at+jwt' })
      .sign(privateKey);

    const result = await client.verifyToken(token);
    expect(result.sub).toBe('00000001010000000000000200000000');
  });

  test('RFC 6838 §4.2: RS256 with case-variant typ=At+JwT verifies', async () => {
    const token = await new jose.SignJWT({
      sub: '00000001010000000000000200000000',
      iss: issuer,
      aud: [audience],
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
      client_id: audience,
      jti: 'jti-3',
    })
      .setProtectedHeader({ alg: 'RS256', typ: 'At+JwT' })
      .sign(privateKey);

    const result = await client.verifyToken(token);
    expect(result.sub).toBe('00000001010000000000000200000000');
  });

  test('RFC 9068 §4: RS256 with typ=JWT must be rejected (cross-JWT confusion)', async () => {
    const token = await new jose.SignJWT({
      sub: '00000001010000000000000200000000',
      iss: issuer,
      aud: [audience],
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
      client_id: audience,
      jti: 'jti-4',
    })
      .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
      .sign(privateKey);

    expect(client.verifyToken(token)).rejects.toThrow();
  });

  test('RFC 9068 §4: RS256 with no typ header must be rejected', async () => {
    const token = await new jose.SignJWT({
      sub: '00000001010000000000000200000000',
      iss: issuer,
      aud: [audience],
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
      client_id: audience,
      jti: 'jti-5',
    })
      .setProtectedHeader({ alg: 'RS256' })
      .sign(privateKey);

    expect(client.verifyToken(token)).rejects.toThrow();
  });

  test('should verify a legacy EdDSA-signed access token', async () => {
    // The SSO backend mints OAuth ATs as RS256 and legacy `/sso/access_token/exchange`
    // ATs as EdDSA (single-string aud=providerAddress). The /oauth/jwks endpoint
    // publishes both keys; jose picks by `kid`. This test exercises the EdDSA leg
    // explicitly so the legacy flow has the same coverage as the OAuth path.
    const { publicKey: edPub, privateKey: edPriv } = await jose.generateKeyPair(
      'EdDSA',
      { crv: 'Ed25519' },
    );
    const edPubJwk = await jose.exportJWK(edPub);
    edPubJwk.alg = 'EdDSA';
    edPubJwk.use = 'sig';
    edPubJwk.kid = 'legacy-ed25519';

    const mixedJwks = jose.createLocalJWKSet({
      keys: [{ ...publicKeyJwk, kid: 'oauth-rs256' }, edPubJwk],
    });
    const legacyClient = createAuthClient({
      jwks: mixedJwks,
      issuer,
      audience,
    });

    const token = await new jose.SignJWT({
      sub: '00000001010000000000000200000000',
      iss: issuer,
      aud: audience,
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
    })
      .setProtectedHeader({ alg: 'EdDSA', kid: 'legacy-ed25519' })
      .sign(edPriv);

    const result = await legacyClient.verifyToken(token);
    expect(result.sub).toBe('00000001010000000000000200000000');
    expect(result.aud).toBe(audience);
  });

  test('RFC 9068 §2.2: token missing client_id is rejected', async () => {
    const token = await new jose.SignJWT({
      sub: '00000001010000000000000200000000',
      iss: issuer,
      aud: [audience],
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
      jti: 'jti-noclient',
    })
      .setProtectedHeader({ alg: 'RS256', typ: 'at+jwt' })
      .sign(privateKey);

    expect(client.verifyToken(token)).rejects.toThrow();
  });

  test('RFC 9068 §2.2 + RFC 7519 §4.1.7: token missing jti is rejected', async () => {
    const token = await new jose.SignJWT({
      sub: '00000001010000000000000200000000',
      iss: issuer,
      aud: [audience],
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
      client_id: audience,
    })
      .setProtectedHeader({ alg: 'RS256', typ: 'at+jwt' })
      .sign(privateKey);

    expect(client.verifyToken(token)).rejects.toThrow();
  });

  test('RFC 9068 §2.2.3: scope claim is exposed when present', async () => {
    const token = await new jose.SignJWT({
      sub: '00000001010000000000000200000000',
      iss: issuer,
      aud: [audience],
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
      client_id: audience,
      jti: 'jti-scope',
      scope: 'openid profile',
    })
      .setProtectedHeader({ alg: 'RS256', typ: 'at+jwt' })
      .sign(privateKey);

    const result = await client.verifyToken(token);
    expect(result.scope).toBe('openid profile');
  });

  test('RFC 7515 §4.1.11: RS256 token with unsupported crit header is rejected', async () => {
    // The signer registers `custom-extension` via the `crit` option so jose
    // will mint the token. The verifier (verifyToken) does NOT register any
    // extensions, so jose rejects per RFC 7515 §4.1.11: an unrecognized
    // critical header MUST cause the JWS to be invalid.
    const token = await new jose.SignJWT({
      sub: '00000001010000000000000200000000',
      iss: issuer,
      aud: [audience],
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
      client_id: audience,
      jti: 'jti-crit-rs',
    })
      .setProtectedHeader({
        alg: 'RS256',
        typ: 'at+jwt',
        crit: ['custom-extension'],
        'custom-extension': true,
      })
      .sign(privateKey, { crit: { 'custom-extension': true } });

    expect(client.verifyToken(token)).rejects.toThrow();
  });

  test('RFC 7515 §4.1.11: legacy EdDSA token with unsupported crit header is rejected', async () => {
    const { publicKey: edPub, privateKey: edPriv } = await jose.generateKeyPair(
      'EdDSA',
      { crv: 'Ed25519' },
    );
    const edPubJwk = await jose.exportJWK(edPub);
    edPubJwk.alg = 'EdDSA';
    edPubJwk.use = 'sig';
    edPubJwk.kid = 'legacy-ed25519-crit';

    const mixedJwks = jose.createLocalJWKSet({
      keys: [{ ...publicKeyJwk, kid: 'oauth-rs256-crit' }, edPubJwk],
    });
    const legacyClient = createAuthClient({
      jwks: mixedJwks,
      issuer,
      audience,
    });

    const token = await new jose.SignJWT({
      sub: '00000001010000000000000200000000',
      iss: issuer,
      aud: audience,
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
    })
      .setProtectedHeader({
        alg: 'EdDSA',
        kid: 'legacy-ed25519-crit',
        crit: ['custom-extension'],
        'custom-extension': true,
      })
      .sign(edPriv, { crit: { 'custom-extension': true } });

    expect(legacyClient.verifyToken(token)).rejects.toThrow();
  });

  test('RFC 8037 §2: OKP JWK missing crv is rejected at verification', async () => {
    const { publicKey: edPub, privateKey: edPriv } = await jose.generateKeyPair(
      'EdDSA',
      { crv: 'Ed25519' },
    );
    const edPubJwk = await jose.exportJWK(edPub);
    edPubJwk.alg = 'EdDSA';
    edPubJwk.use = 'sig';
    edPubJwk.kid = 'okp-no-crv';
    // Strip the required `crv` member; per RFC 8037 §2 it MUST be present.
    const malformedJwk = { ...edPubJwk } as jose.JWK;
    delete (malformedJwk as { crv?: string }).crv;

    const malformedJwks = jose.createLocalJWKSet({ keys: [malformedJwk] });
    const malformedClient = createAuthClient({
      jwks: malformedJwks,
      issuer,
      audience,
    });

    const token = await new jose.SignJWT({
      sub: '00000001010000000000000200000000',
      iss: issuer,
      aud: audience,
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
    })
      .setProtectedHeader({ alg: 'EdDSA', kid: 'okp-no-crv' })
      .sign(edPriv);

    expect(malformedClient.verifyToken(token)).rejects.toThrow();
  });

  test('RFC 8037 §2: OKP JWK missing x is rejected at verification', async () => {
    const { publicKey: edPub, privateKey: edPriv } = await jose.generateKeyPair(
      'EdDSA',
      { crv: 'Ed25519' },
    );
    const edPubJwk = await jose.exportJWK(edPub);
    edPubJwk.alg = 'EdDSA';
    edPubJwk.use = 'sig';
    edPubJwk.kid = 'okp-no-x';
    const malformedJwk = { ...edPubJwk } as jose.JWK;
    delete (malformedJwk as { x?: string }).x;

    const malformedJwks = jose.createLocalJWKSet({ keys: [malformedJwk] });
    const malformedClient = createAuthClient({
      jwks: malformedJwks,
      issuer,
      audience,
    });

    const token = await new jose.SignJWT({
      sub: '00000001010000000000000200000000',
      iss: issuer,
      aud: audience,
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
    })
      .setProtectedHeader({ alg: 'EdDSA', kid: 'okp-no-x' })
      .sign(edPriv);

    expect(malformedClient.verifyToken(token)).rejects.toThrow();
  });

  test('RFC 8037 §2 + RFC 7517: OKP JWK with d (private) member in remote JWKS is not used for signature trust', async () => {
    // Construct a JWKS that publishes a private key (d present) — a
    // misconfiguration. The verifier still only trusts the public material;
    // a token signed by a *different* key with the same kid must be rejected
    // because verification uses only the public x coordinate.
    const { publicKey: edPub, privateKey: edPriv } = await jose.generateKeyPair(
      'EdDSA',
      {
        crv: 'Ed25519',
        extractable: true,
      },
    );
    const edPrivJwk = await jose.exportJWK(edPriv);
    const edPubJwk = await jose.exportJWK(edPub);
    // Sanity: confirm we actually pulled out a private JWK with `d`.
    expect((edPrivJwk as { d?: string }).d).toBeDefined();
    expect((edPubJwk as { d?: string }).d).toBeUndefined();

    const leakyJwk = {
      ...edPrivJwk,
      alg: 'EdDSA',
      use: 'sig',
      kid: 'okp-leaky',
    };
    const leakyJwks = jose.createLocalJWKSet({ keys: [leakyJwk] });
    const leakyClient = createAuthClient({
      jwks: leakyJwks,
      issuer,
      audience,
    });

    // Sign with an unrelated key but claim the leaky kid: must be rejected
    // because the public material (x) does not match the signing key.
    const { privateKey: otherPriv } = await jose.generateKeyPair('EdDSA', {
      crv: 'Ed25519',
    });
    const token = await new jose.SignJWT({
      sub: '00000001010000000000000200000000',
      iss: issuer,
      aud: audience,
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
    })
      .setProtectedHeader({ alg: 'EdDSA', kid: 'okp-leaky' })
      .sign(otherPriv);

    expect(leakyClient.verifyToken(token)).rejects.toThrow();
  });

  test('should throw error for wrong audience', async () => {
    const token = await new jose.SignJWT({
      sub: '00000001010000000000000200000000',
      iss: issuer,
      aud: ['wrong-audience'],
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
      client_id: audience,
      jti: 'jti-wrongaud',
    })
      .setProtectedHeader({ alg: 'RS256', typ: 'at+jwt' })
      .sign(privateKey);

    expect(client.verifyToken(token)).rejects.toThrow();
  });

  // RFC 7516 §9: a JWE compact serialization has exactly five dot-separated
  // segments, vs. three for a JWS. Encrypted access tokens are not supported
  // on this verifier; we reject with a clear, typed error so callers can
  // distinguish "encrypted JWT" from generic "malformed token".
  test('RFC 7516 §9: encrypted JWT (5-segment compact JWE) is rejected with a clear error', async () => {
    const enc = (obj: object) =>
      Buffer.from(JSON.stringify(obj))
        .toString('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
    // Five segments: protected | encryptedKey | iv | ciphertext | tag.
    const header = enc({ alg: 'RSA-OAEP', enc: 'A256GCM' });
    const token = `${header}.AAAA.BBBB.CCCC.DDDD`;
    expect(client.verifyToken(token)).rejects.toThrow(/encrypted/i);
  });

  // RFC 7516 §9: a JOSE header carrying an `enc` parameter is by definition a
  // JWE, even if the surrounding structure parses. Reject regardless of
  // segment count.
  test('RFC 7516 §9: JWS-shaped token with `enc` header is rejected as encrypted', async () => {
    const enc = (obj: object) =>
      Buffer.from(JSON.stringify(obj))
        .toString('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
    const header = enc({ alg: 'RS256', enc: 'A256GCM', typ: 'at+jwt' });
    const payload = enc({ sub: 'x' });
    const token = `${header}.${payload}.signature`;
    expect(client.verifyToken(token)).rejects.toThrow(/encrypted/i);
  });

  // RFC 8037 §2: "[d] MUST NOT be present for public keys." A verification
  // JWKS that publishes `d` is a private-key leak; the verifier MUST refuse
  // to use such a key for signature trust regardless of whether the
  // signature happens to validate.
  test('RFC 8037 §2: OKP JWK carrying `d` (private exponent) is rejected at verification', async () => {
    const { privateKey: edPriv } = await jose.generateKeyPair('EdDSA', {
      crv: 'Ed25519',
      extractable: true,
    });
    const edPrivJwk = await jose.exportJWK(edPriv);
    expect((edPrivJwk as { d?: string }).d).toBeDefined();

    const leakyJwk = { ...edPrivJwk, alg: 'EdDSA', use: 'sig', kid: 'okp-d' };
    const leakyJwks = jose.createLocalJWKSet({ keys: [leakyJwk] });
    const leakyClient = createAuthClient({
      jwks: leakyJwks,
      issuer,
      audience,
    });

    const token = await new jose.SignJWT({
      sub: '00000001010000000000000200000000',
      iss: issuer,
      aud: audience,
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
    })
      .setProtectedHeader({ alg: 'EdDSA', kid: 'okp-d' })
      .sign(edPriv);

    // jose's createLocalJWKSet rejects private-material JWKs at lookup
    // time with "members must be public keys" — that satisfies RFC 8037 §2
    // ("`d` MUST NOT be present for public keys"). Lock in either the
    // upstream wording or our own "private"/"public" diagnostic so a
    // future jose change cannot silently regress this.
    expect(leakyClient.verifyToken(token)).rejects.toThrow(
      /private|public keys/i,
    );
  });

  // RFC 7518 §6.1 + RFC 8037 §2: each `alg` value pins a `kty`. Publishing
  // a JWK with `alg=EdDSA` but `kty=RSA` (or any other mismatch) is a
  // misconfiguration; jose's resolver MUST refuse to use it.
  test('RFC 7518 §6 / RFC 8037 §2: JWK with alg/kty mismatch is rejected', async () => {
    // Take the working RS256 public key but mutate kty to OKP.
    const mutated = {
      ...publicKeyJwk,
      kid: 'kty-mut',
      kty: 'OKP',
      crv: 'Ed25519',
    } as jose.JWK;
    const mutatedJwks = jose.createLocalJWKSet({ keys: [mutated] });
    const mutatedClient = createAuthClient({
      jwks: mutatedJwks,
      issuer,
      audience,
    });

    // Sign a real RS256 token; kid points at the mutated entry whose kty
    // claims OKP — verification must fail because kty/alg disagree.
    const token = await new jose.SignJWT({
      sub: '00000001010000000000000200000000',
      iss: issuer,
      aud: [audience],
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
      client_id: audience,
      jti: 'jti-kty-mut',
    })
      .setProtectedHeader({ alg: 'RS256', typ: 'at+jwt', kid: 'kty-mut' })
      .sign(privateKey);

    expect(mutatedClient.verifyToken(token)).rejects.toThrow();
  });

  // RFC 7515 §10.12: "Strict JSON validation is a security requirement."
  // The header segment must base64url-decode to a JSON object. Bytes that
  // are not valid JSON (random binary) MUST be rejected at decode, not
  // signature.
  test('RFC 7515 §10.12: header that decodes to non-JSON bytes is rejected at decode (not signature)', async () => {
    const b64url = (b: Buffer) =>
      b
        .toString('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
    const garbage = b64url(Buffer.from([0xff, 0xfe, 0xfd, 0x00, 0x01]));
    const payload = b64url(Buffer.from(JSON.stringify({ sub: 'x' })));
    const token = `${garbage}.${payload}.sig`;
    const err = await client.verifyToken(token).catch((e) => e);
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).not.toMatch(/signature/i);
  });

  // RFC 7515 §10.12 + §4: the JOSE Header MUST be a JSON object. Arrays
  // and primitives are syntactically valid JSON but not objects, and MUST
  // be rejected at decode.
  test('RFC 7515 §10.12: header that decodes to a JSON array is rejected at decode (not signature)', async () => {
    const b64url = (s: string) =>
      Buffer.from(s)
        .toString('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
    const header = b64url(JSON.stringify(['alg', 'RS256']));
    const payload = b64url(JSON.stringify({ sub: 'x' }));
    const token = `${header}.${payload}.sig`;
    const err = await client.verifyToken(token).catch((e) => e);
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).not.toMatch(/signature/i);
  });

  test('RFC 7515 §10.12: header that decodes to a JSON string is rejected at decode (not signature)', async () => {
    const b64url = (s: string) =>
      Buffer.from(s)
        .toString('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
    const header = b64url(JSON.stringify('not-a-header'));
    const payload = b64url(JSON.stringify({ sub: 'x' }));
    const token = `${header}.${payload}.sig`;
    const err = await client.verifyToken(token).catch((e) => e);
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).not.toMatch(/signature/i);
  });

  // RFC 7515 §2: BASE64URL is the URL-safe alphabet of RFC 4648 §5 with
  // trailing '=' omitted and "without the inclusion of any line breaks,
  // whitespace, or other additional characters." Whitespace, '+', '/',
  // and '=' MUST cause the JWS to be rejected at decode time, not after
  // signature check, otherwise input validation depends on cryptographic
  // failure paths.
  test('RFC 7515 §2: header containing whitespace in the base64url segment is rejected at decode (not signature)', async () => {
    // Sign a real token then taint the header segment.
    const real = await new jose.SignJWT({
      sub: '00000001010000000000000200000000',
      iss: issuer,
      aud: [audience],
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
      client_id: audience,
      jti: 'jti-ws',
    })
      .setProtectedHeader({ alg: 'RS256', typ: 'at+jwt' })
      .sign(privateKey);
    const [h, p, s] = real.split('.');
    if (!h || !p || !s) throw new Error('expected JWT to have 3 segments');
    const tainted = `${h.slice(0, 4)} ${h.slice(4)}.${p}.${s}`;
    const err = await client.verifyToken(tainted).catch((e) => e);
    expect(err).toBeInstanceOf(Error);
    // MUST NOT bottom out as a signature error — that would mean the
    // structural alphabet is enforced only by cryptographic accident.
    expect((err as Error).message).not.toMatch(/signature/i);
  });

  test("RFC 7515 §2: header containing '+' (standard base64) is rejected at decode (not signature)", async () => {
    const b64url = (s: string) =>
      Buffer.from(s)
        .toString('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
    const headerJson = JSON.stringify({ alg: 'RS256', typ: 'at+jwt' });
    let stdB64 = Buffer.from(headerJson).toString('base64').replace(/=/g, '');
    if (!stdB64.includes('+')) {
      stdB64 = Buffer.from([...Buffer.from(headerJson), 0xfb, 0xff])
        .toString('base64')
        .replace(/=/g, '');
    }
    expect(stdB64).toMatch(/\+/);
    const payload = b64url(JSON.stringify({ sub: 'x' }));
    const token = `${stdB64}.${payload}.sig`;
    const err = await client.verifyToken(token).catch((e) => e);
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).not.toMatch(/signature/i);
  });

  test("RFC 7515 §2: header containing '=' padding is rejected at decode (not signature)", async () => {
    const b64url = (s: string) =>
      Buffer.from(s)
        .toString('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
    const validHeader = b64url(JSON.stringify({ alg: 'RS256', typ: 'at+jwt' }));
    const padded = `${validHeader}==`;
    const payload = b64url(JSON.stringify({ sub: 'x' }));
    const token = `${padded}.${payload}.sig`;
    const err = await client.verifyToken(token).catch((e) => e);
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).not.toMatch(/signature/i);
  });

  test('RFC 7519 §4.1.1: createAuthClient coerces empty-string issuer to SSO default (does NOT bypass iss check)', async () => {
    const jwks = jose.createLocalJWKSet({ keys: [publicKeyJwk] });
    // The N1 fix: passing issuer: '' must NOT make jose skip the iss
    // check. The verifier should fall back to SSO_ISSUER and reject a
    // token whose iss is anything else (including the empty string).
    const c = createAuthClient({ jwks, audience, issuer: '' });
    const token = await new jose.SignJWT({
      sub: '00000001010000000000000200000000',
      iss: 'https://attacker.example',
      aud: [audience],
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
      client_id: audience,
      jti: 'jti-empty-iss',
    })
      .setProtectedHeader({ alg: 'RS256', typ: 'at+jwt' })
      .sign(privateKey);
    expect(c.verifyToken(token)).rejects.toThrow();
  });

  test('RFC 7519 §4.1.1: createAuthClient with empty-string issuer accepts tokens issued by the SSO default', async () => {
    const jwks = jose.createLocalJWKSet({ keys: [publicKeyJwk] });
    const c = createAuthClient({ jwks, audience, issuer: '' });
    const token = await new jose.SignJWT({
      sub: '00000001010000000000000200000000',
      iss: 'https://sso.alien-api.com', // SSO_ISSUER constant
      aud: [audience],
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
      client_id: audience,
      jti: 'jti-empty-iss-default',
    })
      .setProtectedHeader({ alg: 'RS256', typ: 'at+jwt' })
      .sign(privateKey);
    const info = await c.verifyToken(token);
    expect(info.iss).toBe('https://sso.alien-api.com');
  });

  test('RFC 7519 §4.1.3: createAuthClient rejects empty-string audience at construction', () => {
    expect(() => createAuthClient({ audience: '' })).toThrow(/audience/i);
  });

  test('RFC 7519 §4.1.3: createAuthClient rejects empty audience array at construction', () => {
    expect(() => createAuthClient({ audience: [] })).toThrow(/audience/i);
  });

  test('RFC 7519 §4.1.3: createAuthClient rejects audience array containing empty string', () => {
    expect(() => createAuthClient({ audience: ['valid', ''] })).toThrow(
      /audience/i,
    );
  });

  test('RFC 9068 §2.2 / OIDC §2: TokenInfoSchema surfaces acr and amr instead of stripping them', async () => {
    const token = await new jose.SignJWT({
      sub: '00000001010000000000000200000000',
      iss: issuer,
      aud: [audience],
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
      client_id: audience,
      jti: 'jti-acr-amr',
      acr: 'urn:mace:incommon:iap:silver',
      amr: ['pwd', 'mfa'],
    })
      .setProtectedHeader({ alg: 'RS256', typ: 'at+jwt' })
      .sign(privateKey);
    const info = await client.verifyToken(token);
    expect(info.acr).toBe('urn:mace:incommon:iap:silver');
    expect(info.amr).toEqual(['pwd', 'mfa']);
  });
});
