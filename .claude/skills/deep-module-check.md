---
name: deep-module-check
description: Verify a new or modified module fits the deep-module rules. Run before merging a PR that introduces or modifies a module's public surface.
---

# /deep-module-check

A pre-merge gate for module quality.

## Inputs

- The path to a module under review (e.g. `packages/wallet/`)

## Checks

### 1. Public surface size
Count distinct exports from the package's index file. If >5, justify each in writing or merge some into a single facade.

### 2. Implementation depth
LOC of internal files / count of public exports. Want this ratio HIGH — a deep module hides a lot behind few exports. If ratio < 50, the module is shallow.

### 3. Dependency cone
List downward dependencies (what does this module use?) and upward dependents (who uses this?). Flag:
- Circular dependencies
- Modules that depend on >7 others (god-class smell)
- Modules nothing depends on (dead module)

### 4. Test boundary
- Is there a test file at the package level that exercises the public interface?
- Do tests mock >3 internal collaborators? (smell — should test through the interface)

### 5. Type leakage
- Does the public interface expose internal types that callers wouldn't recognize?
- Does it leak vendor types (`@google/genai` types in callers, Stripe types in non-billing modules)?

### 6. Naming
- Does the module name describe what it does, not how (e.g. `gemini-gateway` good, `genai-wrapper-service` bad)?

## Output

Pass/fail per check, with a one-line explanation of failures. End with:

```
RECOMMEND: APPROVE | REQUEST CHANGES | NEEDS DISCUSSION
```

If REQUEST CHANGES, list the minimal fixes that would flip to APPROVE.
If NEEDS DISCUSSION, propose an ADR — link to template in `docs/decisions/README.md`.
