import {
  calculateJwkThumbprint,
  createRemoteJWKSet,
  decodeProtectedHeader,
  importJWK,
  type JWK,
  type JWTVerifyGetKey,
  jwtVerify,
} from 'jose';
import { SSO_ISSUER, SSO_JWKS_URL } from './const';
import { type TokenInfo, TokenInfoSchema } from './types';

// RFC 7518 §3.3 / RFC 8725 §3.5 — RS256 keys MUST be ≥ 2048 bits.
const MIN_RSA_MODULUS_BYTES = 256;

function b64urlByteLength(s: string): number {
  // RFC 7518 §3.3 modulus floor check operates on byte length of `n`.
  // Decode just enough to count bytes; jose imports the same value.
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 === 0 ? b64 : b64 + '='.repeat(4 - (b64.length % 4));
  return atob(pad).length;
}

function makeJwksResolver(jwksUrl: URL): JWTVerifyGetKey {
  // Wraps createRemoteJWKSet with an RSA modulus floor (RFC 7518 §3.3).
  // jose's resolver caches and rotates; we re-fetch the JWKS on cache miss
  // to inspect raw `n` before importJWK because once imported the modulus
  // is opaque.
  const inner = createRemoteJWKSet(jwksUrl);
  const validated = new Set<string>();
  return async (header, token) => {
    const kid = typeof header.kid === 'string' ? header.kid : '';
    const alg = typeof header.alg === 'string' ? header.alg : '';
    if (alg.startsWith('RS') && !validated.has(kid)) {
      const res = await fetch(jwksUrl);
      if (!res.ok) throw new Error(`JWKS fetch failed: ${res.status}`);
      const body = (await res.json()) as { keys?: JWK[] };
      const candidate = body.keys?.find(
        (k) => k.kid === header.kid && (!k.alg || k.alg === alg),
      );
      if (candidate?.kty === 'RSA' && typeof candidate.n === 'string') {
        if (b64urlByteLength(candidate.n) < MIN_RSA_MODULUS_BYTES) {
          throw new Error('RSA modulus below 2048 bits (RFC 7518 §3.3)');
        }
      }
      validated.add(kid);
    }
    return inner(header, token);
  };
}

type AuthClientOptions = {
  /** The miniapp's provider address used to verify the token audience. */
  audience: string | string[];
  jwksUrl?: string;
  jwks?: JWTVerifyGetKey;
  issuer?: string;
};

class AuthClient {
  constructor(
    private readonly jwks: JWTVerifyGetKey,
    private readonly audience: string | string[],
    private readonly issuer?: string,
  ) {}

  async verifyToken(accessToken: string): Promise<TokenInfo> {
    // RFC 7516 §9: a compact JWE has 5 dot-separated segments and/or an
    // `enc` JOSE header parameter. Encrypted access tokens are not
    // supported by this verifier; reject with a typed error so callers can
    // distinguish encryption from generic JWS malformation.
    if (typeof accessToken === 'string' && accessToken.split('.').length === 5) {
      throw new Error('encrypted JWT (JWE) is not supported');
    }
    // RFC 7515 §2: BASE64URL is the RFC 4648 §5 URL-safe alphabet with no
    // padding and "without the inclusion of any line breaks, whitespace,
    // or other additional characters." Reject before reaching the
    // signature step so structural validation does not depend on
    // cryptographic failure paths (RFC 7515 §10.12).
    const segments = accessToken.split('.');
    if (segments.length !== 3) {
      throw new Error('Invalid Compact JWS: expected 3 segments');
    }
    for (const seg of segments) {
      if (!/^[A-Za-z0-9_-]*$/.test(seg)) {
        throw new Error(
          'Invalid Compact JWS: segment contains characters outside RFC 7515 §2 base64url alphabet',
        );
      }
    }
    // RFC 9068 §4 requires typ=at+jwt for OAuth ATs (RS256 path). The
    // legacy /sso/access_token/exchange tokens are EdDSA and predate the
    // at+jwt media type, so we keep the EdDSA path permissive on typ and
    // do not enforce the §2.2 client_id/jti claims on it.
    //
    // INTENTIONAL DEVIATION: this is an explicit, documented carve-out
    // from RFC 9068 §2.2 / §4 for the legacy EdDSA leg. New code MUST use
    // the RS256 / at+jwt path; the EdDSA path exists only to keep already-
    // issued legacy tokens verifiable. Do not extend the EdDSA branch.
    const header = decodeProtectedHeader(accessToken);
    if ((header as { enc?: unknown }).enc !== undefined) {
      throw new Error('encrypted JWT (JWE) is not supported');
    }
    const isOAuthAccessToken = header.alg === 'RS256';
    const { payload } = await jwtVerify(accessToken, this.jwks, {
      algorithms: ['RS256', 'EdDSA'],
      issuer: this.issuer,
      audience: this.audience,
      typ: isOAuthAccessToken ? 'at+jwt' : undefined,
    });
    const info = TokenInfoSchema.parse(payload);
    if (isOAuthAccessToken) {
      if (!info.client_id) throw new Error('RFC 9068 §2.2: missing client_id');
      if (!info.jti) throw new Error('RFC 9068 §2.2: missing jti');
    }
    return info;
  }
}

