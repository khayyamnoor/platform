# 0023 — apps/web: /settings/api-key page

- **Status**: TODO
- **Type**: AFK
- **Blocked-by**: 0011, 0022
- **Slice**: wedge-1-cinematic-director
- **PRD**: issues/0001-prd-wedge-cinematic-director.md

## Goal
A user can manage their saved BYOK key from a dedicated settings page: see it masked, replace it, remove it, or test that it still works.

## Scope (in)
- `apps/web/app/(shell)/settings/page.tsx`: settings index with a single section ("API Key") in v1; nav-ready for future sections.
- `apps/web/app/(shell)/settings/api-key/page.tsx`:
  - **No key on file**: paste field + Test key + Save buttons (same form as the modal).
  - **Key on file**: masked display (`AIzaSy••••••••AbCd`, last 4 chars visible), with three buttons: Test, Replace, Remove.
    - **Test**: re-runs validation, shows result inline.
    - **Replace**: opens a paste field (replaces existing key on save).
    - **Remove**: shows a `Modal` confirming removal; on confirm, calls `wallet.removeByokKey`. State transitions per state machine (likely back to EXHAUSTED if user already crossed cap).
- Sub-nav: avatar dropdown → Settings → "API Key" link.

## Scope (out)
- Other settings sections (profile, notifications) — out of v1.
- Account deletion — out of v1.

## Modules touched
| Module | Change |
|--------|--------|
| `apps/web` | + /settings + /settings/api-key routes + remove-key API route |
| `packages/wallet` | (called: removeByokKey) |
| `packages/ui` | (used: Card, Button, Input, Modal) |

## Test plan
- Failing tests first:
  1. Playwright: user with no key on file sees the add-key form on /settings/api-key.
  2. After adding a valid key, refreshing the page shows masked display + 3 buttons.
  3. Test button reruns validation against Gemini and shows success.
  4. Replace flow: paste new key → Test → Save → display updates to new last-4 chars.
  5. Remove flow: shows confirmation modal → Confirm → display reverts to add-key form → state machine transition correct (EXHAUSTED if user is past cap).
- Test boundary: `apps/web` settings routes + Playwright e2e.

## Definition of done
- All 5 tests green.
- Visual QA: light + dark.
- Plaintext key never sent in any GET request or rendered in any DOM property — verify in DOM snapshot tests.
