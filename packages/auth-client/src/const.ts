import type { JWK } from 'jose';

export const SSO_JWT_PUBLIC_KEY: JWK = {
  kty: 'RSA',
  use: 'sig',
  alg: 'RS256',
  kid: 'fKWRPMHZcy0',
  n: 'yZFiYo0_FUfu12su254rgmKL4QKyCcoxkfDO-LUettOxZpEHO2QWYfbsC9Wz67MTfxf6N0ItD4K-Cyb449o01kNOJxkdS3Mx2Ge3LgcA6Txb7iGCl5qz4QVEBw0paYX0mWcRVB91IApX8f_gbT2Y_X1bOG14uC1DfoKlW0ZOOo8nx_H96o9bJXo8vjoXZXRwiYYRFtXbetz5Nh0uCSE3RzYFg9pc7Rl8dV9TlhnxKfYH-pKrE7qEaQfglXDUx5reaJDjIhNQjv8zdFwPFtLpDcCeCInspyvSiI0wXxLkJjUvYyJ60EZ9DpFVY2k77lRKJm8uNRm-kK6MeRRbT1sNKQ',
  e: 'AQAB',
};
