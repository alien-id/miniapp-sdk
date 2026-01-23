---
name: release
description: Release packages to npm in correct dependency order
disable-model-invocation: false
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

### Step 1: Detect Changes Since Last Release

For each package, find the latest tag and check for changes:

```bash
# Get latest tag for each package
git tag -l "contract@*" --sort=-v:refname | head -1
git tag -l "auth-client@*" --sort=-v:refname | head -1
git tag -l "bridge@*" --sort=-v:refname | head -1
git tag -l "react@*" --sort=-v:refname | head -1

# Check for changes since last tag (for each package)
git diff <latest-tag>..HEAD --name-only -- packages/<package>/
```

Display results in a table showing:
- Package name
- Current version (from package.json)
- Latest release tag
- Whether there are changes (Yes/No)
- Number of changed files

If a package has no changes, it will be skipped from the release.

### Step 2: Confirm Packages to Release

Show the user which packages have changes and will be released.
Ask for confirmation to proceed. User can also manually exclude packages if needed.

### Step 3: Select Version Bump Per Package

For each package with changes, ask the user to select the version bump using individual prompts:

For **contract** (if changed):
- Patch (0.0.15 → 0.0.16)
- Minor (0.0.15 → 0.1.0)
- Major (0.0.15 → 1.0.0)

For **auth-client** (if changed):
- Patch / Minor / Major

For **bridge** (if changed):
- Patch / Minor / Major

For **react** (if changed):
- Patch / Minor / Major

### Step 4: Select Release Type

Ask user to select the release type (applies to all packages):
- **Stable** - No suffix (e.g., 0.0.16)
- **Beta** - Add -beta suffix (e.g., 0.0.16-beta)
- **Alpha** - Add -alpha suffix (e.g., 0.0.16-alpha)

### Step 5: Confirm New Versions

Display a summary table with:
- Package name
- Current version
- New version (with bump + suffix applied)

Ask user to confirm before proceeding.

### Step 6: Update package.json Files

Edit the `version` field in each changed package's package.json with the new versions.

### Step 7: Regenerate Lockfile

Run:
```bash
rm bun.lock && bun install
```

This is required because bun uses lockfile versions when publishing.

### Step 8: Verify Lockfile Versions

Run grep for each changed package to verify versions match:
```bash
grep -A2 '"packages/<package>"' bun.lock
```

Confirm all versions are correct.

### Step 9: Update RELEASING.md

Update the "Current Versions" table in RELEASING.md with the new versions for changed packages.

### Step 10: Commit Changes

Stage and commit:
```bash
git add packages/*/package.json bun.lock RELEASING.md
git commit -m "chore: :bookmark: bump packages for release

- <package>: <version>
..."
```

Only list the changed packages in the commit message.

### Step 11: Create Tags

Create tags only for changed packages:
```bash
git tag <package>@<version>
```

### Step 12: Push in Dependency Order

**CRITICAL**: Push only changed packages in this exact order, waiting for user confirmation between each step.

**Push 1** - Independent packages (if changed):
Push `contract` and/or `auth-client` tags along with develop branch.
Tell user: "Wait for workflows to complete at https://github.com/alien-id/miniapp-sdk/actions"
Wait for user to confirm "ready" before continuing.

**Push 2** - Bridge (if changed):
Push `bridge` tag.
Tell user: "Wait for bridge workflow to complete"
Wait for user to confirm "ready" before continuing.

**Push 3** - React (if changed):
Push `react` tag.

Skip any push steps that have no changed packages.

### Step 13: Summary

Display final summary table with all released packages and their versions.
Provide link to monitor workflows: https://github.com/alien-id/miniapp-sdk/actions