export const createAuthClient = ({
  audience,
  jwksUrl,
  jwks,
  issuer,
}: AuthClientOptions): AuthClient => {
  // RFC 7519 §4.1.1 / OIDC Core §3.1.3.7 step 2: an unverified `iss` is a
  // spec violation. jose treats falsy `issuer` (undefined OR empty string)
  // as "skip the iss check," so we must reject empty strings too — not
  // just nullish — before falling back to the SSO default.
  const effectiveIssuer =
    typeof issuer === 'string' && issuer.length > 0 ? issuer : SSO_ISSUER;
  // Same pessimistic coercion for audience: an empty string (or empty
  // array, or array containing only empty strings) would make jose's
  // `aud` check effectively a no-op. Reject up-front rather than silently
  // accepting any audience.
  if (typeof audience === 'string') {
    if (audience.length === 0) {
      throw new Error('audience must be a non-empty string');
    }
  } else if (Array.isArray(audience)) {
    if (audience.length === 0 || audience.some((a) => typeof a !== 'string' || a.length === 0)) {
      throw new Error('audience array must contain at least one non-empty string');
    }
  } else {
    throw new Error('audience is required');
  }
  let jwksResolver = jwks;
  if (!jwksResolver) {
    // RFC 8414 §2: jwks_uri MUST use the https scheme.
    const url = new URL(jwksUrl || SSO_JWKS_URL);
    if (url.protocol !== 'https:') {
      throw new Error(`jwksUrl must use https: scheme, got ${url.protocol}`);
    }
    jwksResolver = makeJwksResolver(url);
  }
  return new AuthClient(jwksResolver, audience, effectiveIssuer);
};
export type { AuthClient, AuthClientOptions };
export { errors as JwtErrors } from 'jose';

// ─── RFC 6750 §3 / RFC 9449 §7.1 — WWW-Authenticate challenge builders ───────

export type BearerErrorCode =
  | 'invalid_request'
  | 'invalid_token'
  | 'insufficient_scope';

export interface BearerChallengeOptions {
  realm: string;
  error?: BearerErrorCode;
  errorDescription?: string;
  scope?: readonly string[];
}

/**
 * Build an `WWW-Authenticate: Bearer ...` header value per RFC 6750 §3.
 * The challenge MUST carry at least one auth-param after the scheme; `realm`
 * is the canonical first auth-param. `error` is one of the §3.1 codes;
 * `errorDescription` is the human-readable explanation; `scope` is the
 * space-delimited scope list the resource requires (see §3 / RFC 6749 §3.3).
 */
