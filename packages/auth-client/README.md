# @alien-id/miniapps-auth-client

[![npm](https://img.shields.io/npm/v/@alien-id/miniapps-auth-client.svg)](https://www.npmjs.com/package/@alien-id/miniapps-auth-client)

Core authentication utilities for the Alien Miniapp SDK.
Provides tools for verifying JWT tokens issued by the Alien SSO.

Use it in your miniapp backend to verify tokens sent by miniapp.

## Installation

```bash
bun add @alien-id/miniapps-auth-client
```

## Usage

### Verifying Tokens

Use `createAuthClient` to verify JWT access tokens from Alien SSO.

```typescript
import { createAuthClient } from '@alien-id/miniapps-auth-client';


const client = createAuthClient({
  audience: 'your-miniapp-provider-address'
});

try {
  const tokenInfo = await client.verifyToken(accessToken);
  console.log('Session address:', tokenInfo.sub);
} catch (error) {
  console.error('Invalid token:', error);
}
```

### Custom JWKS URL

`createAuthClient` accepts an optional jwksUrl parameter to use custom JWKS endpoint for JWT verification.

```typescript
import { createAuthClient } from '@alien-id/miniapps-auth-client';


const client = createAuthClient({
  audience: 'your-miniapp-provider-address',
  jwksUrl: "https://sso.alien-api.com/.well-known/jwks.json"
});

try {
  const tokenInfo = await client.verifyToken(accessToken);
  console.log('Session address:', tokenInfo.sub);
} catch (error) {
  console.error('Invalid token:', error);
}
```

### Custom JWKS resolver (advanced)

For testing or custom key retrieval, pass a prebuilt `JWTVerifyGetKey` resolver:

```typescript
import { createLocalJWKSet } from 'jose';
import { createAuthClient } from '@alien-id/miniapps-auth-client';

const jwks = createLocalJWKSet({ keys: [publicJwk] });
const client = createAuthClient({
  audience: 'your-miniapp-provider-address',
  jwks,
});
```
