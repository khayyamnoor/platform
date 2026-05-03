# PRD: Wedge Slice — Cinematic Director

- **Slice ID**: `wedge-1-cinematic-director`
- **Status**: DRAFT — awaiting your approval before `/prd-to-issues`
- **Created**: 2026-05-02
- **Source grill**: `docs/decisions/0001-platform-foundation-grill.md`

## Problem statement

We have 12 standalone Gemini apps and a vision for a subscription platform that bundles them with shared auth, a credit ledger, BYOK takeover, and a Coinbase-themed UI. We have **zero** of the platform infrastructure built. Until one app runs end-to-end through the full stack — auth, wallet, gateway, BYOK, billing, UI — we don't actually know whether the architecture works.

## Solution summary

Ship **one** app fully integrated through every layer. Picked: `cinematic-ai-video-director` — text-only, single Gemini call, no media infra needed (per grill Q9). This is one vertical traceable bullet that simultaneously builds and validates: signup, plan subscription, credit ledger, gemini-gateway chokepoint, pre-call cost estimate, post-call commit/rollback, BYOK takeover at the $10 cap, and Coinbase-themed shell UI. Wrap-first port (per grill Q10) — minimal changes to the legacy app's internals.

After this slice ships, the remaining 11 apps each become their own follow-up slice, and we have data to decide which one comes next.

## Modules affected

| Module | Change | Notes |
|--------|--------|-------|
| `packages/db` | NEW | Drizzle schema + migrations runner. Tables: `wallets`, `ledger_entries`, `auth_tokens`, `app_runs`, `billing_events`. |
| `packages/wallet` | NEW | Public surface: `getBalance`, `authorize`, `commit`, `rollback`, `refresh`, `addByokKey`, `removeByokKey`, `getWalletState`. Internal: encryption, BYOK state machine. |
| `packages/gemini-gateway` | NEW | Public surface: `estimate(req)`, `clientForRequest(ctx)`. Wraps `@google/genai` for `models.generateContent` only in v1. Integrates wallet for authorize→call→commit/rollback. Routes platform-key vs BYOK based on wallet state. |
| `packages/billing` | NEW | Public surface: `createCheckoutSession`, `handleWebhook`, `cancelSubscription`. Stripe products: STARTER_30, PRO_60, MAX_90. |
| `packages/app-registry` | NEW | Static manifest array. v1 contains exactly one entry: cinematic-ai-video-director. |
| `packages/ui` | NEW | Coinbase getdesign primitives via `npx getdesign@latest add coinbase`. v1 components: `Button`, `Input`, `Textarea`, `Card`, `Badge`, `Modal`, `Toast`, `DropdownMenu`, `Avatar`, `Progress`, `Tooltip`, `Skeleton`. |
| `packages/observability` | NEW | One helper: `logger` with structured fields. Axiom transport. |
| `apps/web` | NEW | Next.js 15 App Router. Routes: `/`, `/sign-in`, `/sign-up`, `/dashboard`, `/apps/cinematic-ai-video-director`, `/billing`, `/settings`, `/settings/api-key`. Clerk middleware. Stripe webhook route at `/api/webhooks/stripe`. |
| `apps/legacy/cinematic-ai-video-director` | NEW | Wrap-first port from `Apps/cinematic-ai-video-director`. Two changes only: (1) replace `process.env.GEMINI_API_KEY` reads with `useGateway()` hook, (2) replace `new GoogleGenAI(...)` with `useGateway().models.generateContent(...)`. Tailwind + JSX kept as-is (grandfathered per CLAUDE.md rule 8). |
| Repo root | NEW | Turborepo config, pnpm workspace, Biome config, Vitest config, Playwright config, GitHub Actions CI. |

## User stories

