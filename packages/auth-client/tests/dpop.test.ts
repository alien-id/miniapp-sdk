import { beforeAll, describe, expect, test } from 'bun:test';
import * as jose from 'jose';
import { type DPoPReplayStore, verifyDPoPProof } from '../src/index';

// RFC 9449 §7.5 — resource-server side DPoP proof verification. The
// SDK exposes `verifyDPoPProof` for callers to compose with
// `AuthClient.verifyToken` so the full DPoP chain (AT signature → cnf
// surface → proof signature → htm/htu/iat/ath/jkt) is enforced.

const HTU = 'https://api.example.com/resource';
const HTM = 'POST';

type Keys = {
  publicJwk: jose.JWK;
  privateKey: jose.CryptoKey;
  jkt: string;
};

async function makeP256Keys(): Promise<Keys> {
  const { publicKey, privateKey } = await jose.generateKeyPair('ES256', {
    extractable: true,
  });
  const publicJwk = await jose.exportJWK(publicKey);
  publicJwk.alg = 'ES256';
  const jkt = await jose.calculateJwkThumbprint(publicJwk, 'sha256');
  return { publicJwk, privateKey, jkt };
}

async function makeProof(
  keys: Keys,
  overrides: {
    htm?: string;
    htu?: string;
    iat?: number;
    jti?: string;
    ath?: string;
    typ?: string;
    alg?: string;
    extraHeader?: Record<string, unknown>;
  } = {},
): Promise<string> {
  const header: Record<string, unknown> = {
    alg: overrides.alg ?? 'ES256',
    typ: overrides.typ ?? 'dpop+jwt',
    jwk: keys.publicJwk,
    ...overrides.extraHeader,
  };
  const payload: Record<string, unknown> = {
    htm: overrides.htm ?? HTM,
    htu: overrides.htu ?? HTU,
    iat: overrides.iat ?? Math.floor(Date.now() / 1000),
    jti: overrides.jti ?? crypto.randomUUID(),
  };
  if (overrides.ath !== undefined) payload.ath = overrides.ath;
  return await new jose.SignJWT(payload)
    .setProtectedHeader(header as jose.JWSHeaderParameters)
    .sign(keys.privateKey);
}

