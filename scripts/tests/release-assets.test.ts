import { describe, expect, test } from 'bun:test';
import { buildReleaseEntry } from '../lib/release-assets';

describe('buildReleaseEntry', () => {
  test('non-contract package returns only the tarball', () => {
    const entry = buildReleaseEntry(
      '@alien-id/miniapps-bridge',
      '2.1.0',
      'packages/bridge/alien-id-miniapps-bridge-2.1.0.tgz',
    );
    expect(entry).toEqual({
      tag: '@alien-id/miniapps-bridge@2.1.0',
      assets: ['packages/bridge/alien-id-miniapps-bridge-2.1.0.tgz'],
    });
  });

  test('contract attaches both wire-protocol schemas alongside the tarball', () => {
    const entry = buildReleaseEntry(
      '@alien-id/miniapps-contract',
      '2.1.0-beta',
      'packages/contract/alien-id-miniapps-contract-2.1.0-beta.tgz',
    );
    expect(entry.tag).toBe('@alien-id/miniapps-contract@2.1.0-beta');
    expect(entry.assets).toEqual([
      'packages/contract/alien-id-miniapps-contract-2.1.0-beta.tgz',
      'packages/contract/artifacts/events.schema.json',
      'packages/contract/artifacts/methods.schema.json',
    ]);
  });

  test('tag format is `<name>@<version>` matching changesets/action git tags', () => {
    // changesets/action creates GitHub Releases keyed on this exact tag string
    // (see changesets/action/src/run.ts:120). The upload step looks up the
    // release by this tag, so the format must match exactly.
    expect(
      buildReleaseEntry(
        '@alien-id/miniapps-react',
        '1.4.2',
        'packages/react/x.tgz',
      ).tag,
    ).toBe('@alien-id/miniapps-react@1.4.2');
  });

  test('prerelease versions with hyphens preserve correctly in the tag', () => {
    expect(
      buildReleaseEntry(
        '@alien-id/miniapps-auth-client',
        '2.1.0-alpha-20260528120000',
        'packages/auth-client/x.tgz',
      ).tag,
    ).toBe('@alien-id/miniapps-auth-client@2.1.0-alpha-20260528120000');
  });

  test('unscoped package name still produces a valid tag', () => {
    const entry = buildReleaseEntry(
      'some-unscoped-pkg',
      '1.0.0',
      'packages/x/some-unscoped-pkg-1.0.0.tgz',
    );
    expect(entry.tag).toBe('some-unscoped-pkg@1.0.0');
    expect(entry.assets).toEqual(['packages/x/some-unscoped-pkg-1.0.0.tgz']);
  });
});
