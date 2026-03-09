# @alien_org/auth-client

[![npm](https://img.shields.io/npm/v/@alien_org/auth-client.svg)](https://www.npmjs.com/package/@alien_org/auth-client)

Core authentication utilities for the Alien Miniapp SDK. This package provides tools for verifying JWT tokens issued by the Alien SSO.

Use it in your miniapp backend to verify tokens sent by miniapp.

## Installation

```bash
bun add @alien_org/auth-client
```

## Usage

### Verifying Tokens

Use `createAuthClient` to verify JWT access tokens from Alien SSO.

```typescript
import { createAuthClient } from '@alien_org/auth-client';


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
import { createAuthClient } from '@alien_org/auth-client';


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
