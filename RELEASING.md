# Releasing Packages

## Package Dependencies

```
contract (no deps)      auth-client (no deps)
    ↓
  bridge → depends on contract
    ↓
  react → depends on bridge + contract
  solana-provider → depends on bridge + contract
```

**Publishing order matters!** Packages must be published in dependency order, otherwise users won't be able to install them.

**Cascade rule:** When a package is published, **all packages that depend on it must also be published** so their `workspace:*` dependency resolves to the new version. Otherwise users installing an upstream package get a stale dependency.

| If you release... | You MUST also release |
|--------------------|-----------------------|
| contract | bridge, react, solana-provider |
| bridge | react, solana-provider |
| auth-client | (nothing) |
| react | (nothing) |
| solana-provider | (nothing) |

## Current Versions

| Package | Name | Current Version |
|---------|------|-----------------|
| contract | @alien_org/contract | 0.2.4 |
| bridge | @alien_org/bridge | 0.2.5 |
| react | @alien_org/react | 0.2.8 |
| auth-client | @alien_org/auth-client | 0.2.4 |
| solana-provider | @alien_org/solana-provider | 0.1.0 |

## Steps

### 1. Bump versions in package.json files

Edit the version field in each package you want to release:
```bash
vim packages/contract/package.json
vim packages/bridge/package.json
vim packages/react/package.json
vim packages/auth-client/package.json
vim packages/solana-provider/package.json
```

### 2. Update lockfile

**Important:** `bun install` alone won't update workspace versions. You must regenerate the lockfile:
```bash
rm bun.lock && bun install
```

### 3. Verify lockfile has correct versions

Check that the new versions appear in bun.lock:
```bash
grep -A2 '"packages/contract"' bun.lock
grep -A2 '"packages/bridge"' bun.lock
grep -A2 '"packages/react"' bun.lock
grep -A2 '"packages/auth-client"' bun.lock
grep -A2 '"packages/solana-provider"' bun.lock
```

### 4. Commit changes

```bash
git add packages/*/package.json bun.lock
git commit -m "chore: bump packages for release"
```

### 5. Create tags

```bash
git tag contract@x.x.x
git tag auth-client@x.x.x
git tag bridge@x.x.x
git tag react@x.x.x
git tag solana-provider@x.x.x
```

### 6. Push in dependency order

**This is critical!** Push tags in the correct order and wait for each workflow to complete.

```bash
# Step 1: Push commit + packages with no dependencies
git push origin develop contract@x.x.x auth-client@x.x.x
# ⏳ Wait for workflows to complete

# Step 2: Push bridge (depends on contract)
git push origin bridge@x.x.x
# ⏳ Wait for workflow to complete

# Step 3: Push react + solana-provider (depend on bridge + contract)
git push origin react@x.x.x solana-provider@x.x.x
```

Monitor workflows at: https://github.com/alien-id/miniapp-sdk/actions

## Releasing a Single Package

You can't truly release just one package if it has dependents. The cascade rule applies:

| Package | Also requires release |
|---------|----------------------|
| contract | bridge, react, solana-provider |
| bridge | react, solana-provider |
| auth-client | (nothing) |
| react | (nothing) |
| solana-provider | (nothing) |

Dependents that had no code changes get a **patch** bump (the dependency version changed, which is a publishable change). Only the root package you intended to release gets the bump type you chose (minor, major, etc.).

## Troubleshooting

### "Package has a dependency loop" error

This happens when running `bun update @alien_org/*`. Don't use `bun update` for workspace packages. Instead:
```bash
rm bun.lock && bun install
```

### Lockfile versions not updating

If `bun install` shows "no changes" but versions are wrong, delete and regenerate:
```bash
rm bun.lock && bun install
```

### Build fails with "bundle option is deprecated"

Remove `bundle: true` from `tsdown.config.ts`. Bundling is the default behavior.

### Tags already exist on remote

Delete and recreate:
```bash
# Delete remote tag
git push origin :refs/tags/package@x.x.x

# Push new tag
git push origin package@x.x.x
```

## Why the lockfile update?

The lockfile stores workspace package versions. When publishing, bun uses versions from the lockfile, not package.json. If you skip this step, the published package will have the old version number.
