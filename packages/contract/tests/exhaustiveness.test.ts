import { describe, expect, test } from 'bun:test';
import { $ } from 'bun';

/**
 * Verifies that `MethodResponseEvents` enforces exhaustive per-key coverage
 * over every `MethodName`. The previous declaration extended
 * `Record<MethodName, EventName | never>`, which silently accepts incomplete
 * maps — adding a new method without updating the map would classify it as
 * "request-response with response type `EventName`" by default.
 *
 * The fix replaces the index-signature base with a structural mapped-type
 * shape that requires one entry per `MethodName`. To prove that property
 * holds, this suite compiles two TypeScript fixtures with `tsc --noEmit`:
 *
 *   - `complete.fixture.ts` — declares an entry per method. Must compile.
 *   - `missing-key.fixture.ts` — deliberately drops one method. Must fail.
 *
 * If either expectation flips, exhaustiveness has regressed.
 */

const FIXTURE_DIR = `${import.meta.dir}/fixtures/exhaustiveness`;

async function tscFixture(fixture: string): Promise<{
  ok: boolean;
  stderr: string;
  stdout: string;
}> {
  // tsc refuses to take files on the CLI while a tsconfig.json is present
  // in the working tree (TS5112). Generate a one-shot tsconfig that
  // includes exactly the fixture file and invoke tsc via `--project`.
  const tmp = await Bun.file(
    `${FIXTURE_DIR}/.tsconfig.${fixture}.json`,
  ).exists();
  const tsconfigPath = `${FIXTURE_DIR}/.tsconfig.${fixture}.json`;
  if (!tmp) {
    await Bun.write(
      tsconfigPath,
      JSON.stringify(
        {
          compilerOptions: {
            target: 'ESNext',
            module: 'ESNext',
            moduleResolution: 'bundler',
            strict: true,
            skipLibCheck: true,
            noUncheckedIndexedAccess: true,
            noEmit: true,
            verbatimModuleSyntax: true,
            types: [],
          },
          files: [fixture],
        },
        null,
        2,
      ),
    );
  }
  const proc = await $`bunx tsc -p ${tsconfigPath}`.nothrow().quiet();
  return {
    ok: proc.exitCode === 0,
    stderr: proc.stderr.toString(),
    stdout: proc.stdout.toString(),
  };
}

describe('MethodResponseEvents — exhaustive coverage', () => {
  test('fixture that covers every MethodName compiles', async () => {
    const result = await tscFixture('complete.fixture.ts');
    if (!result.ok) {
      throw new Error(
        `Expected complete fixture to compile but tsc failed:\n${result.stdout}\n${result.stderr}`,
      );
    }
    expect(result.ok).toBe(true);
  }, 30_000);

  test('fixture that omits a MethodName entry fails to compile', async () => {
    const result = await tscFixture('missing-key.fixture.ts');
    expect(result.ok).toBe(false);
    // Confirm the error references the missing method, not some unrelated
    // type mismatch (which would mean the test is passing by accident).
    const combined = `${result.stdout}\n${result.stderr}`;
    expect(combined).toMatch(/app:close|missing|not assignable/i);
  }, 30_000);
});