function assertHeaderSafe(value: string, fieldName: string): void {
  // RFC 9110 §5.5 — header field values MUST NOT contain CR/LF/NUL. Reject
  // up-front so a malicious or buggy caller cannot smuggle a second header.
  if (/[\r\n\0]/.test(value)) {
    throw new Error(`${fieldName} contains forbidden control char (CR/LF/NUL)`);
  }
  // RFC 9110 §11.2 quoted-string: a literal `"` would close the auth-param
  // and let the caller inject arbitrary tokens. We do not implement the
  // quoted-pair escape because none of the §3.1 fields permit `"` content.
  if (value.includes('"')) {
    throw new Error(`${fieldName} must not contain a double-quote character`);
  }
}

export function buildBearerChallenge(opts: BearerChallengeOptions): string {
  assertHeaderSafe(opts.realm, 'realm');
  if (opts.errorDescription !== undefined)
    assertHeaderSafe(opts.errorDescription, 'errorDescription');
  if (opts.scope) {
    for (const s of opts.scope) assertHeaderSafe(s, 'scope');
  }
  const params = [`realm="${opts.realm}"`];
  if (opts.error) params.push(`error="${opts.error}"`);
  if (opts.errorDescription !== undefined)
    params.push(`error_description="${opts.errorDescription}"`);
  if (opts.scope && opts.scope.length > 0)
    params.push(`scope="${opts.scope.join(' ')}"`);
  return `Bearer ${params.join(', ')}`;
}

export type DPoPErrorCode =
  | 'invalid_token'
  | 'use_dpop_nonce'
  | 'invalid_request';

export interface DPoPChallengeOptions {
  algs: readonly string[];
  error?: DPoPErrorCode;
  errorDescription?: string;
}

/**
 * Build a `WWW-Authenticate: DPoP ...` header value per RFC 9449 §7.1.
 * The challenge MUST advertise the `algs` the resource server accepts so a
 * client that mis-negotiated alg can recover.
 */
export function buildDPoPChallenge(opts: DPoPChallengeOptions): string {
  for (const alg of opts.algs) assertHeaderSafe(alg, 'algs');
  if (opts.errorDescription !== undefined)
    assertHeaderSafe(opts.errorDescription, 'errorDescription');
  const params = [`algs="${opts.algs.join(' ')}"`];
  if (opts.error) params.push(`error="${opts.error}"`);
  if (opts.errorDescription !== undefined)
    params.push(`error_description="${opts.errorDescription}"`);
  return `DPoP ${params.join(', ')}`;
}

// ─── RFC 9449 §7.5 DPoP proof verification ────────────────────────────────

/**
 * Optional pluggable replay store for DPoP proof `jti` values
 * (RFC 9449 §11.1). The verifier MAY enforce single-use of a proof
 * inside its lifetime window so a captured proof can't be re-shipped
 * by an attacker. Implementations should be process-shared (e.g. Redis)
 * so multi-replica deployments don't admit cross-replica replay.
 *
 * The default verifier behavior is to skip replay enforcement when no
 * store is supplied — the caller's deployment chooses the trade-off.
 */
export interface DPoPReplayStore {
  /** Returns true if `jti` has been seen within its proof lifetime. */
  has(jti: string): Promise<boolean> | boolean;
  /** Record `jti` as used; `ttlSec` bounds storage to the proof window. */
  add(jti: string, ttlSec: number): Promise<void> | void;
}

export interface VerifyDPoPProofOptions {
  /**
   * RFC 9449 §6: the JWK thumbprint (RFC 7638) carried by the bound
   * access token's `cnf.jkt`. The proof's embedded `jwk` thumbprint
   * MUST equal this value, otherwise the proof was minted by a different
   * key than the one the AT is bound to.
   */
  expectedJkt: string;
  /**
   * RFC 9449 §4.2 `htm`: the HTTP method of the request that carries
   * this proof. Compared case-insensitively per RFC 7230 §3.1.1.
   */
  htm: string;
  /**
   * RFC 9449 §4.2 `htu`: the HTTP target URI of the request, with
   * query and fragment removed. The verifier strips query/fragment
   * before comparison so callers can pass the inbound URL verbatim.
   */
  htu: string;
  /**
   * The bearer access token (the same value passed to `verifyToken`)
   * when the proof MUST cover an AT (RFC 9449 §4.3 `ath`). Pass null
   * for AS-token-endpoint proofs that don't bind to an AT yet.
   */
  accessToken?: string | null;
  /**
   * Maximum proof age in seconds since `iat` (RFC 9449 §11.1). Default
   * 30 seconds — the proof window is intentionally narrow to bound a
   * stolen-proof replay attack to a small window.
   */
  maxAgeSec?: number;
  /**
   * Allowed clock skew (seconds, default 5) for `iat` against current
   * time, applied symmetrically.
   */
  clockSkewSec?: number;
  /**
   * Algorithms the verifier will accept for the proof signature. The
   * RFC 9449 §4.1 `alg` MUST be an asymmetric algorithm — `none`,
   * `HS*` are forbidden by the spec. Default: ES256 / EdDSA / RS256 /
   * PS256 — the asymmetric set the surrounding SDK already supports.
   */
  algorithms?: readonly string[];
  /** Optional pluggable replay store for proof `jti` (RFC 9449 §11.1). */
  replayStore?: DPoPReplayStore;
}

