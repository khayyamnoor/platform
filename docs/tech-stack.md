# Tech Stack

> Status: **LOCKED** by `docs/decisions/0001-platform-foundation-grill.md`.
> Changes require an ADR.

## Constraints (non-negotiable)

- TypeScript everywhere.
- Coinbase getdesign UI primitives (see `design-system.md`).
- Single Gemini chokepoint: `gemini-gateway` module.
- Atomic credit ledger (`wallet`) — needs a database with strong row-level locking.
- 6 of 12 apps need video polling and large file handling — infra must support long-running async ops.

## Locked stack

| Layer | Choice | Notes |
|------|--------|-------|
| Monorepo | **Turborepo + pnpm** | `apps/web`, `apps/legacy/*`, `packages/{wallet, gemini-gateway, billing, app-registry, ui, db, observability}` |
| Shell | **Next.js 15 (App Router)** on **Vercel** | Server actions for Stripe webhooks + wallet txns |
| Auth | **Clerk** | Themed to Coinbase tokens; orgs deferred |
| DB | **Postgres on Neon** | Branching for preview deploys; SERIALIZABLE for ledger |
| ORM | **Drizzle** | Transparent transaction boundaries (vs Prisma) |
| Billing | **Stripe** | Flat subscriptions only in v1, hard cap, no metered overage |
| File storage | **Cloudflare R2** (S3 API) | Lazy-add — only when first slice needs it (likely slice 2 with logo-ideator output) |
| Job queue | **DEFERRED — own ADR when first Veo slice is planned** | Probably Inngest. Not in v1 wedge. |
| Hosting | **Vercel** (shell) + **Cloudflare R2** (storage) | Vercel-managed Postgres connection via Neon driver |
| Observability | **Axiom** | Cheap structured logs at startup volume |
| Testing | **Vitest + Playwright** | Vitest for unit/integration, Playwright for the smoke happy-path |
| Lint/format | **Biome** | One tool, fast |
| Encryption | **AES-256-GCM** with per-user data keys, root key in env (v1) → KMS (v1.5, ADR-gated) | For BYOK key storage only |

## What's NOT in scope (kill in grill)

- Microservices.
- Kubernetes / self-hosting.
- Custom auth.
- Self-hosted Postgres.
- Real-time collaboration (multi-user editing in apps).

## App migration strategy (proposed)

The 12 apps stay in `Apps/` until ported. v1 ships with **one app integrated** (likely `cinematic-ai-video-director`). New apps are ported one-at-a-time, each as its own PRD + Kanban slice.

**Port checklist per app**:
1. Move source into `apps/<id>/` workspace.
2. Replace all `process.env.*_API_KEY` reads with `useGateway()`.
3. Replace all `@google/genai` imports with `gemini-gateway` calls.
4. Replace localStorage state with backend equivalent (or document why local-only is OK).
5. Replace raw HTML/CSS with Coinbase getdesign components.
6. Add at least one integration test that runs the happy path against a mocked gateway.
7. Add an entry to `app-registry`.
8. Feature-flag the route until visual QA passes.
