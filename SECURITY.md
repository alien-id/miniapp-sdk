# Security

## Reporting a vulnerability

[Email us](support@alien.org) with details. Do not open a public issue.

## What we do

We publish five npm packages under `@alien-id/*`. Supply-chain compromise of
any one of them lets an attacker reach every Alien miniapp consumer, so we
harden in layers. Each layer assumes the layers below it have failed.

### Layer 1 — Accounts

- **WebAuthn / passkey 2FA only** on every npmjs and GitHub account that can
  publish. TOTP is disabled at the org level (real-time-phishable).
- **OIDC trusted publishing** is configured per package on npmjs.com → no
  long-lived `NPM_TOKEN` exists in repo secrets.

### Layer 2 — Lockfile & resolution

- `bunfig.toml` enforces:
  - `minimumReleaseAge = 259200` — 3-day cooldown. Every 2025-2026 worm was
    detected within 30 minutes; a 3-day gate is a near-complete consumer
    shield.
  - `exact = true` — no `^` or `~` floats reach the lockfile.
  - `frozenLockfile = true` — `bun install` refuses to drift; intentional
    additions go through `bun add`.
- `.npmrc` mirrors this for the publish path that uses `npm publish`:
  `ignore-scripts=true`, `min-release-age=3`, `audit-signatures=true`,
  `save-exact=true`, `engine-strict=true`.
- `package.json` declares `trustedDependencies: []` — explicit empty
  allowlist for Bun's lifecycle-script gate.
- `bun.lock` is committed; CI runs `bun install --frozen-lockfile`.

### Layer 3 — CI / CD

- Default-deny permissions: every workflow declares `permissions: {}` at the
  top level; each job re-grants only what it needs.
- **Build / publish are separate jobs.** The publish job runs *one*
  command — `npm publish` — so the OIDC token cannot be siphoned by a
  poisoned dep elsewhere in the same runner (the TanStack class).
- **`step-security/harden-runner`** on every job:
  - `audit` mode on CI / build jobs.
  - `block` mode on publish jobs, with an allowlist limited to npmjs,
    sigstore, and github.com.
- **GitHub Environment `npm-publish`** gates every publish job — required
  reviewers + optional wait timer configured in repo settings.
- **Every third-party Action is pinned to a commit SHA**, with the version
  in a trailing comment. Renovate keeps SHAs current via `pinDigests: true`.
- Workflows do **not** use `pull_request_target` and do **not**
  shell-interpolate `${{ github.event.* }}`.
- Monthly cache purge (`purge-cache.yml`) — defends against poisoned cache
  reuse across PRs.

### Layer 4 — Dependency hygiene

- **Renovate** (`renovate.json`) enforces a 3-day cooldown for runtime deps
  and 1-day for devDependencies. Vulnerability alerts bypass cooldown.
- `pinDigests: true` on `github-actions` updates — any Action bump is a SHA
  change visible in the PR diff.
- `rangeStrategy: pin` — Renovate writes exact versions, never ranges.

## Consumer guidance

If you depend on `@alien-id/*` packages, adopt the same defaults in your own
project — at minimum a 3-day cooldown on npm installs and frozen lockfiles
in CI. Our package manifests use exact-version pins to make this easier.

## Incident response

If we suspect one of our published packages is compromised:

1. Revoke every npm token and GitHub PAT touching the affected scope.
2. Disable the OIDC trusted publisher binding in npmjs settings.
3. `npm deprecate '@alien-id/<pkg>@<bad>' "Compromised — do not use"`. If
   within the 72h window, also `npm unpublish`.
4. Cut a clean patch release that supersedes the bad version, signed via a
   freshly re-bound OIDC publisher.
5. Publish a GitHub Security Advisory with IoCs.
6. Post-mortem: which layer failed, which held, what changes.
