# 0016 — apps/legacy/cinematic-ai-video-director: wrap-first port

- **Status**: IN-REVIEW
- **Type**: AFK
- **Blocked-by**: 0014, 0015
- **Slice**: wedge-1-cinematic-director
- **PRD**: issues/0001-prd-wedge-cinematic-director.md

## Goal
The legacy cinematic director app is moved into the monorepo as a workspace package, with **only its Gemini call swapped** to use `gemini-gateway`. Everything else (Tailwind, JSX, layout, motion) stays as-is.

## Scope (in)
- Create workspace `apps/legacy/cinematic-ai-video-director/`.
- Copy the source files from `Apps/cinematic-ai-video-director/src/` into the new workspace's `src/`.
- Convert `package.json` to a workspace package (private, no own build), depend on workspace `@platform/gemini-gateway`.
- **Two replacements only**:
  1. Remove all reads of `process.env.GEMINI_API_KEY` and `import.meta.env.VITE_GEMINI_API_KEY`. Replace with the `useGateway()` hook (provided by `apps/web` — issue 0017 wires it).
  2. Replace `new GoogleGenAI(...)` and direct `.models.generateContent(...)` calls with `gateway.models.generateContent(...)`.
- The component is exported as a default React component from `apps/legacy/cinematic-ai-video-director/src/App.tsx`.
- All other files (`App.tsx`'s helpers, JSX, Tailwind) are unmodified — including raw `<button>` and inline color values.
- **Do not** touch the original `Apps/cinematic-ai-video-director/` directory.
- Add `"use client"` directive at the top of `App.tsx`.

## Scope (out)
- Replacing the legacy app's UI with Coinbase getdesign — its own slice, deferred indefinitely (per CLAUDE.md rule 8 grandfather).
- Mounting the component into Next.js — issue 0017.
- Cost-on-button UI — issue 0017.
- Toast on success/failure — issue 0017.

## Modules touched
| Module | Change |
|--------|--------|
| `apps/legacy/cinematic-ai-video-director` | NEW workspace, ported source |

## Test plan
- Failing test first: a unit test that imports the default export and renders it with a mocked `useGateway` hook (via React context); asserts the form renders without throwing.
- Test boundary: the legacy app workspace, only — does not depend on `apps/web` or real DB.

## Definition of done
- Component imports cleanly into a test harness.
- No `@google/genai` or `process.env.*_API_KEY` reads anywhere in the package.
- Lint passes with the `apps/legacy/**` Biome override (UI rules grandfathered).
- Original `Apps/cinematic-ai-video-director/` is unmodified (verify by `git diff` showing no changes there).
