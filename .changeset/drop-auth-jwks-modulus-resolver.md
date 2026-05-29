---
"@alien-id/miniapps-auth-client": patch
---

Remove the redundant custom JWKS modulus-floor resolver and rely on jose's built-in RSA key-size enforcement. jose already rejects sub-2048-bit RSA keys at verification time (and the algorithm allowlist only permits RS256/EdDSA), so the bespoke resolver — and its extra per-verification JWKS fetch — added no security guarantee. Behavior is unchanged; one network round-trip per verification is eliminated.
