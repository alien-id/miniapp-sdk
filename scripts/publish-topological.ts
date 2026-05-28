#!/usr/bin/env bun

// Publishes every public workspace package to npm in topological order:
// upstream packages publish before their internal dependents, so consumers
// installing during the publish window never see a stale upstream.
//
// Bun-specific notes:
//   - `bun pm pack` correctly substitutes `workspace:*` to a concrete version.
//   - `npm pack` does NOT (open issue: oven-sh/bun#24687). We therefore pack
//     with bun and upload the tarball with `npm publish <tgz>` so OIDC trusted
//     publishing + sigstore provenance still apply.
//   - `bun publish` exists but lacks `--provenance`, so we cannot use it here.
//
// Idempotency: a re-run after a partial failure skips packages already on the
// registry (via `npm view`) and resumes from the failure point.

import { spawnSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { classifyNpmView } from './lib/npm-view';
import { buildReleaseEntry } from './lib/release-assets';
import { deriveTag } from './lib/tag';
import { topoSort } from './lib/topo';

const REPO_ROOT = new URL('..', import.meta.url).pathname;
const PACKAGES_DIR = join(REPO_ROOT, 'packages');
const DRY_RUN = process.argv.includes('--dry-run');
// Optional manifest path: when set, the orchestrator writes one JSONL line per
// package with the tag + asset paths the upload step should attach to that
// package's GitHub Release. Written for every package — including ones already
// on the registry — so a re-run after a partial upload still has the manifest
// it needs to drive `gh release upload --clobber`.
const ASSETS_MANIFEST = process.env.RELEASE_ASSETS_MANIFEST;

type Pkg = {
  name: string;
  version: string;
  dir: string;
  private: boolean;
  deps: string[];
};

async function readPackages(): Promise<Pkg[]> {
  const entries = await readdir(PACKAGES_DIR, { withFileTypes: true });
  const dirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  const pkgs: Pkg[] = [];
  for (const dir of dirs) {
    const manifestPath = join(PACKAGES_DIR, dir, 'package.json');
    const raw = await readFile(manifestPath, 'utf8').catch(() => null);
    if (!raw) continue;
    const m = JSON.parse(raw) as {
      name?: string;
      version?: string;
      private?: boolean;
      dependencies?: Record<string, string>;
    };
    if (!m.name || !m.version) continue;
    pkgs.push({
      name: m.name,
      version: m.version,
      dir,
      private: m.private === true,
      deps: Object.keys(m.dependencies ?? {}),
    });
  }
  return pkgs;
}

function alreadyPublished(name: string, version: string): boolean {
  // `npm view <name>@<version> version` exits 0 if the version exists, non-zero
  // with a 404 if it doesn't, and non-zero with any other code if the lookup
  // itself failed (network, DNS, rate-limit). Treating "lookup failed" as
  // "not published" would re-publish packages that are already on the registry
  // — so unknown failures abort the loop and surface to the operator.
  const result = spawnSync('npm', ['view', `${name}@${version}`, 'version'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const classification = classifyNpmView(version, {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  });
  if (classification === 'unknown') {
    throw new Error(
      `npm view ${name}@${version} failed unexpectedly (exit ${result.status}). ` +
        `Re-run the workflow to retry; this is treated as transient on purpose ` +
        `so a real publish is never skipped. Stderr:\n${(result.stderr ?? '').trim()}`,
    );
  }
  return classification === 'published';
}

function run(
  cmd: string,
  args: string[],
  cwd: string,
  skipInDryRun = true,
): void {
  const prefix = DRY_RUN && skipInDryRun ? '  [dry] $' : '  $';
  console.log(`${prefix} ${cmd} ${args.join(' ')}`);
  if (DRY_RUN && skipInDryRun) return;
  const result = spawnSync(cmd, args, { cwd, stdio: 'inherit' });
  if (result.status !== 0) {
    throw new Error(
      `${cmd} ${args.join(' ')} (cwd: ${cwd}) exited with ${result.status}`,
    );
  }
}

async function findTarball(
  cwd: string,
  name: string,
  version: string,
): Promise<string> {
  // Bun packs as `<scope>-<name>-<version>.tgz` under the package cwd.
  const expected = `${name.replace('@', '').replace('/', '-')}-${version}.tgz`;
  const entries = await readdir(cwd);
  const match = entries.find(
    (f) => f === expected || (f.endsWith('.tgz') && f.includes(version)),
  );
  if (!match)
    throw new Error(`Tarball not found in ${cwd} (expected ${expected})`);
  return match;
}

async function main() {
  const pkgs = await readPackages();
  const publishable = pkgs.filter((p) => !p.private);
  const publishableNames = new Set(publishable.map((p) => p.name));

  const graph = new Map<string, string[]>(
    publishable.map((p) => [
      p.name,
      p.deps.filter((d) => publishableNames.has(d)),
    ]),
  );
  const order = topoSort(graph);
  const byName = new Map(publishable.map((p) => [p.name, p]));

  console.log(`Topological publish order: ${order.join(' → ')}`);
  if (DRY_RUN)
    console.log('--- DRY RUN: no network operations will be performed ---\n');

  const summary: string[] = [];
  for (const name of order) {
    const pkg = byName.get(name);
    if (!pkg) throw new Error(`Package ${name} missing from byName map`);
    const cwd = join(PACKAGES_DIR, pkg.dir);
    const tag = deriveTag(pkg.version);
    console.log(`\n=== ${pkg.name}@${pkg.version} (tag: ${tag}) ===`);

    // Pack always runs (even in dry-run) — it's local-only and validates that
    // `workspace:*` substitutes correctly under Bun. The network publish step
    // is the only one suppressed in dry-run.
    run('bun', ['pm', 'pack'], cwd, false);
    const tarball = await findTarball(cwd, pkg.name, pkg.version);

    // Record the manifest entry BEFORE the publish guard. We want skipped
    // packages (already-published on a re-run) in the manifest too, so the
    // upload step can fill in any GitHub Release assets that didn't make it
    // up on the prior attempt. `gh release upload --clobber` is idempotent.
    if (ASSETS_MANIFEST) {
      const tarballRepoPath = relative(REPO_ROOT, join(cwd, tarball));
      const entry = buildReleaseEntry(pkg.name, pkg.version, tarballRepoPath);
      appendFileSync(ASSETS_MANIFEST, `${JSON.stringify(entry)}\n`);
    }

    if (!DRY_RUN && alreadyPublished(pkg.name, pkg.version)) {
      console.log(`  ✓ already on registry — skipping publish`);
      summary.push(`skipped publish ${pkg.name}@${pkg.version} (registry hit)`);
      continue;
    }

    run(
      'npm',
      [
        'publish',
        `./${tarball}`,
        '--access',
        'public',
        '--provenance',
        '--tag',
        tag,
      ],
      cwd,
    );
    summary.push(`published ${pkg.name}@${pkg.version} → ${tag}`);
  }

  console.log('\n=== Summary ===');
  for (const line of summary) console.log(`  ${line}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
