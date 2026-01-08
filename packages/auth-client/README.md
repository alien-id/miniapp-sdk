# @alien-id/auth-client

Core authentication utilities for the Alien Miniapp SDK. This package provides tools for verifying JWT tokens issued by the Alein SSO.

## Installation

```bash
bun add @alien-id/auth-client
```

## Usage

### Verifying Tokens

Use `createAuthClient` to verify JWT access tokens from Alien SSO.

```typescript
import { createAuthClient } from '@alien-id/auth-client';


const client = createAuthClient();

try {
  const tokenInfo = await client.verifyToken(accessToken);
  console.log('Session address:', tokenInfo.sub);
} catch (error) {
  console.error('Invalid token:', error);
}
```

### Custom JWK public key

`createAuthClient` accepts an optional publicKey parameter to use custom JWK keys for verification.

```typescript
import { createAuthClient } from '@alien-id/core';


const client = createAuthClient({
  publicKey: {
    kty: 'RSA',
    alg: 'RS256',
    // ... your JWK
  }
});

try {
  const tokenInfo = await client.verifyToken(accessToken);
  console.log('Session address:', tokenInfo.sub);
} catch (error) {
  console.error('Invalid token:', error);
}
```
