# Grilling: Platform Foundation

- **Date**: 2026-05-02
- **Input**: User vision — multi-app SaaS bundling 12 Gemini AI Studio apps; Coinbase getdesign UI; tiered subscriptions ($30/$60/$90); $5 free trial; $10 platform-key cap before BYOK takeover.
- **Status**: complete

## Q&A

### Q1. Stack — shell framework
**Recommendation**: Next.js 15 (App Router) on Vercel.
**Rationale**: Server actions for Stripe webhooks + wallet transactions in one stack; RSC dashboard; React code from the 12 apps ports nearly line-for-line; Vercel one-command deploy.
**Trade-off**: Vite+Hono on Cloudflare = ~70% cheaper at scale but fights Workers request-size limits on video uploads. Remix/TanStack = smaller ecosystem.
**Answer**: ✅ go with rec — Next.js 15 (App Router) on Vercel.

### Q2. Auth provider
**Recommendation**: Clerk.
**Rationale**: Drop-in UI (signup/login/MFA/reset) themable to Coinbase tokens; native App Router middleware; free tier ≤10K MAU; orgs available later.
**Trade-off**: Supabase Auth is cheaper at scale but you build UI yourself. Auth.js maxes flexibility, costs maintenance. Roll-your-own = never.
**Answer**: ✅ Clerk.

### Q3. Database
**Recommendation**: Postgres on Neon, ORM = Drizzle.
**Rationale**: Credit ledger needs SERIALIZABLE isolation; Postgres handles natively. Neon branching = safe preview migrations, scale-to-zero in dev. Drizzle is transparent about transaction boundaries (Prisma is too magical for ledger code).
**Trade-off**: Supabase Postgres = same engine + bundled auth/storage but bundling is wasted now that auth is Clerk. D1 = weaker isolation, hard no for ledger. PlanetScale = no FKs by default.
**Answer**: ✅ Postgres on Neon.

### Q4. Repo structure
**Recommendation**: Turborepo + pnpm. `/apps/web`, `/apps/legacy/*`, `/packages/{wallet,gemini-gateway,billing,app-registry,ui,db,observability}`.
**Rationale**: Deep-module discipline only holds if each module is its own package — boundaries become enforceable, not advisory. Turbo caches test runs. pnpm's strict node_modules blocks phantom deps.
**Trade-off**: Single Next.js app = ~half-day faster start but module rules become advisory; chokepoint guarantee erodes. Polyrepo = overkill. Nx = more power, way more config.
**Answer**: ✅ Turborepo monorepo.

### Q5. Stripe model
**Recommendation**: Flat subscriptions only in v1, hard cap when credits hit zero. 4 Products (FREE internal, STARTER_30, PRO_60, MAX_90). Webhooks: `checkout.session.completed`, `customer.subscription.updated|deleted`, `invoice.paid`, `invoice.payment_failed`.
**Rationale**: Metered overage = a whole reporting service to build/monitor/reconcile against disputes. Users prefer predictable. The BYOK takeover *is* the overage valve — hit cap → add own key → keep going on user's dime.
**Trade-off**: Metered = more revenue capture, ~1 extra slice. Easy to add post-launch if data justifies. Pure PAYG kills predictable MRR.
**Answer**: ✅ flat subscriptions + hard cap.

### Q6. Credit math
**Recommendation**: 1 credit = $0.005 retail. Raw Gemini cost ≈ $0.0025/credit (~50% margin baked into conversion). $10 BYOK cap = 2000 credits of platform-key consumption = $5 of raw Gemini.
**Plan matrix**:
- FREE: 1000 credits granted (=$5 retail / $2.50 raw)
- $30: 3000 credits (=$15 retail / $7.50 raw, $22.50 plan margin)
- $60: 7000 credits (=$35 retail / $17.50 raw, $42.50 plan margin)
- $90: 12000 credits (=$60 retail / $30 raw, $60 plan margin)
**Rationale**: Margin invisible to users (they see only credits). Headroom for expensive Veo runs. $10 cap = 2000 credits of consumption.
**Trade-off**: Raw-cost-only = zero usage margin, sub-only revenue. Different ratio = re-derive. Action-based = legible but per-app price table to maintain.
**Answer**: ✅ 1 credit = $0.005 retail, 2000-credit BYOK cap.

