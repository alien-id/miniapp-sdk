import { createRemoteJWKSet, jwtVerify } from 'jose';
import { SSO_JWKS_URL } from './const';
import { type TokenInfo, TokenInfoSchema } from './types';

type AuthClientOptions = {
  jwksUrl?: string;
};

class AuthClient {
  constructor(private readonly jwks: ReturnType<typeof createRemoteJWKSet>) {}

  async verifyToken(accessToken: string): Promise<TokenInfo> {
    const { payload } = await jwtVerify(accessToken, this.jwks, {
      algorithms: ['RS256'],
    });
    return TokenInfoSchema.parse(payload);
  }
}

export const createAuthClient = ({
  jwksUrl,
}: AuthClientOptions = {}): AuthClient => {
  const jwks = createRemoteJWKSet(new URL(jwksUrl || SSO_JWKS_URL));
  return new AuthClient(jwks);
};
export type { AuthClient, AuthClientOptions };
