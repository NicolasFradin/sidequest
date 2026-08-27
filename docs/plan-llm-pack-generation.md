# Development Plan — LLM Pack Generation (remote API key, Claude Code/Codex CLI bridge, local Ollama)

**Local repo**: `/Users/nicolas/perso/sidequest`
**Status**: implemented 2026-08-27 (all sprints below) — see the sprint log in section 5 for what was actually verified vs. built-but-unverified. Fleshes out the `V1 | Exercise generation via the Claude API, personalized programs` row of the roadmap in [`plan-mvp-sidequest.md`](plan-mvp-sidequest.md) section 6.

## 1. Vision

Today the only way to get a pack into SideQuest is the bundled ones or a hand-written/hand-exported JSON file via `dashboard:import-plan`. This plan adds a **"Generate" button** next to **"Import"** in the Packs gallery: the user describes what they want ("a 5-minute posture pack for people who sit all day"), an LLM produces a pack, validated through the exact same sanitizer as manual import, and it lands in the gallery like any other pack.

Three ways to reach an LLM, all supported from v1 (see § “Locked-in decisions”):
1. **Remote API key** — user's own Anthropic or OpenAI API key, entered in Settings.
2. **Local CLI bridge** — if `claude` (Claude Code) or `codex` is already installed and authenticated on the machine, SideQuest shells out to it non-interactively and reuses the user's existing subscription, with no key ever entering the app.
3. **Local model via Ollama** — fully offline, no network egress, no account of any kind.

This is the first feature in the app that can make an outbound network call. Today's threat model is "100% local" (SQLite, local hook server on 127.0.0.1 only); that changes here, deliberately, and is called out explicitly in § 3.5.

## 2. Locked-in decisions

Decided with the user 2026-08-27 (see conversation), overriding what would otherwise be open questions:

- **No OAuth "sign in with Anthropic/OpenAI".** Neither provider exposes a public consumer OAuth flow for a third-party desktop app to connect a personal claude.ai/chatgpt.com account — this was ruled out as infeasible, not deprioritized. "Connect your account" instead means: **shell out to the CLI the user already has installed and authenticated** (`claude -p ...`, `codex exec ...`), the same pattern this app already uses for Claude Code hooks (`claude-hook-installer.ts`) — SideQuest never sees a token.
- **v1 ships all three provider families together** (remote API key, CLI bridge, Ollama) rather than staging them — accepted extra scope/risk in exchange for not having to revisit the settings UI and the provider abstraction twice.
- **Text-only generation.** No mascot image generation in v1 — a generated pack has no image-gen mascot; it falls back to the existing hash-based accent color (`plan-marketplace-packs.md` § 3.5) or the user assigns one of the bundled mascots afterward. Explicitly deferred, not forgotten.
- **Generated output must conform to the same schema as manual import** (`{ name, exercises: [{ id, label, durationSec, category }] }`) — no new pack shape, no LLM-authored code ever executed (packs stay pure declarative JSON, same rationale already documented in `packs.ts` and in `plan-marketplace-packs.md` § 3.6).

## 3. Technical architecture

### 3.1 Shared pack validator (prerequisite refactor)

