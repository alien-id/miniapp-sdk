import { z } from 'zod';

/**
 * Token info schema (parsed from JWT)
 */
export const TokenInfoSchema = z.object({
  iss: z.string(),
  sub: z.string(),
  aud: z.union([z.string(), z.array(z.string())]),
  exp: z.number(),
  iat: z.number(),
  nonce: z.optional(z.string()),
  auth_time: z.optional(z.number()),
});
export type TokenInfo = z.infer<typeof TokenInfoSchema>;
