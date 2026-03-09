import { createRemoteJWKSet, type JWTVerifyGetKey, jwtVerify } from 'jose';
import { SSO_ISSUER, SSO_JWKS_URL } from './const';
import { type TokenInfo, TokenInfoSchema } from './types';

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
    const { payload } = await jwtVerify(accessToken, this.jwks, {
      algorithms: ['RS256', 'EdDSA'],
      issuer: this.issuer ?? undefined,
      audience: this.audience,
    });
    return TokenInfoSchema.parse(payload);
  }
}

export const createAuthClient = ({
  audience,
  jwksUrl,
  jwks,
  issuer = SSO_ISSUER,
}: AuthClientOptions): AuthClient => {
  const jwksResolver =
    jwks ?? createRemoteJWKSet(new URL(jwksUrl || SSO_JWKS_URL));
  return new AuthClient(jwksResolver, audience, issuer);
};
export type { AuthClient, AuthClientOptions };
export { errors as JwtErrors } from 'jose';
