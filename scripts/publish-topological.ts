#!/usr/bin/env bun

// Topological publish loop. Bun-specific: `bun pm pack` substitutes
// `workspace:*` to concrete versions (npm pack does not — oven-sh/bun#24687)
// and `bun publish` lacks `--provenance`, so we pack with bun and upload with
// `npm publish <tgz>`. Idempotent across re-runs via `npm view`.

import { spawnSync } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { runNpmView } from './lib/npm-view';
import { readPackages } from './lib/packages';
import { deriveTag } from './lib/tag';
import { topoSort } from './lib/topo';

const REPO_ROOT = new URL('..', import.meta.url).pathname;
const PACKAGES_DIR = join(REPO_ROOT, 'packages');
const DRY_RUN = process.argv.includes('--dry-run');

function alreadyPublished(name: string, version: string): boolean {
  // Unknown failures throw rather than degrade to "not published" — a transient
  // network blip must not cause a re-publish attempt against an existing version.
  const classification = runNpmView(name, version);
  if (classification === 'unknown') {
    throw new Error(
      `npm view ${name}@${version} failed unexpectedly. Re-run the workflow ` +
        `to retry; this is treated as transient on purpose so a real publish ` +
        `is never skipped.`,
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
  // Bun packs to `<scope>-<name>-<version>.tgz` in the package cwd.
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
  const pkgs = await readPackages(PACKAGES_DIR);
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

    if (!DRY_RUN && alreadyPublished(pkg.name, pkg.version)) {
      console.log(`  ✓ already on registry — skipping`);
      summary.push(`skipped ${pkg.name}@${pkg.version}`);
      continue;
    }

    // Pack always runs — local-only and validates `workspace:*` substitution.
    run('bun', ['pm', 'pack'], cwd, false);
    const tarball = await findTarball(cwd, pkg.name, pkg.version);
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
