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

### Step 1: Gather Current Versions

Read version from each package.json:
- `packages/contract/package.json`
- `packages/bridge/package.json`
- `packages/react/package.json`
- `packages/auth-client/package.json`

Display current versions to user in a table format.

### Step 2: Select Packages to Release

Ask user which packages to release using a **multi-select** prompt with options:
- **contract** - @alien-id/contract (no deps)
- **auth-client** - @alien-id/auth-client (no deps)
- **bridge** - @alien-id/bridge (depends on contract)
- **react** - @alien-id/react (depends on bridge + contract)

If the user selects a dependent package without its dependencies, warn them and automatically include the required dependencies:
- `bridge` requires `contract`
- `react` requires `contract` and `bridge`

Only process the selected packages in subsequent steps.

### Step 3: Select Release Type

Ask user to select the release type:
- **Stable** - No suffix (e.g., 0.0.15)
- **Beta** - Add -beta suffix (e.g., 0.0.15-beta)
- **Alpha** - Add -alpha suffix (e.g., 0.0.15-alpha)

### Step 4: Determine New Versions

Ask user which version bump they want:
- **Bump patch** (e.g., 0.0.15 → 0.0.16)
- **Bump minor** (e.g., 0.0.15 → 0.1.0)
- **Bump major** (e.g., 0.0.15 → 1.0.0)
- **Custom** (let user specify versions)

Apply the selected release type suffix to all versions.

### Step 5: Update package.json Files

Edit the `version` field in each **selected** package.json with the new versions.

### Step 6: Regenerate Lockfile

Run:
```bash
rm bun.lock && bun install
```

This is required because bun uses lockfile versions when publishing.

### Step 7: Verify Lockfile Versions

Run grep for each **selected** package to verify versions match. Confirm all versions are correct.

### Step 8: Update RELEASING.md

Update the "Current Versions" table in RELEASING.md with the new versions for **selected** packages only.

### Step 9: Commit Changes

Stage and commit only the **selected** packages:
```bash
git add packages/*/package.json bun.lock RELEASING.md
git commit -m "chore: :bookmark: bump packages for release

- <package>: <version>
..."
```

Only list the selected packages in the commit message.

### Step 10: Create Tags

Create tags only for **selected** packages:
```bash
git tag <package>@<version>
```

### Step 11: Push in Dependency Order

**CRITICAL**: Push only **selected** packages in this exact order, waiting for user confirmation between each step.

**Push 1** - Independent packages (if selected):
Push `contract` and/or `auth-client` tags along with develop branch.
Tell user: "Wait for workflows to complete at https://github.com/alien-id/miniapp-sdk/actions"
Wait for user to confirm "ready" before continuing.

**Push 2** - Bridge (if selected, depends on contract):
Push `bridge` tag.
Tell user: "Wait for bridge workflow to complete"
Wait for user to confirm "ready" before continuing.

**Push 3** - React (if selected, depends on bridge + contract):
Push `react` tag.

Skip any push steps that have no selected packages.

### Step 12: Summary

Display final summary table with all released packages and their versions.
Provide link to monitor workflows: https://github.com/alien-id/miniapp-sdk/actions
