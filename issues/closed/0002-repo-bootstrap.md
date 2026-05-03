# 0002 — Repo bootstrap (Turborepo + pnpm + tooling)

- **Status**: DONE
- **Type**: AFK
- **Blocked-by**: none
- **Slice**: wedge-1-cinematic-director
- **PRD**: issues/0001-prd-wedge-cinematic-director.md

## Goal
A buildable, lintable, testable empty monorepo with the package skeletons defined in the PRD's module table.

## Scope (in)
- Root `package.json` with `pnpm@9` workspaces.
- `pnpm-workspace.yaml` listing `apps/*`, `apps/legacy/*`, `packages/*`.
- `turbo.json` with pipelines: `build`, `dev`, `lint`, `test`, `typecheck`.
- Root `tsconfig.base.json` with strict mode.
- Root `biome.json` with project-wide config + override for `apps/legacy/**` (relaxed rules per CLAUDE.md rule 8).
- Root `vitest.config.ts` and `playwright.config.ts`.
- Empty package skeletons (each with `package.json`, `tsconfig.json`, `src/index.ts`, `README.md`):
  `packages/db`, `packages/wallet`, `packages/gemini-gateway`, `packages/billing`, `packages/app-registry`, `packages/ui`, `packages/observability`.
- `apps/web` skeleton (Next.js 15 App Router, empty layout + landing page).
- Root `.env.example` listing all required env vars (commented for now).
- `pnpm install` runs clean.
- `pnpm build`, `pnpm test`, `pnpm typecheck`, `pnpm lint` all run and pass on the empty skeleton.

## Scope (out)
- Any actual feature code in any package — separate issues.
- CI wiring — issue 0003.
- Database connection — issue 0004.

## Modules touched
| Module | Change |
|--------|--------|
| repo root | NEW — Turborepo, pnpm, Biome, Vitest, Playwright config |
| `packages/*` | NEW — empty skeletons |
| `apps/web` | NEW — Next.js skeleton |

## Test plan
- Failing test: `vitest run` with zero tests should report "no tests found" but exit 0; one trivial smoke test in each package (`expect(true).toBe(true)`) confirms the harness works.
- Feedback loops: `pnpm install`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`.

## Definition of done
- All commands above exit 0 on a clean clone.
- `pnpm-lock.yaml` committed.
- README at repo root updated with `pnpm install && pnpm dev` quickstart.
- No TypeScript errors in any package.
