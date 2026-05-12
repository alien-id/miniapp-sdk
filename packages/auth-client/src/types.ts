import { z } from 'zod';

/**
 * Token info parsed from a verified JWT access token.
 *
 * `client_id` and `jti` are REQUIRED on RFC 9068 access tokens (§2.2) and
 * are enforced on the at+jwt path in verifyToken; they are optional on this
 * schema because the legacy EdDSA `/sso/access_token/exchange` ATs predate
 * RFC 9068 and do not carry them.
 */
export const TokenInfoSchema = z.object({
  iss: z.string(),
  sub: z.string(),
  aud: z.union([z.string(), z.array(z.string())]),
  exp: z.number(),
  iat: z.number(),
  client_id: z.optional(z.string()),
  jti: z.optional(z.string()),
  scope: z.optional(z.string()),
  nonce: z.optional(z.string()),
  auth_time: z.optional(z.number()),
  // RFC 9068 §2.2 / OIDC Core §2: optional step-up authentication
  // signals. Surfaced (not stripped) so callers gating sensitive flows
  // on AAL or specific authentication factors can read them.
  acr: z.optional(z.string()),
  amr: z.optional(z.array(z.string())),
});
export type TokenInfo = z.infer<typeof TokenInfoSchema>;
