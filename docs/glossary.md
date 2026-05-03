# Glossary

Canonical names. If you find a synonym in code, fix it.

| Term | Definition |
|------|-----------|
| **Credit** | Atomic unit of platform usage. 1 credit = $0.005 of underlying Gemini cost (proposed; confirm in grill). |
| **Wallet** | Per-user credit ledger + BYOK state. Owns the source of truth for what a user can spend. |
| **Hold / Authorization Token** | A short-lived reservation against a wallet, taken before a Gemini call. Committed (with actual cost) or rolled back. |
| **Ledger Entry** | An append-only row recording a credit movement. Never updated, never deleted. |
| **App Run** | One end-to-end invocation of one of the 12 apps. May spawn multiple Gemini calls. Has a single user-visible status. |
| **Plan** | Subscription tier: `FREE`, `STARTER_30`, `PRO_60`, `MAX_90`. |
| **BYOK** | Bring Your Own Key — user's personal Gemini API key, stored encrypted, used after platform-key cap is reached. |
| **Wallet State** | One of `TRIAL`, `SUBSCRIBED_PLATFORM_KEY`, `SUBSCRIBED_USER_KEY`, `EXHAUSTED`. Drives which key `gemini-gateway` uses. |
| **Platform Key** | The Gemini API key owned by the platform operator. Used during TRIAL and `SUBSCRIBED_PLATFORM_KEY`. |
| **The $10 Cap** | The lifetime amount of platform-key Gemini cost a user can incur before BYOK is required. Not a per-month limit. |
| **gemini-gateway** | The single deep module through which **all** Gemini calls flow. The chokepoint. |
| **app-shell** | The host application that mounts the 12 app modules at routes and provides shared hooks (`useSession`, `useGateway`, `useWallet`). |
| **Gateway Client** | The object returned by `gemini-gateway.clientForRequest()`. Mirrors `@google/genai`'s surface so app-side migration is mechanical. |
| **Issue** | A markdown file in `/issues/` describing an independently-grabbable unit of work. |
| **Slice** | A vertical traceable bullet — one issue (or small group) that crosses every layer needed to deliver visible behavior. |
| **AFK Issue** | An issue tagged `type: AFK` — safe for the Ralph loop to implement without human-in-the-loop. |
| **HIL Issue** | `type: HIL` — needs human attention (UX decisions, secrets, etc). |
| **Ralph Loop** | The implementer agent loop that picks the next unblocked AFK issue, writes a failing test, implements, runs feedback loops, commits. |
| **PRD** | Product Requirements Document. Destination doc for a single slice. Lives briefly in `/issues/`, closed after slice ships. |
| **ADR** | Architecture Decision Record. Permanent log of a load-bearing decision in `docs/decisions/`. |
| **Design Concept** | The shared mental model between human and AI. Built via grilling. The thing PRDs summarize. |
| **Smart Zone / Dumb Zone** | Token-budget regions of an LLM session. Smart ≈ first 100K. Plan to clear before crossing into dumb. |
| **Push vs Pull Context** | Push = always loaded (CLAUDE.md). Pull = loaded on demand (skills, docs). Prefer pull. |
