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
The `audience` option is required and should be your miniapp provider
address.

```typescript
import { createAuthClient } from '@alien-id/miniapps-auth-client';

const client = createAuthClient({
  audience: 'your-miniapp-provider-address',
});

try {
  const tokenInfo = await client.verifyToken(accessToken);
  console.log('Session address:', tokenInfo.sub);
} catch (error) {
  console.error('Invalid token:', error);
}
```

By default, the client verifies:

- `issuer`: `https://sso.alien-api.com`
- `jwksUrl`: `https://sso.alien-api.com/oauth/jwks`

### Custom JWKS URL

`createAuthClient` accepts an optional jwksUrl parameter to use custom JWKS endpoint for JWT verification.

```typescript
import { createAuthClient } from '@alien-id/miniapps-auth-client';

const client = createAuthClient({
  audience: 'your-miniapp-provider-address',
  jwksUrl: 'https://your-auth-server.example.com/oauth/jwks',
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

### Custom issuer

Override the expected JWT issuer if you are verifying tokens from a
different SSO environment.

```typescript
import { createAuthClient } from '@alien-id/miniapps-auth-client';

const client = createAuthClient({
  audience: 'your-miniapp-provider-address',
  issuer: 'https://your-auth-server.example.com',
});
```

### Error handling

The package re-exports `jose` error classes as `JwtErrors`.

```typescript
import {
  createAuthClient,
  JwtErrors,
} from '@alien-id/miniapps-auth-client';

try {
  await client.verifyToken(accessToken);
} catch (error) {
  if (error instanceof JwtErrors.JWTExpired) {
    console.error('Token expired');
  }
}
```
