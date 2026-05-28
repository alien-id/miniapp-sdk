// Build the per-package manifest entry used by the upload step in release.yml.
// One JSONL line per published package; the upload step looks up the matching
// GitHub Release (created by changesets/action) and uploads the asset list via
// `gh release upload --tag --clobber`.
//
// All paths are repo-root-relative so `gh` can resolve them with the working
// directory unchanged.

export type ReleaseEntry = {
  tag: string;
  assets: string[];
};

// Packages with extra release artifacts beyond the npm tarball. The schemas
// here are the wire-protocol descriptors used by non-TS consumers (codegen
// tooling, mobile clients) that pull from GitHub Releases rather than npm.
const EXTRA_ASSETS: Record<string, string[]> = {
  '@alien-id/miniapps-contract': [
    'packages/contract/artifacts/events.schema.json',
    'packages/contract/artifacts/methods.schema.json',
  ],
};

export function buildReleaseEntry(
  name: string,
  version: string,
  tarballRepoRelativePath: string,
): ReleaseEntry {
  return {
    tag: `${name}@${version}`,
    assets: [tarballRepoRelativePath, ...(EXTRA_ASSETS[name] ?? [])],
  };
}