1. **Sign up.** As a visitor, I can sign up with email or Google OAuth via Clerk and land on `/dashboard` with my plan badge showing **FREE** and credit balance showing **1000**.
2. **See available apps.** As a logged-in user, I see the cinematic director on the dashboard with its name, description, and "About 60 generations on STARTER_30" approximation.
3. **Open the app.** As a user, I can navigate to `/apps/cinematic-ai-video-director` and see the legacy UI rendered inside the Coinbase-themed shell (header, sidebar, credit pill).
4. **See live cost.** As a user filling out the cinematic director's form, the **Generate** button shows the credit cost live (e.g. *"Generate (12 credits)"*), updating as I edit my prompt.
5. **Generate within budget.** As a user with sufficient credits, clicking Generate produces the structured shot list, my balance decrements, and a toast confirms *"Used 11 credits. 989 remaining."*
6. **Generate when out of credits.** As a user with insufficient credits, Generate is disabled with a tooltip *"Out of credits. Upgrade your plan or add your own Gemini key."*
7. **Subscribe.** As a free-tier user, I can click "Upgrade" → land on a pricing page with three plans → click STARTER_30 / PRO_60 / MAX_90 → complete Stripe Checkout → return to the dashboard with my plan badge updated and my credit balance replenished.
8. **See cap warning.** As a subscribed user with platform-key spend approaching the $10 cap (≥1800 credits consumed), I see a non-blocking banner *"You're nearing your platform-key trial limit. Add your own Gemini key in Settings to keep generating without interruption."*
9. **Hit the cap.** As a subscribed user who's used 2000 credits of platform-key consumption (per grill Q7 = $10 retail), my next Generate click is blocked by a modal: *"Add your Gemini API key to continue"* with an inline paste field, "Test key" button, and "Save & Continue" button.
10. **Add a BYOK key.** As a user with a personal Gemini key, pasting it triggers a validation call (1-token `gemini-1.5-flash`); on success my key is stored encrypted and my next generation runs against my key (no credit debit, my Gemini bill).
11. **Manage the key.** As a user, I can navigate to `/settings/api-key` and see my saved key masked (`AIzaSy••••••••AbCd`), with **Replace**, **Remove**, and **Test** buttons.
12. **Sign out.** As any user, I can sign out from the avatar dropdown in the header.

## Out of scope

- **Other apps.** Only cinematic-ai-video-director ships in v1.
- **Image / video / audio gen.** No Veo, no Imagen, no TTS in slice 1. Keeps gateway lean.
- **File uploads.** No `file-service` module yet. The wedge app has no uploads.
- **Job queue / async ops.** All gateway calls are synchronous in v1. No Inngest / Trigger.dev.
- **Plan changes mid-cycle.** No upgrade/downgrade UI in slice 1. User on STARTER_30 stays on STARTER_30 unless they cancel and re-subscribe (handled via Stripe customer portal — link only, no in-app UI).
- **Cancellation in-app.** Linked to Stripe billing portal — no custom cancel flow.
- **Auto top-up / credit packs.** Cut.
- **Refund self-serve.** Manual ops only.
- **Email beyond Clerk/Stripe defaults.** No "you're at 80%" emails.
- **Coupons / annual / referrals / multi-currency.** All cut.
- **Admin dashboard.** I use Postgres + Stripe direct.
- **Generation history beyond per-session client state.** No persistent backend history.
- **Public API.** Cut.
- **Mobile app.** Responsive web only.
- **Visual rewrite of the cinematic director's internal UI.** Grandfathered. Belongs to a later "port Family A to getdesign" slice.

## Implementation decisions (from grill 0001 — do not re-litigate)

- Stack: Next.js 15 App Router on Vercel · Clerk · Postgres on Neon · Drizzle · Stripe (flat subs only) · Cloudflare R2 (lazy-add — not needed in this slice) · Axiom · Vitest · Playwright · Biome · Turborepo + pnpm.
- Credit math: 1 credit = $0.005 retail; raw Gemini cost ≈ $0.0025/credit; $10 BYOK cap = 2000 credits of platform-key consumption.
- BYOK enforcement timing: pre-call estimate, hard reject if call would cross cap.
- Cost UX: live cost on every Generate button via `gateway.estimate(req)`; toast post-call with actual.
- BYOK key handling: paste-time test-call validation; AES-256-GCM with per-user data keys; root key in env (`BYOK_ENCRYPTION_ROOT_KEY`); request-scoped decrypt only inside `gemini-gateway`; never logged.
- Port strategy: wrap-first; `apps/legacy/*` grandfathered from CLAUDE.md UI rules (rule 8) until per-app port slice runs.

## New decisions made in this PRD (called out for review)

These were not in the grill but are needed for this slice. I'm making the calls; flag any you want to overturn.

