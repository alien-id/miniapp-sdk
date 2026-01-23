#!/bin/bash
# Detect changes in packages since their last release tag
# Usage: ./detect-changes.sh
# Output: JSON-like format with package change info

PACKAGES=("contract" "auth-client" "bridge" "react")
PACKAGE_DIRS=("packages/contract" "packages/auth-client" "packages/bridge" "packages/react")

echo "| Package | Current Version | Latest Tag | Has Changes | Files Changed |"
echo "|---------|-----------------|------------|-------------|---------------|"

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
        # Count changed files
        changed_files=$(git diff "$latest_tag"..HEAD --name-only -- "$dir/" 2>/dev/null)
        if [ -z "$changed_files" ]; then
            changes="No"
            file_count="0"
        else
            changes="Yes"
            file_count=$(echo "$changed_files" | wc -l | tr -d ' ')
        fi
    fi

    echo "| $pkg | $version | $latest_tag | $changes | $file_count |"
done
