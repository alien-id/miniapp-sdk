---
name: release
description: Drive the changesets-based release flow. Use when the user wants to release packages, cut a version, declare a release intent, enter or exit a beta cycle, or check what's pending for the next release.
disable-model-invocation: false
user-invocable: true
---

# Release

The release pipeline is fully automated by changesets. A maintainer's only manual
gates are: write a `.changeset/*.md` on the feature PR, merge the bot-opened
"chore: release packages" Version PR, and approve the `npm-publish` environment.

See `RELEASING.md` for the full mental model. This skill drives the conversational
shape of the flow.

## Decision tree

When invoked, first run `bun changeset status --verbose` and figure out which
branch of the tree applies:

1. **Feature PR in progress** (user is mid-flight on a code change). Help them
   declare a release intent with `bun changeset` and commit the resulting
   `.changeset/*.md` file alongside their code. Stop after that.

2. **Pending changesets on `main`, no Version PR yet visible.** The
   `changesets/action` workflow opens it automatically on the next push to
   `main`. If the user just merged, wait ~30 seconds then point them at the PR
   list.

3. **Version PR open**. Read the PR (it lists computed bumps + cascade). If the
   user is ready to release, walk them through: review → squash-merge → approve
   the `npm-publish` environment → watch the workflow run. Surface the GitHub
   Actions URL.

4. **Beta cycle decision**. If `.changeset/pre.json` is absent and the user
   wants to start a beta cycle, run `bun changeset pre enter beta` and open a
   one-line PR. If `pre.json` exists with mode `pre` and the user wants stable,
   run `bun changeset pre exit` and open a one-line PR.

5. **Partial publish failure**. If the previous publish failed mid-loop, the
   recovery is to re-run the workflow from the GitHub Actions UI. The
   orchestrator skips already-published packages (via `npm view`) and resumes.
   Do NOT manually edit versions or tags to "fix" things.

## How to add a changeset (verbatim instructions)

```bash
bun changeset
# Interactive: pick packages, bump types (patch/minor/major), summary line.
git add .changeset/<id>.md
```

The summary line is what appears in the per-package CHANGELOG. Write it as if a
consumer is reading it: "Add X", "Fix Y", "Breaking: rename Z."

## Important behaviours to surface to the user

- **Cascade is automatic.** Bumping `contract` patches `bridge`/`react`/`solana-provider`. The user does not list the cascade — changesets does.
- **Examples are ignored.** `vite-miniapp`, `solana-wallet-example`, `reown-appkit-example` are excluded in `.changeset/config.json` so they never appear in Version PRs.
- **Version PR force-pushes on every new changeset.** If a reviewer previously approved the Version PR and a new changeset lands on `main`, the approval resets. Re-approve before merging.
- **In pre mode**, every Version PR ships as `x.y.z-beta.N` to `@beta`. A stable hotfix requires exiting pre mode first (one PR), shipping the hotfix (one PR), then re-entering pre mode (one PR). Acknowledge this cost when the user asks for a hotfix mid-beta.
- **Trusted publishing means no NPM_TOKEN.** Authentication is OIDC + sigstore provenance. If `npm publish` fails with an auth error, the trusted publisher config on npm needs to authorize `release.yml` for the failing package — that's a manual operator task, not a code fix.

## Hard rules

- NEVER edit `packages/*/package.json` `version` fields by hand. `changeset version` computes them.
- NEVER edit `bun.lock` manually after a `changeset version` run. The `ci:version` script wipes and regenerates it.
- NEVER push a tag directly. `changeset tag` (inside `ci:publish`) creates them.
- NEVER bypass the `npm-publish` environment reviewer gate. It is the last human checkpoint.
