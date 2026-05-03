---
name: improve-architecture
description: Scan the codebase for shallow modules and propose deepening candidates. Run periodically (between slices), not in the middle of a slice. Outputs a ranked list of refactor candidates as new issues.
---

# /improve-architecture

Find places in the codebase where the module structure is making AI (and humans) work harder than necessary.

## Process

1. **Map the modules.** List every package / top-level dir. For each, note:
   - Number of files
   - LOC
   - Public exports (count)
   - Test boundary (if any)
2. **Identify shallow modules.** A module is shallow when:
   - It exports >5 things from <200 LOC of implementation
   - Multiple small files have circular or near-circular dependencies
   - Tests are wrapped around tiny pieces, requiring lots of mocking
3. **Identify deepening candidates** — clusters of related shallow modules that could be merged behind one interface.
4. **For each candidate, write a proposal**:
   - Current shape (files, exports, dependencies)
   - Proposed shape (single deep module with named interface)
   - Migration path (what changes, what's at risk)
   - ADR draft (1 paragraph)
5. **Output**: a ranked list, with the top 3 turned into AFK issues with `Type: HIL` (refactors need human review before they run AFK).

## Heuristics

- If two services always change together → they probably belong in one module.
- If a module's tests mock 5+ collaborators → the module is too small or its boundary is wrong.
- If the public API has the same shape as the internal implementation → no encapsulation, candidate for deepening.
- If a file is >500 LOC AND has high cyclomatic complexity → split candidate (the opposite move). A long file isn't automatically deep — it might just be tangled.

## Output format

```markdown
# Architecture review — YYYY-MM-DD

## Candidate 1: <module cluster name>

**Current shape**: <bullet list>
**Problem**: <what's painful>
**Proposed**: <new deep module name + interface sketch>
**Migration**: <steps, risks>
**ADR draft**: <one paragraph>

## Candidate 2: ...
```

## When NOT to run this

- Mid-slice. Finish the slice first.
- Right before a release. Refactors during a freeze are forbidden.
- When tests are already failing. Fix the tests before changing structure.
