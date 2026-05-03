# Apps Inventory — 12 Gemini-Powered Apps

> Read-only reference. Source of truth: the actual code in `/Apps/`.
> Last full scan: bootstrap (Phase 0).

## Cross-cutting facts

- **Stack uniformity**: 100% Vite + React 19 + TypeScript + `@google/genai` (versions ^1.29 → ^1.41).
- **Styling**: Tailwind CSS in all 12. `lucide-react` icons in 10/12. `motion` (framer) in 6/12.
- **API key reading**: every app reads `process.env.API_KEY` or `process.env.GEMINI_API_KEY` directly. **This is our chokepoint** — replace at port time with a call to `gemini-gateway`.
- **localStorage history**: 5 apps (ai-clone, hissene, lollys, logo-ideator, stylematchai) — must migrate to per-tenant backend.
- **File uploads**: 6 apps — need unified file service.
- **Video polling**: 6 apps poll Veo operations 10–60s — need job queue / WebSocket.
- **Three template families** detected (likely shared scaffold from AI Studio):
  - **Family A** (6): cinematic-ai-video-director, dreamframe-video-studio, dress-models-ai, logo-ideator, stylematchai, lumina-architect
  - **Family B** (3): hissene-contract, lollys, ai-clone
  - **Family C** (1): intellifeasible (uses n8n webhook, not direct Gemini)

## Wedge candidates (ship first)

| Rank | App | Why |
|------|-----|-----|
| 1 | `cinematic-ai-video-director` | Single API call, structured JSON schema, no uploads, no state. Trivial wrap. |
| 2 | `logo-ideator` | Image upload + 2-stage gen, but stateless. Only need API key gate. |
| 3 | `hissene-contract-classifier` | File upload + analysis. Self-contained with retry logic already built in. |

## Hard ports (last)

| Rank | App | Why |
|------|-----|-----|
| 1 | `ai-clone-avatar` | Multi-modal pipeline (plan → audio → video), API key UI, localStorage state. |
| 2 | `minutes-of-meeting-audio-transcriber` | Audio streaming, 18MB chunking, Word template parsing. |
| 3 | `dress-models-ai` / `lumina-architect` | Image preprocessing + video polling + dual models. |

---

## Per-app catalog

### 1. 4in1-studios-app
- **Purpose**: Multi-modal image analysis, editing, and video gen studio.
- **Stack**: Vite + React 19.2.4 + TS, `@google/genai@^1.41.0`.
- **Models**: `gemini-3-flash-preview`, `gemini-2.5-flash-image`, `veo-3.1-fast-generate-preview`.
- **Surfaces**: `generateContent` (text+image), `generateVideos` + polling.
- **Key**: `process.env.API_KEY`.
- **State**: none.
- **Uploads**: images.
- **Risk**: Moderate (long video ops, async tracking).

### 2. ai-clone-avatar
- **Purpose**: Avatar dialog gen with TTS + video (Saudi AR + EN).
- **Stack**: Vite + React 19.2.4 + TS, `@google/genai@^1.41.0`.
- **Models**: `gemini-3.1-pro-preview`, `gemini-2.5-flash-preview-tts`, `veo-3.1-generate-preview`.
- **Surfaces**: thinking-config text, audio modality, video with reference images.
- **Key**: `window.aistudio.hasSelectedApiKey()` → fallback `process.env.API_KEY`.
- **State**: localStorage `sophie_history`.
- **Risk**: Heavy.

### 3. cinematic-ai-video-director ⭐ wedge
- **Purpose**: Storyboard generator → structured cinematographic JSON.
- **Stack**: Vite + React 19 + TS, `@google/genai@^1.29.0`. Has unused express+dotenv.
- **Models**: `gemini-2.5-pro`.
- **Surfaces**: single `generateContent` with JSON schema.
- **Key**: `process.env.GEMINI_API_KEY` → `import.meta.env.VITE_GEMINI_API_KEY`.
- **State**: none.
- **Risk**: Trivial.

### 4. dreamframe-video-studio
- **Purpose**: Multi-frame video interpolation (start/middle/end frames).
- **Stack**: Vite + React 19 + TS, `@google/genai@^1.29.0`, `better-sqlite3@^12.4.1`.
- **Models**: `veo-3.1-generate-preview`, `veo-3.1-lite-generate-preview`.
- **Surfaces**: `generateVideos` (referenceImages / lastFrame), polling, blob fetch.
- **Key**: `process.env.apiKey` (function arg).
- **Risk**: Moderate-Heavy.