`dashboard:import-plan` in `packages/app/src/main/index.js` currently inlines the JSON shape validation/sanitization (name/exercises coercion, id fallback, duration clamping). Extract it to `packages/core/src/packs.ts` as `parsePackJson(data: unknown): { name: string; exercises: Exercise[] } | { error: string }`, so both manual import and LLM generation run through **one** sanitizer — untrusted input either way, same rules (duration bounds, id fallback via `randomUUID()`, no unexpected keys carried through, exercise count capped — e.g. 12 max, new documented constant alongside `MAX_MASCOT_IMAGE_BYTES`'s style). `dashboard:import-plan` is refactored to call it; behavior unchanged.

`PackSource` (`packages/core/src/packs.ts`) gains a fourth value: `"generated"` — distinct provenance badge in the gallery ("Généré par IA" / "AI-generated"), reusing the badge mechanism already built for `bundled`/`imported`/`custom` (`plan-marketplace-packs.md` § 3.3).

### 3.2 Provider abstraction (`packages/core`)

New `packages/core/src/llm/` :

- `types.ts` — `interface LlmProvider { generate(prompt: string, opts: LlmGenerateOptions): Promise<string> }`, returns raw text (the provider's best attempt at JSON), never a parsed `Pack` — parsing/sanitizing is `parsePackJson`'s job (3.1), kept separate so every provider is exercised by the same validation path in tests.
- A fixed **prompt template** (system instructions + the target JSON shape + explicit bounds: 4–12 exercises, 10–120s each) is built once in `llm/prompt.ts`, shared by every provider — the free-text field the user types is interpolated as data, never concatenated into a shell command (matters for the CLI providers, § 3.2.3).
- `anthropic-api.ts` / `openai-api.ts` — direct `fetch()` to the Messages / Chat Completions endpoint with the user's API key in the request header. No new SDK dependency, consistent with the project's existing "no new dependency where a direct call suffices" pattern (`plan-marketplace-packs.md` § 3.1 on skipping zod).
- `claude-cli.ts` / `codex-cli.ts` — `execFile("claude", ["-p", prompt, "--output-format", "json"])` / equivalent `codex exec` invocation, **array args, never a shell string** (the prompt is free user text — shell interpolation here would be a command-injection hole). Hard timeout (e.g. 60s) + kill on timeout, stdout size cap. Availability probed with `execFile("which", ["claude"])` (or `where` on Windows).
- `ollama.ts` — `POST {ollamaBaseUrl}/api/generate` with `format: "json"`, model from settings. `GET {ollamaBaseUrl}/api/tags` used by the Settings UI to populate the model dropdown.
- Every provider gets **one retry** on an invalid-JSON response, re-prompting with "your previous reply was not valid JSON, reply with only the JSON object" — then surfaces a clear error rather than looping.

### 3.3 Secret storage (`packages/app` only — core stays Electron-agnostic)

API keys **never** go through `packages/core/storage.ts` / SQLite — same principle already applied to mascot base64 ("never stored as-is", `plan-marketplace-packs.md` § 3.1). Instead:

- `packages/app/src/main/llm-credentials.js` (new) — uses Electron's `safeStorage` (OS keychain-backed, built in, no new dependency) to encrypt the key, writes the encrypted buffer to `path.join(app.getPath("userData"), "llm-credentials.json")`. If `safeStorage.isEncryptionAvailable()` is false, refuse to store the key and show an explanatory error — never fall back to plaintext.
- Core's `Settings` (`packages/core/src/storage.ts`, additive migration like the existing ones) only gains **non-secret** config: `llmProvider: "none" | "anthropic-api" | "openai-api" | "claude-cli" | "codex-cli" | "ollama"` (default `"none"`), `anthropicModel`, `openaiModel`, `ollamaBaseUrl` (default `http://127.0.0.1:11434`), `ollamaModel`. The decrypted key is read app-side and passed into the core `generate()` call as a plain argument at invocation time — it never round-trips through `storage.ts`.

### 3.4 IPC (`packages/app/src/main/index.js`)

- `dashboard:get-llm-status` → `{ provider, hasApiKey, claudeCliAvailable, codexCliAvailable }`, probed on Settings panel load (CLI availability) and cached for the session.
- `dashboard:set-llm-api-key` (provider, key) → encrypts + persists via 3.3, returns `{ ok: true }`, never echoes the key back to the renderer.
- `dashboard:test-llm-connection` (provider) → one minimal round-trip call (or, for Ollama, just `GET /api/tags`; for CLI providers, the `which` probe) — powers a "Test connection" button with ✓/✗ feedback instead of only failing at generation time.
- `dashboard:update-settings` extended to accept the new non-secret fields (fits the existing partial-update pattern).
- `dashboard:generate-plan` (prompt: string) → resolves the configured provider, decrypts the key if needed, calls `generate()` with a timeout, runs the result through `parsePackJson` (3.1), on success `storage.createPlan(name, exercises, { source: "generated" })` — mirrors `dashboard:import-plan`'s `{ imported, error, plan }` shape as `{ generated, error, plan }`.

### 3.5 UI

- **Packs gallery** (`dashboard/index.html` `#panel-plans`): new `#generate-plan-btn` next to `#import-plan-btn`. Click opens a small modal (textarea prompt + optional exercise-count hint), disables the button and shows a spinner while in flight, calls `dashboardAPI.generatePlan(prompt)`, then reuses `importPlan()`'s existing success path (toast + grid refresh) on success. If `llmProvider === "none"`, the button stays visible (progressive discovery, consistent with how the Claude Code hook install button is always shown with actionable state rather than hidden) but routes straight to the Settings panel with a hint instead of opening the prompt modal.
- **Settings panel**: new "AI / Plan generation" section — a provider selector using the same segmented-button pattern already used for `mode`/`triggerSource`/`visualTheme`. Conditional sub-fields per provider: masked API-key input + model field + "Test connection" button (`anthropic-api`/`openai-api`); a read-only status line from the CLI probe, no input (`claude-cli`/`codex-cli`); base URL + model dropdown populated from `/api/tags` + probe button (`ollama`).
- New i18n keys (FR/EN, `dashboard/i18n.js` + `main/i18n.js`): `plans.generate`, `plans.toast.generated`, `settings.llm.*`, error strings for "invalid JSON after retry", "provider unreachable", "no API key configured".

**New first for this app's threat model**: this is the first feature capable of outbound network traffic (API-key providers) or spawning an external process with user-supplied text (CLI providers). Ollama stays loopback-only by default — pointing `ollamaBaseUrl` at a remote host is an explicit user opt-in, not a default, mirroring `HookServer`'s existing "127.0.0.1 only" posture.

**Explicitly out of scope (v1)**: mascot/image generation, multi-turn refinement (a "Regenerate" button is just a fresh one-shot call, no chat history kept), usage/cost tracking, CLI auto-install (detect + link to install docs only, never install a binary on the user's behalf).

## 4. Functional scope

**Included**
- Shared pack-JSON validator reused by both import and generation (3.1)
- `LlmProvider` abstraction with 5 concrete providers: Anthropic API, OpenAI API, Claude Code CLI bridge, Codex CLI bridge, Ollama (3.2)
- Encrypted local API-key storage via `safeStorage`, never through core/SQLite (3.3)
- "Generate" button in the Packs gallery + AI provider section in Settings (3.5)
- `"generated"` provenance badge

**Excluded (later)**
- OAuth "sign in with Anthropic/OpenAI" (infeasible for a third-party desktop app today — not a v1 vs. later question, a hard constraint)
- LLM-generated mascot artwork
- Multi-turn conversational refinement
- Any server-side/shared generation quota or leaderboard tie-in (belongs to the V2 backend, not this plan)

## 5. Development sprints

1. **Sprint 1 — done, 2026-08-27** — `parsePackJson(data)` extracted into `packages/core/src/packs.ts` (`{name, exercises} | {error: ParsePackJsonError}`, new `MAX_PACK_EXERCISES = 12` cap), `dashboard:import-plan` refactored to call it (tightens behavior slightly: an empty-exercises or >12-exercises file is now rejected, wasn't before). `PackSource` gains `"generated"`. `Settings` gains `llmProvider` (renamed `LlmProviderId` in core to avoid a name collision with the `LlmProvider` *interface* added in Sprint 2 — same word, two different things: one is a settings string union, the other is the provider object shape), `anthropicModel`, `openaiModel`, `ollamaBaseUrl`, `ollamaModel` — additive to the existing key/value `settings` table, no migration needed (unlike `plans`, `Settings` was never column-based). 13 new tests in `packs.test.ts` (valid/invalid shapes, id/duration fallback, empty, too-many, non-object input).
2. **Sprint 2 — done, 2026-08-27** — New `packages/core/src/llm/`: `types.ts` (`LlmProvider`/`LlmGenerateOptions`), `prompt.ts` (`buildPackPrompt`, shared template, 4–12 exercises / 10–120s bounds baked in), `generate-pack.ts` (`generatePack()` — one retry on invalid JSON, no retry on a provider-level error since retrying the same broken key/connection is pointless), `anthropic-api.ts`/`openai-api.ts` (direct `fetch()`, no SDK — default model corrected mid-build from a guessed `claude-sonnet-4-5` to the actual current `claude-sonnet-5`), `ollama.ts` (+ `listOllamaModels`). No new dependency — native `fetch`/`AbortSignal.timeout` (Node ≥20, matches `engines`). 21 new tests (`llm-generate-pack.test.ts`, `llm-providers.test.ts` with `fetch` mocked via `vi.stubGlobal`).
3. **Sprint 3 — done, 2026-08-27** — `packages/app/src/main/llm-credentials.js`: `safeStorage`-encrypted keys (one per provider id) in a dedicated `userData/llm-credentials.json`, refuses to store (never falls back to plaintext) if `safeStorage.isEncryptionAvailable()` is false. Settings UI: one shared field set (key/model/base-URL/CLI-status/test-connection rows) relabeled per selected provider, rather than duplicating markup per provider — mirrors the existing mode/triggerSource segmented-button pattern.
4. **Sprint 4 — done, 2026-08-27** — `dashboard:generate-plan` IPC (+ `get-llm-status`, `set-llm-api-key`, `test-llm-connection`, `get-ollama-models`), "✨ Générer avec l'IA" button + modal in the Packs gallery, reuses `importPlan()`'s success path (toast, push into `plansState.customPlans`, open the editor). **Bug found and fixed during this sprint**: `.interval-row`/`.hook-status-row`/`.modal-overlay` all set `display: flex` unconditionally, which beats the `[hidden]` attribute's UA-stylesheet `display: none` in the cascade — every provider's fields showed at once regardless of selection. The codebase already had the fix pattern for exactly this (`.onboarding-banner[hidden] { display: none; }`), just hadn't been applied to these three classes yet; added `[hidden]` overrides for all three.
5. **Sprint 5 — partially verified, 2026-08-27** — `claude-cli.ts`: **verified against a real invocation** (`claude -p '...' --output-format json` was actually run; its wrapper shape — `{type, is_error, result, ...}` — was captured and used as the exact test fixture in `llm-claude-cli.test.ts`, including the array-args-not-shell-string check). `codex-cli.ts`: **not verified** — the `codex` binary isn't installed in this dev environment, so its `codex exec <prompt>` invocation and (lack of) output-wrapping are based on documented usage, not an observed run; flagged prominently in the file's own header comment. **Test against a real `codex` install before relying on it.**
6. **Sprint 6 — done, 2026-08-27** — Error i18n strings (FR/EN) for empty/too-many-exercises/invalid-LLM-JSON/provider-error/not-configured, all routed through one `packParseErrorKey()` mapper shared by import and generation. `"Généré par IA"` gallery badge (magenta, alongside the existing Officiel/blue and Importé/gold). Full end-to-end live verification: real `claude-cli` generation from the actual running app (not a mock) produced a 6-exercise French pack ("Respiration & Épaules Détente") that landed in the gallery with the correct badge — see the commit for the exact flow tested.

## 6. Next

- ~~Fold this plan's roadmap link into `plan-mvp-sidequest.md`'s V1 row~~ — done alongside this sprint log update.
- **Verify `codex-cli.ts` against a real Codex install** (Sprint 5's open item) — adjust the output-unwrapping if `codex exec` turns out to wrap its output the way `claude -p --output-format json` does.
- **Verify the packaged-build asset path** for `llm-credentials.js` and `packages/core/dist/llm/` the same way `plan-marketplace-packs.md` flagged for `listBundledPacks()` — only exercised in dev mode so far.
