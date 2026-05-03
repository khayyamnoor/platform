# Architecture

> Status legend: **PROPOSED** (in this doc only) · **IN-PROGRESS** (issues exist) · **SHIPPED** (in main, has tests).
> Stack choices locked by `docs/decisions/0001-platform-foundation-grill.md`.
> Module map below = **PROPOSED**; modules become **IN-PROGRESS** when their first issue is filed.

## Design philosophy

- **Deep modules**: small public interfaces, large hidden implementations. Files >300 LOC require an ADR.
- **One chokepoint per cross-cutting concern**: every Gemini call goes through `gemini-gateway`; every credit mutation goes through `wallet`; every Stripe call goes through `billing`. No app code talks to these vendors directly.
- **App modules are gray-boxed**: from the outside, each of the 12 apps is a single React route + a single `gemini-gateway` consumer. The 12 internal implementations are isolated and replaceable.

## Module map

```
                            ┌───────────────┐
                            │   app-shell   │  (Next/Vite shell, routing, layout, Coinbase UI)
                            └──────┬────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              ▼                    ▼                    ▼
      ┌──────────────┐     ┌───────────────┐     ┌──────────────┐
      │     auth     │     │  app-registry │     │   billing    │  (Stripe)
      └──────┬───────┘     └───────┬───────┘     └──────┬───────┘
             │                     │                    │
             ▼                     ▼                    │
      ┌──────────────────────────────────────┐          │
      │              wallet                  │◄─────────┘
      │  (credit ledger + BYOK state machine)│
      └──────────────────┬───────────────────┘
                         │ debit/check
                         ▼
                ┌────────────────────┐
                │   gemini-gateway   │  ← THE CHOKEPOINT
                │ (BYOK-aware proxy) │
                └────────┬───────────┘
                         │
       ┌─────────────────┼─────────────────┬──────────┐
       ▼                 ▼                 ▼          ▼
  [12 app modules — gray boxes — one per ported app]
```

Supporting modules:

```
  file-service     ← unified upload/download (S3/R2). All apps with file uploads use this.
  job-queue        ← async ops (Veo polling, audio chunking). Emits progress events.
  observability    ← structured logs, request tracing. Single helper, used everywhere.
```

## Module interfaces (TypeScript signatures only)

> These are **proposed interfaces**, not implementations. The grill will refine them.

### `auth`

```ts
type Session = { userId: string; email: string; plan: Plan };
function getSession(): Promise<Session | null>;
function requireSession(): Promise<Session>; // throws if unauthenticated
```

Test boundary: integration — sign-up → sign-in → middleware-guarded route.

### `wallet`

```ts
type CreditBalance = { creditsRemaining: number; usdEquivalent: number; state: WalletState };
type WalletState = "TRIAL" | "SUBSCRIBED_PLATFORM_KEY" | "SUBSCRIBED_USER_KEY" | "EXHAUSTED";

function getBalance(userId: string): Promise<CreditBalance>;
function authorize(userId: string, costEstimateCredits: number): Promise<AuthToken>;
function commit(token: AuthToken, actualCostCredits: number): Promise<void>;
function rollback(token: AuthToken): Promise<void>;
function refresh(userId: string): Promise<CreditBalance>; // for billing webhook
```

Test boundary: deep — full ledger with concurrent writes, BYOK transitions, idempotency on retries.

### `gemini-gateway` ⭐ critical

```ts
// Same shape as @google/genai's surface so app-side migration is mechanical
type GatewayClient = {
  models: {
    generateContent(req: GenerateContentReq): Promise<GenerateContentRes>;
    generateImages(req: GenerateImagesReq): Promise<GenerateImagesRes>;
  };
  videos: {
    start(req: GenerateVideosReq): Promise<VideoJobId>;
    status(id: VideoJobId): Promise<VideoJobStatus>;
  };
};

function clientForRequest(ctx: RequestContext): Promise<GatewayClient>;
```

Internally:
1. Estimate cost in credits.
2. `wallet.authorize` → get auth token (or throw `INSUFFICIENT_CREDITS`).
3. Decide which Gemini key to use (platform vs user-BYOK) based on wallet state.
4. Make the call.
5. `wallet.commit(actualCost)` on success, `wallet.rollback` on failure.

Test boundary: deep — mock Gemini at the HTTP layer, real wallet, assert ledger invariants.

### `billing`

```ts
type Plan = "FREE" | "STARTER_30" | "PRO_60" | "MAX_90";
function createCheckoutSession(userId: string, plan: Plan): Promise<CheckoutUrl>;
function handleWebhook(event: StripeEvent): Promise<void>; // updates wallet via wallet.refresh
```

Test boundary: integration — webhook signatures, idempotency keys, plan upgrades/downgrades.

### `app-registry`

```ts
type AppManifest = {
  id: string;            // "logo-ideator"
  name: string;
  category: string;
  costPerRunCredits: number; // initial estimate; gemini-gateway computes actual
  route: string;
  status: "BETA" | "STABLE" | "DEPRECATED";
};
function listApps(): AppManifest[];
function getApp(id: string): AppManifest | null;
```

### `app-shell`

The Next/Vite root that mounts each app at `/apps/<id>` and provides `useGateway()`, `useWallet()`, `useSession()` hooks. Coinbase getdesign components only.

### App modules (12 of them)

Each is a single subdir under `apps/<id>/` with:
- `route.tsx` — the page (mounted by app-shell)
- `client.ts` — calls `useGateway()` to talk to Gemini
- `*.test.ts` — at least one integration test that runs the happy path with a mocked gateway

No app imports `@google/genai` directly. No app reads `process.env.*_API_KEY`. Violations are reverted.

## Data model (proposed, refined in grill)

```
users              ← managed by auth provider (Clerk/Supabase/etc)
wallets            (user_id, plan, credits_remaining, state, byok_key_encrypted, ...)
ledger_entries     (id, user_id, app_id, credits_delta, reason, ref, created_at)
                   — append-only, no updates
auth_tokens        (id, user_id, hold_amount, expires_at, state)
                   — short-lived authorization holds
app_runs           (id, user_id, app_id, gateway_request_id, status, ...)
billing_events     (stripe_event_id, processed_at, ...)  — idempotency table
```

## Resolved (from grill 0001)

1. **Monorepo**: Turborepo + pnpm. One package per deep module.
2. **Shell**: Next.js 15 App Router on Vercel.
3. **DB**: Postgres on Neon, Drizzle ORM. SERIALIZABLE isolation for ledger writes.
4. **Legacy app integration**: route-mount inside Next.js shell as client-side React islands. No iframes.
5. **Tailwind in legacy apps**: kept as-is at port time; per-app UI port to Coinbase getdesign is its own later slice. `apps/legacy/*` is grandfathered from CLAUDE.md UI rules until that slice runs.
6. **BYOK key storage**: `wallets.byok_key_encrypted bytea` — AES-256-GCM, per-user data keys, root key in env (v1), KMS in v1.5.
7. **BYOK enforcement**: pre-call estimate via `gemini-gateway.estimate(req)`, hard reject if call would cross $10 cap (= 2000 credits of platform-key consumption).
8. **Cost UI**: live cost on every "Generate" button via `useGateway().estimate()`, post-call toast with actual.

## Still open (deferred to slice PRDs)

- Job-queue choice (Inngest vs Trigger.dev) — decide when first Veo app is slated.
- File-service interface — defined when slice 2 (logo-ideator, image output) is planned.
- KMS provider for v1.5 BYOK root key — own ADR.