### Q7. BYOK cap enforcement timing
**Recommendation**: A — pre-call estimate, hard reject if call would cross $10 cap.
**Rationale**: Only A makes the cap real. Gemini surfaces have estimable costs (token estimate, fixed image pricing, Veo per-second). `wallet.authorize(estimate)` is already in our architecture. UX of "add your key" prompt is a conversion moment, not friction.
**Trade-off**: B (warn-and-allow once) is friendlier, costs ~$0.30–$1/user, adds state to wallet machine. C (post-call) saves ~½ day but financially unbounded — hard no.
**Edge case**: estimate undershoots actual → commit actual, next call sees true balance, blocked if overshot. Bounded.
**Answer**: ✅ A — pre-call estimate, hard reject.

### Q8. Per-app cost UX
**Recommendation**: A — cost shown live on the button ("Generate (12 credits)"). Toast on success: "Used 11 credits. 989 remaining."
**Rationale**: Trust (no hidden meters). `gateway.estimate(req)` is reusable from Q7. Educates users on cost-per-app naturally. Frames BYOK takeover as user's choice ("I see why I'd switch").
**Compromise adopted**: show approximate action counts on **marketing page** only ("about 60 images or 8 short videos") — legible for sales without polluting in-app truth.
**Trade-off**: B (silent + history) = sticker shock kills retention. C (per-app quotas) = legible but unmaintainable across 12 apps and breaks BYOK math.
**Answer**: ✅ A + marketing-page approximations.

### Q9. First wedge app
**Recommendation**: `cinematic-ai-video-director`.
**Rationale**: Trivial integration risk (single Gemini text call, no uploads, no polling, no state). Token-priced `gemini-2.5-pro` = clean cost-estimator proof. Visually impressive (good marketing GIF). Forces every layer (auth→wallet→gateway→cost UI→BYOK) without bringing in anything extra (no file-service, no job-queue).
**Why not alternatives**: logo-ideator does 10 parallel image calls (stresses wallet — defer to slice 2); hissene needs file-service (defer to slice 3+); Veo apps need job-queue (their own slice); intellifeasible uses n8n (rewrite, not wrap — port last).
**Answer**: ✅ cinematic-ai-video-director.

### Q10. Port strategy
**Recommendation**: Wrap-first. Move source to `apps/legacy/<id>/`, replace ONLY (a) `process.env.*_API_KEY` reads → `useGateway()`, (b) `new GoogleGenAI(...)` → `useGateway().models.*`. Keep existing JSX/Tailwind. Only the outer shell (header, credit pill, plan badge, sign-out) uses Coinbase getdesign in slice 1. Per-app UI port = its own later slice.
**Rationale**: Slice 1's job is proving infrastructure works (auth/wallet/gateway/BYOK/billing), not proving we can rewrite UIs. Wrap-first ships in 3–5 days; full-port in 2–3 weeks of pure UI work. Family-A apps share a scaffold — one later "port Family A to getdesign" slice replaces 6 apps' UI in one pass.
**Required exception**: `apps/legacy/*` is grandfathered from `CLAUDE.md` UI rules until its per-app port slice runs. Add exception to CLAUDE.md + design-system.md in slice-1 PRD.
**Trade-off**: Full-port = clean from day one but +2 weeks for no infra validation. Iframe = fastest but breaks auth/gateway across boundary, rejected.
**Answer**: ✅ wrap-first.

