// Classify the result of `npm view <name>@<version> version` for the purpose
// of publish-loop idempotency. Three outcomes:
//
//   - 'published'     — exit 0 and stdout matches the expected version. Skip publish.
//   - 'not-published' — exit non-zero AND stderr indicates a 404 (the canonical
//                       "this version does not exist on the registry" signal).
//   - 'unknown'       — any other failure (network, DNS, 5xx, rate-limit, kill).
//                       Caller must abort rather than guess — guessing
//                       'not-published' on a transient blips re-publishes
//                       packages that are already there.
//
// The discriminator for 'not-published' is the literal string `code E404` in
// stderr, which `npm view` prints whether the version or the whole package is
// missing. Anything else is treated as transient.

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
