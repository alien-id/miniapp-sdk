# Architecture Decision Records

This directory captures the architectural decisions for the Alien Miniapp SDK. Each ADR records *why* a specific design choice was made, in the team's own vocabulary, at the time it was made. ADRs are append-only history — they do not get rewritten when reality moves on; instead, a new ADR amends or supersedes an older one.

## What is an ADR?

An Architecture Decision Record is a short markdown document describing one architectural decision, the context that forced the decision, the consequences the team accepted, and the alternatives that were considered and rejected. We follow a lightly customised version of [Michael Nygard's template](https://github.com/joelparkerhenderson/architecture-decision-record/blob/main/locales/en/templates/decision-record-template-by-michael-nygard/index.md):

```markdown
# ADR-NNNN: Short title in imperative voice

Status: Proposed | Accepted (YYYY-MM-DD) | Deprecated | Superseded by ADR-XXXX
Amends: ADR-XXXX           (optional — when this ADR refines an earlier one)
Supersedes: ADR-XXXX       (optional — when this ADR fully replaces an earlier one)

## Context
Why we needed to make a decision. What was forcing the issue.

## Decision
What we decided. Imperative voice. Use vocabulary from CONTEXT.md.

## Consequences
The trade-offs we accepted, both good and bad. Anything downstream that
changes because of this decision.

## Alternatives Considered
The other options on the table and why we didn't pick them.
```

## Status convention

- **Proposed** — under discussion; not yet acted on. Few of ours sit here long.
- **Accepted (date)** — the decision is in force. Code, tests, and docs reflect it.
- **Deprecated** — superseded conceptually but not yet replaced by a successor ADR. Use sparingly.
- **Superseded by ADR-XXXX** — fully replaced; the successor is the source of truth.

We do not delete or rewrite Accepted ADRs. If the decision changes, a new ADR records the new decision and adds `Supersedes:` linking back. The older ADR's body stays as a historical artifact; only its status changes.

## Index

| ADR | Title | Status |
| --- | --- | --- |
| [0001](./0001-callable-means-callable.md) | `callable` in React hooks means Callable, not just Method Support | Accepted (2026-05-23) |
| [0002](./0002-bridge-owns-callable-check.md) | Bridge owns the Callable check; React never composes it manually | Accepted (2026-05-23) |
| [0003](./0003-callability-as-discriminated-union.md) | `useCallable` returns a discriminated `Callability` union, not a boolean | Accepted (2026-05-23) |
| [0004](./0004-callability-canonical-in-bridge.md) | `Callability` is canonical in the bridge package, not React-specific | Accepted (2026-05-23) |
| [0005](./0005-strict-track-gates-on-callability.md) | Strict Track (`send`, `request`) gates on `Callability` and throws | Accepted (2026-05-23) |

## Related documents

- [`CONTEXT.md`](../../CONTEXT.md) — the project's domain vocabulary. ADRs use these terms exactly.
- [`docs/prd/`](../prd/) — Product Requirement Documents. ADRs typically follow a PRD's design discussion and pin the resulting decisions.
