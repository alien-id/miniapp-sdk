import * as jose from 'jose';

import { SSO_JWT_PUBLIC_KEY } from './const';
import { type TokenInfo, TokenInfoSchema } from './types';

type AuthClientOptions = {
  publicKey?: jose.JWK;
};

class AuthClient {
  constructor(private readonly publicKey: jose.JWK) {}

  async verifyToken(accessToken: string): Promise<TokenInfo> {
    const rs256publicKey = await jose.importJWK(this.publicKey, 'RS256');
    const { payload } = await jose.jwtVerify(accessToken, rs256publicKey, {
      algorithms: ['RS256'],
    });
    return TokenInfoSchema.parse(payload);
  }
}

export const createAuthClient = ({
  publicKey,
}: AuthClientOptions): AuthClient => {
  return new AuthClient(publicKey || SSO_JWT_PUBLIC_KEY);
};
export type { AuthClient, AuthClientOptions };
