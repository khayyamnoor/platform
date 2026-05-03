# Platform

Multi-app SaaS that bundles 12 Gemini-powered AI Studio apps under shared auth, a credit ledger, and a Coinbase-themed UI.

**Status**: bootstrapping. No product code yet — the reference layer in `docs/` and `.claude/` is being scaffolded so future sessions work smarter, not dumber.

## Start here

1. `docs/workflow.md` — how we work with AI (the Pocock playbook).
2. `docs/architecture.md` — module map and interfaces.
3. `docs/pricing-model.md` — credit ledger, plans, BYOK takeover.
4. `docs/apps-inventory.md` — what each of the 12 legacy apps does and how it'll integrate.

## Operating rules

See `CLAUDE.md`. Short version: TDD always, single Gemini chokepoint, Coinbase getdesign UI only, no code without an issue.

## Quickstart

```bash
corepack enable && corepack prepare pnpm@9 --activate   # one-time
pnpm install
pnpm dev                                                  # apps/web on :3000
pnpm test                                                 # all package tests
pnpm typecheck && pnpm lint && pnpm build                 # CI parity
```

Required env vars are listed in `.env.example`. Copy to `.env.local` in `apps/web/` and fill as you progress through the slice issues.

## Layout

```
docs/             reference material (read this first)
.claude/          skills (invoked via /skill-name)
issues/           Kanban board of work
scripts/          ralph-once.sh, ralph-loop.sh
apps/web/         Next.js 15 App Router shell
apps/legacy/      ported legacy apps (grandfathered from UI rules)
packages/         deep modules: db, wallet, gemini-gateway, billing, app-registry, ui, observability
Apps/             the 12 legacy AI Studio apps (read-only until ported)
```
