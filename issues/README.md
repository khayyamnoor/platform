# Issues — The Kanban Board

This directory is the work backlog. Each `.md` file is one independently-grabbable unit of work.

## Layout

```
issues/
  0001-prd-<slice-name>.md      ← PRDs live here briefly, then close
  0002-<short-name>.md          ← AFK or HIL issues
  0003-<short-name>.md
  ...
  closed/                       ← shipped + reviewed issues archived here
    0001-prd-<slice-name>.md
    0002-<short-name>.md
```

## Naming

- Sequential 4-digit zero-padded prefix.
- PRDs use `prd-` after the number: `0007-prd-byok-takeover.md`.
- Other issues: short kebab-case name describing the change.

## Issue file shape

See `.claude/skills/prd-to-issues.md` for the canonical template.

Required frontmatter fields (in the body, not YAML — markdown bullets):

```markdown
- **Status**: TODO | IN-PROGRESS | IN-REVIEW | DONE
- **Type**: AFK | HIL
- **Blocked-by**: <comma-separated issue IDs, or "none">
- **Slice**: <slice ID>
- **PRD**: <path to PRD file, if any>
```

## Status lifecycle

```
TODO ──► IN-PROGRESS ──► IN-REVIEW ──► DONE ──► (archived to closed/)
                ▲                │
                └── changes requested
```

- **TODO**: ready to grab.
- **IN-PROGRESS**: implementer is working on it. Set by `ralph-implementer`.
- **IN-REVIEW**: implementation committed; reviewer queue.
- **DONE**: reviewer approved. Move file to `closed/` immediately.

## Type semantics

- **AFK**: safe for the Ralph loop. No human-only knowledge required.
- **HIL** (human-in-the-loop): requires human judgment — UX decisions, secrets entry, third-party signups, visual QA, decisions among comparable trade-offs.

## Blocking

- An issue can list multiple `Blocked-by` IDs. All must be `Status: DONE` before the issue is grabbable.
- Circular blocks are a configuration error. Surface and fix.

## When to file a new issue

- During a slice, if you find work outside scope → new issue, not scope creep.
- During QA, if you find a defect → new issue, blocked-by the issue that introduced it.
- During review, if the reviewer rejects → new issues for each blocking defect, with the rejected issue blocked-by them.

## When NOT to file an issue

- For obvious one-line fixes that are part of the current issue's scope — just fix it.
- For reformatting / autoformatter output — let the formatter handle it.

## Reading the board

The Ralph loop reads every file in this directory (excluding `closed/`) at start. Keep filenames short and frontmatter consistent.
