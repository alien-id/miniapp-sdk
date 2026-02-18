#!/usr/bin/env bash
# Detect changes in packages since their last release tag
# Usage: ./detect-changes.sh
# Output: Table with package change info and cascade warnings

PACKAGES=(contract auth-client bridge react solana-provider)
PACKAGE_DIRS=(packages/contract packages/auth-client packages/bridge packages/react packages/solana-provider)

echo "| Package | Current Version | Latest Tag | Has Changes | Files Changed |"
echo "|---------|-----------------|------------|-------------|---------------|"

# Track which packages have changes (space-separated list)
changed_packages=""

for i in "${!PACKAGES[@]}"; do
    pkg="${PACKAGES[$i]}"
    dir="${PACKAGE_DIRS[$i]}"

    # Get current version from package.json
    version=$(grep '"version"' "$dir/package.json" | head -1 | sed 's/.*"version": *"\([^"]*\)".*/\1/')

    # Get latest tag
    latest_tag=$(git tag -l "${pkg}@*" --sort=-v:refname 2>/dev/null | head -1)

    if [ -z "$latest_tag" ]; then
        latest_tag="(none)"
        changes="Yes"
        file_count="N/A"
    else
        # Count changed files (committed + staged + unstaged)
        changed_files=$(git diff "$latest_tag"..HEAD --name-only -- "$dir/" 2>/dev/null)
        uncommitted=$(git diff --name-only -- "$dir/" 2>/dev/null)
        staged=$(git diff --cached --name-only -- "$dir/" 2>/dev/null)
        all_changes=$(printf "%s\n%s\n%s" "$changed_files" "$uncommitted" "$staged" | sort -u | grep -v '^$')

        if [ -z "$all_changes" ]; then
            changes="No"
            file_count="0"
        else
            changes="Yes"
            file_count=$(echo "$all_changes" | wc -l | tr -d ' ')
        fi
    fi

    if [ "$changes" = "Yes" ]; then
        changed_packages="$changed_packages $pkg"
    fi

    echo "| $pkg | $version | $latest_tag | $changes | $file_count |"
done

# Show cascade warnings
echo ""
echo "### Cascade Requirements"
echo ""

cascade_needed=false

# contract -> bridge, react, solana-provider
if echo "$changed_packages" | grep -qw "contract"; then
    echo "- **contract** changed -> must also release: bridge, react, solana-provider"
    cascade_needed=true
fi

# bridge -> react, solana-provider
if echo "$changed_packages" | grep -qw "bridge"; then
    echo "- **bridge** changed -> must also release: react, solana-provider"
    cascade_needed=true
fi

if [ "$cascade_needed" = false ]; then
    echo "No cascade needed."
fi
