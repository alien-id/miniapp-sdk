import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import * as jose from 'jose';
import { type AuthClient, createAuthClient } from '../src/index';

describe('AuthClient tests', () => {
  let publicKeyJwk: jose.JWK;
  let privateKey: jose.CryptoKey;
  let client: AuthClient;
  let jwksServer: Bun.Server<undefined>;

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

    jwksServer = Bun.serve({
      port: 0,
      fetch(req) {
        const url = new URL(req.url);
        if (url.pathname === '/oauth/jwks') {
          return Response.json({
            keys: [publicKeyJwk],
          });
        }
        return new Response('Not Found', { status: 404 });
      },
    });

    client = createAuthClient({
      jwksUrl: `http://localhost:${jwksServer.port}/oauth/jwks`,
    });
  });

  afterAll(() => {
    jwksServer?.stop();
  });

  test('should verify a valid token', async () => {
    const payload = {
      sub: '00000001010000000000000200000000',
      iss: 'https://sso.alien-api.com',
      aud: ['00000001040000000000000800000000'],
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
    };

    const token = await new jose.SignJWT(payload)
      .setProtectedHeader({ alg: 'RS256' })
      .sign(privateKey);

    const result = await client.verifyToken(token);
    expect(result.sub).toBe('00000001010000000000000200000000');
  });

  test('should throw error for expired token', async () => {
    const payload = {
      sub: '00000001010000000000000200000000',
      exp: Math.floor(Date.now() / 1000) - 10, // Expired 10 seconds ago
    };

    const token = await new jose.SignJWT(payload)
      .setProtectedHeader({ alg: 'RS256' })
      .sign(privateKey);

    expect(client.verifyToken(token)).rejects.toThrow(/exp/);
  });

  test('should throw error for wrong signature', async () => {
    const { privateKey: otherPrivateKey } = await jose.generateKeyPair('RS256');

    const token = await new jose.SignJWT({
      sub: '00000001010000000000000200000000',
    })
      .setProtectedHeader({ alg: 'RS256' })
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
    })
      .setProtectedHeader({ alg: 'HS256' })
      .sign(secret);

    expect(client.verifyToken(token)).rejects.toThrow();
  });

  test('should throw error if zod validation fails', async () => {
    const token = await new jose.SignJWT({})
      .setProtectedHeader({ alg: 'RS256' })
      .setExpirationTime('1h')
      .sign(privateKey);

    expect(client.verifyToken(token)).rejects.toThrow();
  });

  test("should throw error if token is signed but has no 'exp' claim", async () => {
    const token = await new jose.SignJWT({
      sub: '00000001010000000000000200000000',
    })
      .setProtectedHeader({ alg: 'RS256' })
      .sign(privateKey);

    expect(client.verifyToken(token)).rejects.toThrow();
  });
});
