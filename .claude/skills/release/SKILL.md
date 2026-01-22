---
name: release
description: Release packages to npm in correct dependency order
disable-model-invocation: true
---

# Release Skill

Release packages to npm in the correct dependency order.

## Package Dependency Order

```
contract (no deps)      auth-client (no deps)
    ↓
  bridge → depends on contract
    ↓
  react → depends on bridge + contract
```

## Execution Steps

Execute these steps in exact order. Do not skip steps or change the order.

### Step 1: Gather Current Versions

Read version from each package.json:
- `packages/contract/package.json`
- `packages/bridge/package.json`
- `packages/react/package.json`
- `packages/auth-client/package.json`

Display current versions to user in a table format.

### Step 2: Select Release Type

Ask user to select the release type:
- **Stable** - No suffix (e.g., 0.0.15)
- **Beta** - Add -beta suffix (e.g., 0.0.15-beta)
- **Alpha** - Add -alpha suffix (e.g., 0.0.15-alpha)

### Step 3: Determine New Versions

Ask user which version bump they want:
- **Bump patch** (e.g., 0.0.15 → 0.0.16)
- **Bump minor** (e.g., 0.0.15 → 0.1.0)
- **Bump major** (e.g., 0.0.15 → 1.0.0)
- **Remove suffix only** (e.g., 0.0.15-beta → 0.0.15) - only if current has suffix
- **Custom** (let user specify versions)

Apply the selected release type suffix to all versions.

### Step 4: Update package.json Files

Edit the `version` field in each package.json with the new versions:
- `packages/contract/package.json`
- `packages/bridge/package.json`
- `packages/react/package.json`
- `packages/auth-client/package.json`

### Step 5: Regenerate Lockfile

Run:
```bash
rm bun.lock && bun install
```

This is required because bun uses lockfile versions when publishing.

### Step 6: Verify Lockfile Versions

Run and display output:
```bash
grep -A2 '"packages/contract"' bun.lock
grep -A2 '"packages/bridge"' bun.lock
grep -A2 '"packages/react"' bun.lock
grep -A2 '"packages/auth-client"' bun.lock
```

Confirm all versions match the expected new versions.

### Step 7: Update RELEASING.md

Update the "Current Versions" table in RELEASING.md with the new versions.

### Step 8: Commit Changes

Stage and commit:
```bash
git add packages/*/package.json bun.lock RELEASING.md
git commit -m "chore: :bookmark: bump packages for release

- contract: <version>
- bridge: <version>
- react: <version>
- auth-client: <version>"
```

### Step 9: Create Tags

Create tags for all packages:
```bash
git tag contract@<version>
git tag auth-client@<version>
git tag bridge@<version>
git tag react@<version>
```

### Step 10: Push in Dependency Order

**CRITICAL**: Push in this exact order, waiting for user confirmation between each step.

**Push 1** - Independent packages (no dependencies):
```bash
git push origin develop contract@<version> auth-client@<version>
```
Tell user: "Wait for contract and auth-client workflows to complete at https://github.com/alien-id/miniapp-sdk/actions"
Wait for user to confirm "ready" before continuing.

**Push 2** - Bridge (depends on contract):
```bash
git push origin bridge@<version>
```
Tell user: "Wait for bridge workflow to complete"
Wait for user to confirm "ready" before continuing.

**Push 3** - React (depends on bridge + contract):
```bash
git push origin react@<version>
```

### Step 11: Summary

Display final summary table with all released packages and their versions.
Provide link to monitor workflows: https://github.com/alien-id/miniapp-sdk/actions
