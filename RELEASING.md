# Releasing Packages

## Steps

1. **Bump version** in package.json:
   ```bash
   # Edit the version field
   vim packages/react/package.json
   ```

2. **Update lockfile**:
   ```bash
   bun update @alien-id/bridge @alien-id/contract @alien-id/react
   ```

3. **Commit and tag**:
   ```bash
   git add packages/*/package.json bun.lock
   git commit -m "chore: bump react to 0.0.7-alpha"
   git tag react@0.0.7-alpha
   git push origin develop --tags
   ```

That's it. The GitHub Action will publish automatically.

## Why the lockfile update?

The lockfile stores workspace package versions. When publishing, bun uses versions from the lockfile, not package.json. Always update the lockfile after bumping versions.