const DEFAULT_DPOP_ALGS = ['ES256', 'EdDSA', 'RS256', 'PS256'] as const;
const DEFAULT_DPOP_MAX_AGE_SEC = 30;
const DEFAULT_DPOP_SKEW_SEC = 5;

function b64urlEncode(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sha256Base64Url(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return b64urlEncode(new Uint8Array(hash));
}

function canonicalizeHtu(raw: string): string {
  // RFC 9449 §4.3: htu MUST equal the request URI without query and
  // fragment. We canonicalise both sides through URL so trailing slashes
  // and default ports normalise consistently.
  const u = new URL(raw);
  u.search = '';
  u.hash = '';
  return u.toString();
}

/**
 * Verify a DPoP proof JWT (RFC 9449 §7.5) for an inbound request.
 *
 * This is the resource-server side of DPoP. Given the proof from the
 * `DPoP` request header, the access token's `cnf.jkt` value, and the
 * request method/URL, this function returns the proof's claims on
 * success or throws a typed error on any verification failure.
 *
 * Composition with {@link AuthClient.verifyToken}:
 *   const info = await client.verifyToken(accessToken);
 *   if (info.cnf?.jkt) {
 *     await verifyDPoPProof(req.headers.dpop, {
 *       expectedJkt: info.cnf.jkt,
 *       htm: req.method,
 *       htu: `${origin}${req.url}`,
 *       accessToken,
 *     });
 *   }
 */
export async function verifyDPoPProof(
  proofJwt: string,
  opts: VerifyDPoPProofOptions,
): Promise<{ jti: string; iat: number }> {
  if (typeof proofJwt !== 'string' || proofJwt.length === 0) {
    throw new Error('DPoP proof: missing or empty');
  }
  // Header-shape validation before signature work.
  const header = decodeProtectedHeader(proofJwt) as Record<string, unknown>;
  // RFC 9449 §4.1 `typ` MUST be `dpop+jwt`. RFC 6838 §4.2 case-insensitive
  // and bare → `application/`-prefixed.
  const typRaw = header.typ;
  const typLower = typeof typRaw === 'string' ? typRaw.toLowerCase() : '';
  if (typLower !== 'dpop+jwt' && typLower !== 'application/dpop+jwt') {
    throw new Error(`DPoP proof: invalid typ ${String(typRaw)} (RFC 9449 §4.1)`);
  }
  const algs = opts.algorithms ?? DEFAULT_DPOP_ALGS;
  if (typeof header.alg !== 'string' || !algs.includes(header.alg)) {
    throw new Error(`DPoP proof: invalid alg ${String(header.alg)} (RFC 9449 §4.1)`);
  }
  // RFC 9449 §4.1: `jwk` MUST be the public key — no private parts.
  const jwk = header.jwk as Record<string, unknown> | undefined;
  if (!jwk || typeof jwk !== 'object') {
    throw new Error('DPoP proof: missing or non-object jwk header (RFC 9449 §4.1)');
  }
  for (const privateField of ['d', 'p', 'q', 'dp', 'dq', 'qi', 'oth', 'k']) {
    if (privateField in jwk) {
      throw new Error('DPoP proof: jwk header contains private key material');
    }
  }
  // RFC 7515 §4.1.11 — any unrecognised `crit` is fatal.
  if (header.crit !== undefined) {
    if (!Array.isArray(header.crit) || header.crit.length > 0) {
      throw new Error('DPoP proof: unsupported crit header');
    }
  }
  // RFC 9449 §6: thumbprint of the embedded jwk MUST equal cnf.jkt.
  const thumbprint = await calculateJwkThumbprint(jwk as JWK, 'sha256');
  if (thumbprint !== opts.expectedJkt) {
    throw new Error('DPoP proof: jkt thumbprint mismatch (RFC 9449 §6)');
  }
  // Signature verification using the embedded public key.
  const key = await importJWK(jwk as JWK, header.alg as string);
  const verified = await jwtVerify(proofJwt, key, {
    algorithms: [header.alg as string],
    typ: typLower === 'dpop+jwt' ? 'dpop+jwt' : 'application/dpop+jwt',
  });
  const payload = verified.payload as Record<string, unknown>;
  const jti = payload.jti;
  if (typeof jti !== 'string' || jti.length === 0) {
    throw new Error('DPoP proof: missing jti (RFC 9449 §4.2)');
  }
  const iat = payload.iat;
  if (typeof iat !== 'number' || !Number.isFinite(iat)) {
    throw new Error('DPoP proof: missing or non-numeric iat (RFC 9449 §4.2)');
  }
  // RFC 9449 §11.1 — proof age window. Allow symmetric skew for clock drift.
  const skew = opts.clockSkewSec ?? DEFAULT_DPOP_SKEW_SEC;
  const maxAge = opts.maxAgeSec ?? DEFAULT_DPOP_MAX_AGE_SEC;
  const now = Math.floor(Date.now() / 1000);
  if (iat > now + skew) {
    throw new Error('DPoP proof: iat is in the future');
  }
  if (now - iat > maxAge + skew) {
    throw new Error('DPoP proof: iat outside max age window (RFC 9449 §11.1)');
  }
  // RFC 9449 §4.2 htm — case-insensitive HTTP method.
  const htm = payload.htm;
  if (typeof htm !== 'string' || htm.toUpperCase() !== opts.htm.toUpperCase()) {
    throw new Error('DPoP proof: htm mismatch (RFC 9449 §4.2)');
  }
  // RFC 9449 §4.3 htu — request URI without query/fragment.
  const htu = payload.htu;
  if (typeof htu !== 'string') {
    throw new Error('DPoP proof: htu missing (RFC 9449 §4.2)');
  }
  let canonProof: string;
  let canonExpected: string;
  try {
    canonProof = canonicalizeHtu(htu);
    canonExpected = canonicalizeHtu(opts.htu);
  } catch {
    throw new Error('DPoP proof: htu is not a valid URL');
  }
  if (canonProof !== canonExpected) {
    throw new Error('DPoP proof: htu mismatch (RFC 9449 §4.3)');
  }
  // RFC 9449 §4.3 ath — when the proof binds to an access token, ath
  // MUST equal BASE64URL(SHA-256(access_token)).
  if (opts.accessToken !== undefined && opts.accessToken !== null) {
    const expectedAth = await sha256Base64Url(opts.accessToken);
    if (payload.ath !== expectedAth) {
      throw new Error('DPoP proof: ath mismatch (RFC 9449 §4.3)');
    }
  } else {
    // Some flows (e.g. token endpoint) don't bind ath. If ath is
    // present anyway, still require it to be a string — bogus types
    // shouldn't slip through.
    if (payload.ath !== undefined && typeof payload.ath !== 'string') {
      throw new Error('DPoP proof: ath must be a string when present');
    }
  }
  // RFC 9449 §11.1 replay defense, when the caller wires a store.
  if (opts.replayStore) {
    if (await opts.replayStore.has(jti)) {
      throw new Error('DPoP proof: jti replay (RFC 9449 §11.1)');
    }
    await opts.replayStore.add(jti, maxAge + skew);
  }
  return { jti, iat };
}
