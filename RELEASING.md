# Releasing Packages

## Package Dependencies

```
contract (no deps)      auth-client (no deps)
    ↓
  bridge → depends on contract
    ↓
  react → depends on bridge + contract
```

**Publishing order matters!** Packages must be published in dependency order, otherwise users won't be able to install them.

## Current Versions

| Package | Name | Current Version |
|---------|------|-----------------|
| contract | @alien-id/contract | 0.0.15-beta |
| bridge | @alien-id/bridge | 0.0.12-beta |
| react | @alien-id/react | 0.0.9-beta |
| auth-client | @alien-id/auth-client | 0.0.5-beta |

## Steps

### 1. Bump versions in package.json files

Edit the version field in each package you want to release:
```bash
vim packages/contract/package.json
vim packages/bridge/package.json
vim packages/react/package.json
vim packages/auth-client/package.json
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

# Step 3: Push react (depends on bridge + contract)
git push origin react@x.x.x
```

Monitor workflows at: https://github.com/alien-id/miniapp-sdk/actions

## Releasing a Single Package

If you only need to release one package, follow the dependency chain:

| Package | Must release first |
|---------|-------------------|
| contract | Nothing |
| auth-client | Nothing |
| bridge | contract (if changed) |
| react | contract + bridge (if changed) |

Example releasing only react:
```bash
# Edit version
vim packages/react/package.json

# Update lockfile
rm bun.lock && bun install

# Commit and tag
git add packages/react/package.json bun.lock
git commit -m "chore: bump react to x.x.x"
git tag react@x.x.x

# Push
git push origin develop react@x.x.x
```

## Troubleshooting

### "Package has a dependency loop" error

This happens when running `bun update @alien-id/*`. Don't use `bun update` for workspace packages. Instead:
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
