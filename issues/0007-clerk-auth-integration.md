# 0007 — Clerk auth integration

- **Status**: IN-REVIEW
- **Type**: HIL
- **Blocked-by**: 0002, 0006
- **Slice**: wedge-1-cinematic-director
- **PRD**: issues/0001-prd-wedge-cinematic-director.md

## Why HIL

A Clerk account must be created and an application provisioned before keys exist. Once env vars are present, the rest of the integration is AFK.

## Scope (in)
- Create Clerk application (HIL — operator does this; provides `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`).
- `apps/web/middleware.ts` protects every route except `/`, `/sign-in/*`, `/sign-up/*`, `/api/webhooks/*`.
- `apps/web/app/sign-in/[[...sign-in]]/page.tsx` and corresponding sign-up route — themed via Clerk appearance API to match Coinbase tokens (primary color, border radius).
- `apps/web/app/dashboard/page.tsx` placeholder protected page that prints `auth().userId`.
- Sign-in / sign-up emails use Clerk defaults (no custom templates in v1 per out-of-scope).
- Add `.env.example` entries.

## Scope (out)
- Real dashboard content — issue 0008.
- Per-user wallet provisioning on signup — issue 0009.
- Clerk webhook for user.deleted → wallet cleanup — defer to its own follow-up issue once the slice ships.

## Modules touched
| Module | Change |
|--------|--------|
| `apps/web` | NEW Clerk middleware + sign-in/up routes + protected `/dashboard` |
| `.env.example` | + 2 Clerk vars |

## Test plan
- Failing test first: a Playwright test that visits `/dashboard` unauthenticated and asserts redirect to `/sign-in`.
- Component test: `<SignInButton />` themed appearance has Coinbase primary color CSS variable applied.
- Test boundary: `apps/web` middleware + auth pages.

## Definition of done
- `/dashboard` 401-redirects when unauthenticated; renders user ID when signed in.
- Sign-in and sign-up pages match Coinbase visual language (light + dark).
- `pnpm dev` runs locally without env errors.
