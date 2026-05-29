import {
  createRemoteJWKSet,
  decodeProtectedHeader,
  type JWTVerifyGetKey,
  jwtVerify,
} from 'jose';
import { SSO_ISSUER, SSO_JWKS_URL } from './const';
import { type TokenInfo, TokenInfoSchema } from './types';

// RFC 7518 §3.3 / RFC 8725 §3.5 — RS256 keys MUST be ≥ 2048 bits. jose
// enforces this at `jwtVerify` (it throws "RS256 requires key modulusLength
// to be 2048 bits or larger" for the key it actually verifies with), and the
// `algorithms` allowlist below only permits RS256 and EdDSA — so the floor is
// guaranteed for the real verifying key, with no extra JWKS fetch to keep in
// sync. See tests/jwt.test.ts ("sub-2048-bit RSA key from the remote JWKS").

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
    if (
      typeof accessToken === 'string' &&
      accessToken.split('.').length === 5
    ) {
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
    if (
      audience.length === 0 ||
      audience.some((a) => typeof a !== 'string' || a.length === 0)
    ) {
      throw new Error(
        'audience array must contain at least one non-empty string',
      );
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
    jwksResolver = createRemoteJWKSet(url);
  }
  return new AuthClient(jwksResolver, audience, effectiveIssuer);
};
export { errors as JwtErrors } from 'jose';
export type { AuthClient, AuthClientOptions };