### 5. dress-models-ai
- **Purpose**: E-commerce product photography (image + video).
- **Stack**: Vite + React 19 + TS, `@google/genai@^1.29.0`.
- **Models**: `gemini-2.5-flash-image`, `veo-3.1-fast-generate-preview`.
- **Surfaces**: image gen with product+model refs, video gen.
- **Key**: split — `process.env.GEMINI_API_KEY` (image), `process.env.API_KEY` (video).
- **Risk**: Moderate.

### 6. hissene-contract-classifier ⭐ wedge
- **Purpose**: Legal contract analysis (EN/FR/AR) with risk scoring.
- **Stack**: Vite + React 19.2.4 + TS, `@google/genai@^1.38.0`. Adds: exceljs, jspdf, mammoth, react-markdown.
- **Models**: `gemini-2.5-pro`.
- **Surfaces**: `generateContent` with file data (PDF/Word/text), retry-on-503.
- **Key**: `process.env.API_KEY`.
- **State**: localStorage `hissene_history`.
- **Risk**: Moderate.

### 7. intellifeasible (Sophie)
- **Purpose**: Business feasibility analysis via n8n webhook.
- **Stack**: Vite + React 19.2.3 + TS, `@google/genai` declared but **not used directly**. Recharts for charts.
- **Models**: N/A — delegates to `https://thatboitrippin13.app.n8n.cloud/webhook/...`.
- **Risk**: Moderate. ⚠️ External webhook dependency. Decision: re-implement against `gemini-gateway` directly when porting.

### 8. logo-ideator ⭐ wedge
- **Purpose**: Logo variation gen — analyze input → 10 prompts → 10 images.
- **Stack**: Vite + React 19 + TS, `@google/genai@^1.29.0`.
- **Models**: `gemini-3.1-pro-preview`, `gemini-3.1-flash-image-preview`.
- **Surfaces**: text gen for prompts, parallel image gen.
- **Key**: `window.aistudio.hasSelectedApiKey()` gate → `process.env.API_KEY`/`GEMINI_API_KEY`.
- **State**: localStorage history.
- **Risk**: Moderate.

### 9. lollys-product-shoot-app
- **Purpose**: Product video gen with model poses.
- **Stack**: Vite + React 19.2.4 + TS, `@google/genai@^1.38.0`, uuid.
- **Models**: `veo-3.1-fast-generate-preview`.
- **Surfaces**: `generateVideos` with image + lastFrame, polling.
- **Key**: `process.env.GEMINI_API_KEY` or function arg.
- **State**: localStorage `lollys_products`, `lollys_balance`. Already has a `usageTracker` 👀.
- **Risk**: Moderate-Heavy.

### 10. lumina-architect-ai
- **Purpose**: Interior architecture image edits + cinematic video.
- **Stack**: Vite + React 19.2.3 + TS, `@google/genai@^1.37.0`.
- **Models**: `gemini-3-pro-image-preview`, `veo-3.1-fast-generate-preview`.
- **Surfaces**: image edit (with optional mask), video gen with end-frame.
- **Key**: `process.env.API_KEY`. Headers: `x-goog-api-key`.
- **Risk**: Heavy.

### 11. minutes-of-meeting-audio-transcriber
- **Purpose**: Audio → structured JSON/markdown minutes with custom Word template binding.
- **Stack**: Vite + React 19.2.1 + TS, `@google/genai@^1.31.0`. CDN-loaded marked, pizzip, docxtemplater.
- **Models**: `gemini-3-flash-preview`.
- **Surfaces**: text + audio (`audio/webm`), 18MB chunking.
- **Key**: `process.env.API_KEY`.
- **Risk**: Heavy.

### 12. stylematchai
- **Purpose**: Style transfer — analyze ref image → apply to target.
- **Stack**: Vite + React 19 + TS, `@google/genai@^1.29.0`, `react-image-crop`.
- **Models**: `gemini-3.1-pro-preview`.
- **Surfaces**: 3-stage (analyze style → analyze content → transform).
- **Key**: `process.env.GEMINI_API_KEY`.
- **Risk**: Moderate.

---

## Action items derived from this inventory

1. The `gemini-gateway` module's first job is to be a drop-in replacement for `@google/genai`'s `GoogleGenAI` class — same surface (`generateContent`, `generateVideos`, `operations.getVideosOperation`) but routes through our credit ledger.
2. Veo polling is a cross-cutting concern — design `gemini-gateway.startVideoJob()` to return a job ID and emit progress events the platform can subscribe to.
3. Audio uploads >18MB are a real constraint — `file-service` must support chunked uploads and pass-through to gemini-gateway.
4. The n8n webhook in `intellifeasible` is a liability — port it to direct Gemini in the wrap pass.
5. `lollys` already has a `usageTracker` — read it for hints on what fields the credit ledger needs to capture.
