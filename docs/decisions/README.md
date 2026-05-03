# Architecture Decision Records

ADRs document load-bearing decisions: choices that, if reversed, would force significant rework.

## Format

One file per decision. Filename: `NNNN-kebab-case-title.md`, where `NNNN` is a zero-padded sequential integer.

```markdown
# 0001 — Title

- **Status**: Proposed | Accepted | Superseded by 00NN | Deprecated
- **Date**: YYYY-MM-DD
- **Deciders**: names

## Context
What's the situation that forces a decision?

## Decision
What did we choose?

## Consequences
What becomes easier? What becomes harder? What's now off the table?

## Alternatives considered
What did we reject, and why?
```

## When to write one

Write an ADR when any of these are true:
- A new module crosses 300 LOC.
- A choice is hard to reverse (DB engine, hosting platform, billing provider).
- A decision contradicts something in `docs/`.
- A new dependency is added to a deep module.
- Stack-level: framework, language, package manager.

## When NOT to write one

- "We renamed `foo` to `bar`." (commit message is enough)
- "We added a button." (change is its own documentation)
- "We picked `lucide-react` for icons." (recoverable from `package.json`)

## Index

> Append entries here as ADRs are written.

- _none yet_