describe('verifyDPoPProof (RFC 9449 §7.5)', () => {
  let keys: Keys;
  let otherKeys: Keys;

  beforeAll(async () => {
    keys = await makeP256Keys();
    otherKeys = await makeP256Keys();
  });

  test('accepts a valid proof bound to the expected jkt', async () => {
    const proof = await makeProof(keys);
    const result = await verifyDPoPProof(proof, {
      expectedJkt: keys.jkt,
      htm: HTM,
      htu: HTU,
    });
    expect(typeof result.jti).toBe('string');
    expect(typeof result.iat).toBe('number');
  });

  test('RFC 9449 §6: rejects a proof whose embedded jwk thumbprint differs from expectedJkt', async () => {
    const proof = await makeProof(otherKeys); // signed by a different key
    await expect(
      verifyDPoPProof(proof, { expectedJkt: keys.jkt, htm: HTM, htu: HTU }),
    ).rejects.toThrow(/jkt/i);
  });

  test('RFC 9449 §4.1: rejects a proof whose typ is not dpop+jwt', async () => {
    const proof = await makeProof(keys, { typ: 'jwt' });
    await expect(
      verifyDPoPProof(proof, { expectedJkt: keys.jkt, htm: HTM, htu: HTU }),
    ).rejects.toThrow(/typ/i);
  });

  test('RFC 9449 §4.1: accepts a proof whose typ is application/dpop+jwt', async () => {
    const proof = await makeProof(keys, { typ: 'application/dpop+jwt' });
    const result = await verifyDPoPProof(proof, {
      expectedJkt: keys.jkt,
      htm: HTM,
      htu: HTU,
    });
    expect(typeof result.jti).toBe('string');
  });

  test('RFC 9449 §4.2: rejects a proof whose htm does not match the request method', async () => {
    const proof = await makeProof(keys, { htm: 'GET' });
    await expect(
      verifyDPoPProof(proof, { expectedJkt: keys.jkt, htm: 'POST', htu: HTU }),
    ).rejects.toThrow(/htm/i);
  });

  test('RFC 9449 §4.2: htm comparison is case-insensitive', async () => {
    const proof = await makeProof(keys, { htm: 'post' });
    const result = await verifyDPoPProof(proof, {
      expectedJkt: keys.jkt,
      htm: 'POST',
      htu: HTU,
    });
    expect(typeof result.jti).toBe('string');
  });

  test('RFC 9449 §4.3: rejects a proof whose htu does not match the request URI', async () => {
    const proof = await makeProof(keys, {
      htu: 'https://attacker.example/resource',
    });
    await expect(
      verifyDPoPProof(proof, { expectedJkt: keys.jkt, htm: HTM, htu: HTU }),
    ).rejects.toThrow(/htu/i);
  });

  test('RFC 9449 §4.3: htu canonicalisation strips query and fragment', async () => {
    const proof = await makeProof(keys, { htu: HTU });
    const result = await verifyDPoPProof(proof, {
      expectedJkt: keys.jkt,
      htm: HTM,
      htu: `${HTU}?token=abc#frag`,
    });
    expect(typeof result.jti).toBe('string');
  });

  test('RFC 9449 §11.1: rejects a proof whose iat is outside the max-age window', async () => {
    const stale = Math.floor(Date.now() / 1000) - 600;
    const proof = await makeProof(keys, { iat: stale });
    await expect(
      verifyDPoPProof(proof, { expectedJkt: keys.jkt, htm: HTM, htu: HTU }),
    ).rejects.toThrow(/age|iat/i);
  });

  test('rejects a proof whose iat is in the future beyond skew', async () => {
    const future = Math.floor(Date.now() / 1000) + 600;
    const proof = await makeProof(keys, { iat: future });
    await expect(
      verifyDPoPProof(proof, { expectedJkt: keys.jkt, htm: HTM, htu: HTU }),
    ).rejects.toThrow(/future/i);
  });

  test('RFC 9449 §4.3: rejects when ath does not match SHA-256(access_token)', async () => {
    // Build the proof with a deliberately wrong ath
    const proof = await makeProof(keys, { ath: 'definitely-wrong' });
    await expect(
      verifyDPoPProof(proof, {
        expectedJkt: keys.jkt,
        htm: HTM,
        htu: HTU,
        accessToken: 'an-access-token',
      }),
    ).rejects.toThrow(/ath/i);
  });

  test('RFC 9449 §4.3: accepts when ath equals BASE64URL(SHA-256(access_token))', async () => {
    const at = 'an-access-token';
    const data = new TextEncoder().encode(at);
    const buf = data.buffer.slice(
      data.byteOffset,
      data.byteOffset + data.byteLength,
    );
    const hash = await crypto.subtle.digest('SHA-256', buf);
    const ath = Buffer.from(new Uint8Array(hash))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    const proof = await makeProof(keys, { ath });
    const result = await verifyDPoPProof(proof, {
      expectedJkt: keys.jkt,
      htm: HTM,
      htu: HTU,
      accessToken: at,
    });
    expect(typeof result.jti).toBe('string');
  });

  test('RFC 9449 §4.1: rejects a proof whose jwk header carries private key material', async () => {
    // Build a JWK that includes `d` (private RSA exponent) — a clear
    // sign that someone exported the private key into the header.
    const { privateKey } = await jose.generateKeyPair('RS256', {
      modulusLength: 2048,
      extractable: true,
    });
    const fullJwk = await jose.exportJWK(privateKey);
    const proof = await new jose.SignJWT({
      htm: HTM,
      htu: HTU,
      iat: Math.floor(Date.now() / 1000),
      jti: 'jti-with-private',
    })
      .setProtectedHeader({
        alg: 'RS256',
        typ: 'dpop+jwt',
        jwk: fullJwk,
      } as jose.JWSHeaderParameters)
      .sign(privateKey);
    await expect(
      verifyDPoPProof(proof, {
        expectedJkt: 'irrelevant',
        htm: HTM,
        htu: HTU,
      }),
    ).rejects.toThrow(/private/i);
  });

  test('RFC 9449 §11.1: replay store rejects a second presentation of the same jti', async () => {
    const seen = new Set<string>();
    const store: DPoPReplayStore = {
      has: (jti) => seen.has(jti),
      add: (jti) => {
        seen.add(jti);
      },
    };
    const proof = await makeProof(keys, { jti: 'fixed-jti-1' });
    await verifyDPoPProof(proof, {
      expectedJkt: keys.jkt,
      htm: HTM,
      htu: HTU,
      replayStore: store,
    });
    await expect(
      verifyDPoPProof(proof, {
        expectedJkt: keys.jkt,
        htm: HTM,
        htu: HTU,
        replayStore: store,
      }),
    ).rejects.toThrow(/replay/i);
  });

  test('rejects an empty proof string', async () => {
    await expect(
      verifyDPoPProof('', { expectedJkt: keys.jkt, htm: HTM, htu: HTU }),
    ).rejects.toThrow();
  });
});
