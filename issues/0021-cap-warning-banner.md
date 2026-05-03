# 0021 — apps/web: cap warning banner (≥1800 credits consumed)

- **Status**: TODO
- **Type**: AFK
- **Blocked-by**: 0008, 0010
- **Slice**: wedge-1-cinematic-director
- **PRD**: issues/0001-prd-wedge-cinematic-director.md

## Goal
Subscribed users approaching the $10 platform-key cap see a non-blocking banner so they can preempt the takeover by adding their own key.

## Scope (in)
- `apps/web/components/cap-warning-banner.tsx`: shown above the shell content when:
  - `wallet.state === SUBSCRIBED_PLATFORM_KEY`
  - `wallet.lifetime_platform_key_credits_consumed >= 1800` (90% of the 2000-credit cap)
  - `wallet.byok_key_encrypted IS NULL` (user hasn't added a key)
- Copy: *"You're nearing your platform-key trial limit. Add your own Gemini key in Settings to keep generating without interruption. (X / 2000 credits used)"*
- Dismissable per-session (sessionStorage flag); reappears next session if condition still holds.
- Add CTA button "Add my key" → links to `/settings/api-key`.
- Use `Toast` or a custom `Banner` from `packages/ui` (add if missing — call `/add-coinbase-component` skill).

## Scope (out)
- The cap-reached modal — issue 0022.
- Email notifications — out of v1.

## Modules touched
| Module | Change |
|--------|--------|
| `apps/web` | + banner component + integration in shell layout |
| `packages/ui` | possibly + `Banner` primitive |

## Test plan
- Failing tests first:
  1. Wallet at 1799 / 2000 credits consumed → banner not shown.
  2. Wallet at 1800 / 2000 → banner shown.
  3. Wallet at 1900 / 2000 → banner shown.
  4. Wallet has BYOK key on file → banner not shown regardless of consumption.
  5. Wallet state SUBSCRIBED_USER_KEY → banner not shown.
  6. Wallet state TRIAL → banner not shown (the trial uses different cap, $5 not $10).
  7. Dismissing the banner stores sessionStorage flag; banner stays hidden in same tab; new tab still sees it.
- Test boundary: `apps/web` component test + Playwright tab-isolation test.

## Definition of done
- All 7 tests green.
- Visual QA: light + dark renderings of the banner.
- Banner CTA links correctly.
