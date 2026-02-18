---
name: release
description: Release packages to npm in correct dependency order. Use when publishing new versions, bumping versions, or deploying packages to the registry.
disable-model-invocation: false
user-invocable: true
---

# Release Packages

Release monorepo packages to npm in the correct dependency order.

## Package Dependencies

```
contract (no deps)      auth-client (no deps)
    ↓
  bridge → depends on contract
    ↓
  react → depends on bridge + contract
  solana-provider → depends on bridge + contract
```

## Cascade Rule

When a package is published, **all packages that depend on it must also be published** — otherwise their published `workspace:*` dependency resolves to a stale version and users won't get the update.

| If releasing... | Must also release |
|-----------------|-------------------|
| contract | bridge, react, solana-provider |
| bridge | react, solana-provider |
| auth-client | (nothing) |
| react | (nothing) |
| solana-provider | (nothing) |

Cascaded packages that had no code changes get a **patch** bump automatically.

## Supporting Files

- `scripts/detect-changes.sh` - Detects which packages have changes since last release

## Execution Steps

Execute steps in order. Each step has clear success criteria.

### Step 1: Detect Changes

Run the change detection script:

```bash
bash .claude/skills/release/scripts/detect-changes.sh
```

Display the results table to the user showing:
- Package name
- Current version (from package.json)
- Latest release tag
- Whether there are changes (Yes/No)
- Number of changed files

**Success**: Table displayed with accurate change detection.

### Step 2: Select Packages

Ask the user which packages to release using a **multi-select** prompt:
- Show packages with changes pre-selected
- Allow user to add/remove packages (force release without changes)
- Options: contract, auth-client, bridge, react, solana-provider

If no packages selected, abort the release.

**After selection, apply the cascade rule automatically:**
- If contract is selected → add bridge, react, solana-provider
- If bridge is selected → add react, solana-provider
- Display the expanded list to the user: "Based on the dependency cascade, these packages will also be released: ..."

**Success**: User has confirmed the full package list (including cascaded dependencies).

### Step 3: Select Version Bump Per Package

For each **user-selected** package (not cascaded ones), ask the user to choose the version bump:
- **Patch** (0.0.x → 0.0.x+1)
- **Minor** (0.x.0 → 0.x+1.0)
- **Major** (x.0.0 → x+1.0.0)

Use a single multi-question prompt to collect all bumps at once.

**Cascaded packages** (added automatically by the cascade rule, not directly selected by the user) get a **patch** bump automatically — do NOT ask the user for these.

**Success**: Version bump selected for each package.

### Step 4: Select Release Type

Ask the user for the release type (applies to all packages):
- **Stable** - No suffix (1.0.0)
- **Beta** - Add -beta suffix (1.0.0-beta)
- **Alpha** - Add -alpha suffix (1.0.0-alpha)

**Success**: Release type selected.

### Step 5: Confirm Versions

Display a summary table:

| Package | Current | New |
|---------|---------|-----|
| ... | ... | ... |

Ask user to confirm with a simple Yes/No prompt.

**Success**: User confirmed the version changes.

### Step 6: Update package.json Files

Edit the `version` field in each selected package's package.json.

**Success**: All package.json files updated with new versions.

### Step 7: Regenerate Lockfile

```bash
rm bun.lock && bun install
```

**Success**: Lockfile regenerated without errors.

### Step 8: Verify Lockfile

For each selected package, verify the lockfile has correct versions:

```bash
grep -A2 '"packages/<package>"' bun.lock
```

**Success**: All versions in lockfile match expected new versions.

### Step 9: Update RELEASING.md

Update the "Current Versions" table in RELEASING.md with new versions.

**Success**: RELEASING.md updated.

### Step 10: Commit Changes

```bash
git add packages/*/package.json bun.lock RELEASING.md
git commit -m "chore: :bookmark: bump packages for release

- <package>: <version>
..."
```

**Success**: Changes committed.

### Step 11: Create Tags

Create a git tag for each selected package:

```bash
git tag <package>@<version>
```

**Success**: All tags created locally.

### Step 12: Push in Dependency Order

Push tags in dependency order, waiting for CI between each group.

**Push 1** - Independent packages:
```bash
git push origin develop contract@<version> auth-client@<version>
```
Show message: "Pushing contract and auth-client. Click **Continue** when workflows complete."
Provide link: https://github.com/alien-id/miniapp-sdk/actions
Wait for user to click Continue.

**Push 2** - Bridge (if selected):
```bash
git push origin bridge@<version>
```
Show message: "Pushing bridge. Click **Continue** when workflow completes."
Wait for user to click Continue.

**Push 3** - React + Solana Provider (if selected):
```bash
git push origin react@<version> solana-provider@<version>
```

Skip any push step if no packages in that group were selected.

**Success**: All tags pushed, workflows triggered.

### Step 13: Summary

Display final summary:

| Package | Version | Status |
|---------|---------|--------|
| ... | ... | ✅ Released |

Provide link: https://github.com/alien-id/miniapp-sdk/actions

**Success**: All selected packages released.
