# 0003 — CI: GitHub Actions (typecheck + test + lint)

- **Status**: DONE
- **Type**: AFK
- **Blocked-by**: 0002
- **Slice**: wedge-1-cinematic-director
- **PRD**: issues/0001-prd-wedge-cinematic-director.md

## Goal
Every PR runs typecheck, test, and lint in parallel; all three must be green to merge.

## Scope (in)
- `.github/workflows/ci.yml` with three parallel jobs: `typecheck`, `test`, `lint`.
- Use `pnpm/action-setup@v3`, `actions/setup-node@v4` with Node 20, `actions/cache` for Turborepo cache.
- Run on `push` to any branch and `pull_request` to `main`.
- A passing CI run as evidence.

## Scope (out)
- Deploy workflow — separate issue, lands when first preview env is needed (likely 0007).
- E2E (Playwright) job — added in issue 0025.

## Modules touched
| Module | Change |
|--------|--------|
| `.github/workflows/ci.yml` | NEW |

## Test plan
- Failing test first: a deliberate type error in a test branch confirms `typecheck` fails CI; revert before merge.
- Feedback loops: push branch → observe CI run.

## Definition of done
- All three jobs green on a clean `main`.
- Failing typecheck / test / lint blocks merge.
- Turborepo cache hit ratio visible in run logs.
