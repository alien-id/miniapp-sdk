// Derive an npm dist-tag from a semver version string. Stable versions go to
// `latest`; prereleases go to a tag named after the first prerelease identifier
// (`-beta.0` → `beta`, `-alpha-20260101` → `alpha`). The version is validated
// loosely against `MAJOR.MINOR.PATCH[-<prerelease>]`.
const SEMVER_RE =
  /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/;

export function deriveTag(version: string): string {
  const match = SEMVER_RE.exec(version);
  if (!match) throw new Error(`Invalid semver: ${JSON.stringify(version)}`);
  const prerelease = match[4];
  if (!prerelease) return 'latest';
  // Take the leading identifier — whatever precedes the first '.' or '-'.
  const identifier = prerelease.split(/[.-]/)[0];
  if (!identifier)
    throw new Error(
      `Empty prerelease identifier in ${JSON.stringify(version)}`,
    );
  return identifier;
}
