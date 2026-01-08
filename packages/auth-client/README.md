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

### Custom JWKS URL

`createAuthClient` accepts an optional jwksUrl parameter to use custom JWKS endpoint for JWT verification.

```typescript
import { createAuthClient } from '@alien-id/core';


const client = createAuthClient({
  jwksUrl: "https://sso.alien-api.com/.well-known/jwks.json"
});

try {
  const tokenInfo = await client.verifyToken(accessToken);
  console.log('Session address:', tokenInfo.sub);
} catch (error) {
  console.error('Invalid token:', error);
}
```