| # | Decision | Rationale |
|---|----------|-----------|
| A | **Stripe in test mode for v1 launch.** Real keys live behind a feature flag. | Avoids payment-processing review until product is validated. Switch to live mode is one ENV var + one Stripe Dashboard action — own ADR at switch time. |
| B | **Cost estimator for `gemini-2.5-pro` text gen** = `(input_tokens × $0.00125 / 1000 + output_tokens × $0.005 / 1000) × 2 / $0.005` credits, rounded up. Output tokens estimated as `input_tokens × 1.5` for the cinematic director's structured-output use case. | Conservative overestimate ensures we never under-debit. Refined in slice 1 telemetry. |
| C | **`auth_tokens.expires_at` defaults to 30s** for sync calls, no extension logic in v1 (no Veo). | Sync calls return in <30s or they error. Job-queue extension logic lands with the first Veo slice. |
| D | **Encryption root key** = a generated 32-byte base64 string in `.env`. Document in `docs/decisions/0002-byok-encryption-v1.md` (ADR-worthy). | Per grill Q11 — KMS migration is v1.5. |
| E | **Stripe webhook idempotency** = `billing_events` table keyed on Stripe's `event.id`. | Standard pattern; protects against duplicate webhook delivery. |
| F | **Per-call timeouts** = 30s for `models.generateContent`. | Cinematic-2.5-pro returns in 5–15s. 30s = generous safety margin. |
| G | **Retry policy** = no automatic retries in `gemini-gateway` v1. Surface Gemini errors verbatim to the user with a "Try again" button. | Adding retries here without idempotency analysis can double-charge users. Defer to its own ADR. |
| H | **TRIAL → SUBSCRIBED transition**: triggered by `customer.subscription.created` webhook. Wallet state moves immediately; granted credits added on `invoice.paid` webhook (not before). | Keeps the ledger truthful — credits exist only after payment confirmed. |
| I | **`apps/legacy/cinematic-ai-video-director`** is mounted as a **client component island** under `app/apps/cinematic-ai-video-director/page.tsx`. The legacy code uses `"use client"` at its entry. | Cleanest way to host an existing React 19 client app inside App Router without a rewrite. |
| J | **CI**: GitHub Actions, three jobs — typecheck, test, lint. Block merge on red. | Standard. |

## Test boundaries

| Module | Boundary | Tests required for slice DoD |
|--------|----------|-------------------------------|
| `wallet` | The package's public functions, with a real Postgres test DB. | (1) authorize → commit happy path; (2) authorize → rollback; (3) concurrent authorize from same user respects balance; (4) BYOK state transitions: TRIAL → SUBSCRIBED_PLATFORM_KEY → EXHAUSTED → SUBSCRIBED_USER_KEY; (5) hold expiry; (6) idempotency on retried authorize calls. |
| `gemini-gateway` | The package's public functions, with `@google/genai` mocked at HTTP layer (msw or undici interceptor). Real wallet + DB. | (1) successful call debits wallet; (2) failed call rolls back; (3) call routes to platform key in `SUBSCRIBED_PLATFORM_KEY` state; (4) call routes to user key (decrypted) in `SUBSCRIBED_USER_KEY` state; (5) `INSUFFICIENT_CREDITS` thrown when estimate would cross zero; (6) `CAP_REACHED` thrown when estimate would cross $10 cap. |
| `billing` | Webhook handler with replayed Stripe fixtures. | (1) `checkout.session.completed` creates wallet plan link; (2) `invoice.paid` grants credits; (3) `customer.subscription.deleted` reverts to FREE; (4) duplicate webhook (same `event.id`) is no-op. |
| `apps/legacy/cinematic-ai-video-director` | Component test against mocked `useGateway()`. | (1) Generate button shows estimate; (2) Generate disabled at zero credits; (3) success path renders shot list; (4) error path shows verbatim error. |
| End-to-end (Playwright) | One happy path against a fully-deployed preview env. | Sign up → see 1000 credits → open cinematic director → fill prompt → see live cost → Generate → see shot list → balance updates. (BYOK and subscribe paths get separate Playwright tests but only happy-path smoke is required for DoD.) |

## Definition of done

- All 12 user stories demonstrable in browser on a Vercel preview deploy.
- All test boundaries above passing in CI on `main`.
- `pnpm test` (Vitest) green; `pnpm typecheck` green; `pnpm lint` (Biome) green.
- Playwright happy-path smoke test green in CI.
- ADR `0002-byok-encryption-v1.md` filed.
- ADR `0003-stripe-test-mode-v1.md` filed.
- Visual QA pass on light + dark for: dashboard, cinematic director route, settings, billing, signup/login, BYOK modal, plan-cap warning banner.
- Reviewer agent (`/ralph-reviewer`) approval on every shipped issue.
- No `@google/genai` import outside `packages/gemini-gateway`.
- No raw `<button>` / `<input>` in `apps/web/**` or `packages/**`. (Grandfathered in `apps/legacy/**`.)
- No `process.env.*_API_KEY` reads outside `packages/gemini-gateway` and `packages/db` config bootstrap.
- `CLAUDE.md` rule 8 lint scope wired up (Biome override for `apps/legacy/**`).

## Approval

Reply **"approve PRD"** to trigger `/prd-to-issues`, which will produce ~25–30 vertical-slice issue files in `/issues/`, ordered by blocking relationships. Reply with edits if you want any of the J new decisions reversed.