### Q11. BYOK key handling
**Recommendation**: 4-part opinionated stack:
1. **Validation**: throwaway `gemini-1.5-flash` 1-token call at paste time (~$0.0001, ~500ms). Surface Gemini's verbatim error on failure.
2. **Storage**: Postgres `wallets.byok_key_encrypted bytea`, AES-256-GCM with per-user data keys. Data keys wrapped by platform root key in env var (`BYOK_ENCRYPTION_ROOT_KEY`, 32 bytes base64) for v1. Graduate to KMS in v1.5 (ADR-gated).
3. **Retrieval**: decrypt **only inside gemini-gateway**, **only request-scoped**, **never logged**. Plaintext goes out of scope when call returns. No app code or telemetry ever sees plaintext.
4. **UX**: Settings → API key section (masked `AIzaSy••••••••AbCd`, Replace/Remove). EXHAUSTED-state modal has inline paste field. "Test key" button re-runs validation.
**Rationale**: Test-call kills "key doesn't work" support volume. Per-user data keys limit blast radius. Env-var root key launchable today without KMS setup.
**Trade-off**: Skip validation = support load + churn. Plaintext = negligence. KMS-from-day-one = external dep failure mode at call time, defer.
**Answer**: ✅ all four parts as recommended.

### Q12. Out of scope (kill list)
**Recommendation**: 16 items cut from v1, each with an "earned by data" revisit gate:
1. Team / org accounts (revisit at 100 paying users requesting)
2. Admin dashboard (revisit at >2 hrs/week of manual ops)
3. Refunds UX (manual ops via Stripe + ledger adjustment)
4. Auto top-up / credit packs
5. Annual plans / coupons / referrals
6. Multi-currency
7. App ratings / reviews / favorites
8. Persistent backend generation history (session-only client history OK)
9. Public API / webhooks for users
10. Plan downgrades mid-cycle (next anniversary only)
11. i18n / UI localization (EN only; content gen multilingual is fine)
12. Real-time collab in apps
13. Native mobile apps
14. The 11 non-wedge apps in v1 launch (one slice per app post-launch)
15. The intellifeasible n8n integration (rewrite to direct Gemini when ported)
16. Custom domains / white-label

**Also cut**: marketing site beyond landing+pricing; emails beyond Clerk/Stripe defaults; A/B testing infra.
**Rationale**: Without an explicit kill list at foundation time, slice PRDs scope-creep these in. Earned-by-data prevents feature-cargo-cult.
**Answer**: ✅ all 16 cuts approved + the additional cuts.

---

## Resolved decisions

| # | Decision | Resolution |
|---|----------|-----------|
| 1 | Shell framework | Next.js 15 App Router on Vercel |
| 2 | Auth | Clerk |
| 3 | Database / ORM | Postgres on Neon / Drizzle |
| 4 | Repo layout | Turborepo + pnpm. `apps/web`, `apps/legacy/*`, `packages/{wallet,gemini-gateway,billing,app-registry,ui,db,observability}` |
| 5 | Stripe model | Flat subscriptions, hard cap, 4 plans |
| 6 | Credit math | 1 credit = $0.005 retail, ~50% margin, $10 cap = 2000 credits of platform-key consumption |
| 7 | BYOK enforcement | Pre-call estimate, hard reject if call would cross cap |
| 8 | Cost UX | Live cost on button + post-call toast + marketing-page action approximations |
| 9 | Wedge app | `cinematic-ai-video-director` |
| 10 | Port strategy | Wrap-first; `apps/legacy/*` grandfathered from UI rules until per-app port slice |
| 11 | BYOK key handling | Test-call validation; AES-256-GCM with per-user data keys; env-var root key v1, KMS in v1.5; request-scoped decrypt in gemini-gateway only |
| 12 | Out of scope | 16 items cut, "earned by data" revisit gate |

## Unresolved (deferred to slice PRDs)

- Slice 2 / 3 lineup — decide when slice 1 ships (likely `logo-ideator` then `hissene-contract-classifier`).
- KMS provider for v1.5 (AWS / GCP / CF) — own ADR when migration is triggered.
- Job-queue choice (Inngest vs Trigger.dev) — decide when first Veo app slice is planned.
- Cost-estimator coefficients per Gemini surface — gathered in slice 1's `gemini-gateway` work.
- Email notifications beyond Clerk/Stripe defaults — re-evaluate after launch.

## Reference docs to update

- `docs/tech-stack.md` — lock recommendations as accepted
- `docs/architecture.md` — answer "Open architectural questions" section
- `docs/pricing-model.md` — close "Open questions" with resolutions; lock credit math
- `docs/design-system.md` — add `apps/legacy/*` UI-rule exception
- `CLAUDE.md` — add `apps/legacy/*` exception bullet
