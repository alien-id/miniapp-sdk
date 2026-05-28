// Classify `npm view <name>@<version> version` for publish-loop idempotency.
// `code E404` in stderr is npm's canonical "version missing" signal; anything
// else with a non-zero exit is treated as transient (caller throws).

export type NpmViewResult = {
  status: number | null;
  stdout: string;
  stderr: string;
};

export type Classification = 'published' | 'not-published' | 'unknown';

const NOT_FOUND_RE = /\bcode E404\b/;

export function classifyNpmView(
  expectedVersion: string,
  result: NpmViewResult,
): Classification {
  if (result.status === 0) {
    return result.stdout.trim() === expectedVersion
      ? 'published'
      : 'not-published';
  }
  if (NOT_FOUND_RE.test(result.stderr ?? '')) {
    return 'not-published';
  }
  return 'unknown';
}
