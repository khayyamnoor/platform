# 0025 — Playwright happy-path E2E smoke

- **Status**: TODO
- **Type**: AFK
- **Blocked-by**: 0017, 0020, 0022, 0024
- **Slice**: wedge-1-cinematic-director
- **PRD**: issues/0001-prd-wedge-cinematic-director.md

## Goal
A single Playwright test runs the entire wedge slice end-to-end on a Vercel preview deploy and gates merges to main.

## Scope (in)
- `apps/web/e2e/wedge-happy-path.spec.ts`: one test that:
  1. Creates a fresh test user via Clerk's testing API.
  2. Asserts dashboard shows 1000 free credits.
  3. Navigates to /apps/cinematic-ai-video-director.
  4. Fills the prompt form.
  5. Asserts Generate button shows non-zero credit cost.
  6. Clicks Generate (Gemini call uses real test-mode endpoint OR a recorded fixture — pick fixture for CI determinism).
  7. Asserts shot list appears.
  8. Asserts toast appears with credit usage.
  9. Asserts dashboard balance pill decreased.
- A second e2e: subscribe flow happy path (uses Stripe test card).
- A third e2e: BYOK takeover happy path (seeds a wallet at EXHAUSTED state, asserts modal flow works with a test Gemini key).
- Wire into CI as a separate `e2e` job; gate `main` merges.
- Tests run against Vercel Preview deploys via the `VERCEL_PREVIEW_URL` from the PR.

## Scope (out)
- Visual regression suite — out of v1, separate post-launch initiative.
- Mobile viewport tests — out of v1.
- Cross-browser (Firefox/Safari) — Chromium-only in v1.

## Modules touched
| Module | Change |
|--------|--------|
| `apps/web/e2e/` | NEW — 3 spec files |
| `.github/workflows/ci.yml` | + e2e job |
| `playwright.config.ts` | (already exists from 0002) — set baseURL via env |

## Test plan
- The tests themselves ARE the test — failing tests (red) drive implementation in upstream issues, but for THIS issue, success = all three specs green in CI on a fresh preview deploy.
- Use `page.evaluate` and Clerk testing utilities for fast deterministic auth; do not type passwords in the UI.

## Definition of done
- All 3 specs green in CI.
- Failure modes: a broken upstream issue causes CI red; investigate from logs in Vercel + Axiom.
- Specs run in <5 minutes total in CI.
