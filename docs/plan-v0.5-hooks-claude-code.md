# V0.5 Development Plan — Claude Code Hooks

**Local repo**: `/Users/nicolas/perso/ClaudeCodeGym`
**Prerequisite**: MVP (see [`plan-mvp-mascotte-coach.md`](plan-mvp-mascotte-coach.md)) shipped and merged into `master`.

## 1. Vision

The MVP triggers the mascot on a plain wall-clock timer (every 30 min by default), with no link to what the user is actually doing. V0.5 replaces/complements this timer with a **contextual** trigger: the mascot appears when Claude Code finishes its response, i.e. exactly when idle time begins — `claude-gym`-style (the inspiration cited in the MVP plan, section 1).

Codex is mentioned in the MVP plan's long-term vision, but its hook system hasn't been verified — this version focuses on Claude Code, Codex remains a possible extension if its mechanism turns out to fit (to be validated in sprint 5 of this version).

## 2. Locked-in decisions

- **Mechanism**: [Claude Code hooks](https://docs.claude.com/en/docs/claude-code/hooks) (shell commands configured in `settings.json`, automatically executed on certain session lifecycle events). No local log tailing (unlike what the MVP plan originally envisioned in `core/hooks/`) — hooks actively push info, more reliable than a log reader that has to guess the log format/location.
- **Main hook**: `Stop` — fires when Claude Code finishes its response and hands control back, exactly the start of the idle time we want to fill.
- **Transport**: a small local HTTP server (`127.0.0.1:54321`, hardcoded fixed port) exposed by the main Electron process already running in the tray. The hook just calls `curl` — no need to publish a CLI or add a Node dependency on the hook side, the shell command is enough. Fixed port rather than dynamic+discovery-file (considered then dropped): eliminates all file-reading complexity on the hook side for a negligible collision risk on a personal desktop tool.
- **Security**: loopback binding only, no authentication in this version's MVP (a fully local tool, same trust model as a `Stop` hook that can already run any shell command on the machine — the additional risk of an unauthenticated local HTTP endpoint is negligible in comparison).
- **Coexistence with the timer**: the classic timer (`Scheduler`) stays active by default; the hook is an additional trigger, not a forced replacement. Dashboard setting to choose: timer only / hook only / both (default behavior).
- **Hook installation**: automatic rather than manual (a "copy-paste the JSON" option was considered then dropped, inspired by how [graphify](https://github.com/Graphify-Labs/graphify) self-registers into detected CLIs) — a dashboard button directly edits `~/.claude/settings.json` (idempotent merge, without overwriting the user's existing hooks).

## 3. Technical architecture

### 3.1 New module in `core`

```
packages/core/src/
├── hook-server.ts            # local HTTP server (native node:http, no external dependency)
└── claude-hook-installer.ts  # reads/writes ~/.claude/settings.json (idempotent merge)
```

`hook-server.ts` exposes a `HookServer` class (same spirit as `Scheduler` — pure logic, testable, no Electron dependency):
- `start()`: listens on `127.0.0.1:54321` (fixed port exported as a constant).
- `POST /trigger` → calls an `onTrigger` callback (immediate trigger, `stop`/`start` modes).
- `POST /turn-start` / `POST /turn-end` → `onTurnStart`/`onTurnEnd` callbacks (`thinking` mode, debounce handled on the `app` side, see sprint 6).
- `stop()`.

`claude-hook-installer.ts` exposes pure functions (testable without touching the real user file — path injected as a parameter):
- `isInstalled(settingsPath)`: checks whether one of our hooks (any `hookTriggerMode`) is already present.
- `install(settingsPath, mode)` / `uninstall(settingsPath)`: reads the existing JSON (creates it if missing), installs the hook combination specific to the requested `mode` (`Stop` for `stop`, `UserPromptSubmit` for `start`, both for `thinking`), first cleanly removing any previous mode's hooks, without touching other hooks the user already configured.

### 3.2 Wiring on the `app` side

- `main/index.js` instantiates `HookServer` alongside the existing `Scheduler`, started/stopped along with the app.
- New setting `settings.triggerSource` (`"timer"` / `"hook"` / `"both"`, default `"both"`): when `"hook"` only, the classic `Scheduler` is paused (`scheduler.stop()`) and only `/trigger` fires exercises.
- Dashboard (Settings tab): new selector for this setting, same style as the existing mode selector.

### 3.3 User-facing configuration

A dedicated dashboard card ("Claude Code integration") shows:
- A status ("Enabled" / "Not enabled", determined via `isInstalled()`).
- A `hookTriggerMode` selector (end of response / start of response / while Claude is thinking, see sprint 6) — persisted even if the integration isn't enabled yet; if it's already enabled, changing the mode automatically reinstalls the right hooks.
- A single toggle button: "Enable integration" → calls `install(path, hookTriggerMode)` on the main process via IPC; "Disable" → `uninstall()`.
- A link to the [Claude Code hooks docs](https://docs.claude.com/en/docs/claude-code/hooks) for the curious, but no JSON editing required for normal use.

### 3.4 Trigger case summary

Every way to trigger an exercise today, and what each one actually blocks:

| Trigger | Event | Condition / delay | Blocks the overlay UI (Skip button hidden) | Blocks the Claude Code session (terminal) |
|---|---|---|---|---|
| Timer (`Scheduler`) | every `intervalMinutes` minutes | none | Yes if `gate` mode, or `mixed` + debt > 0 | No — never, it's not a hook |
| Manual button (dashboard "🎲 Generate an exercise", or tray menu "Trigger an exercise now") | user click | none | same (depends on mode) | No |
| `Stop` hook (`hookTriggerMode: "stop"`) | end of Claude's response | immediate (subject to `hookEveryN`) | same (depends on mode) | Yes if blocking — `/trigger` holds its response |
| `UserPromptSubmit` hook (`hookTriggerMode: "start"`) | start of Claude's turn | immediate (subject to `hookEveryN`) | same (depends on mode) | Yes if blocking — `/trigger` holds its response |
| `UserPromptSubmit` + `Stop` hook (`hookTriggerMode: "thinking"`) | start of turn, exercise shown only if Claude is still working after `THINKING_DEBOUNCE_MS` (fixed 8s, see sprint 8 for finer anticipation) | 8s debounce | same (depends on mode) | Yes if blocking — Claude starts instantly (`/turn-start` never blocks), but `/turn-end` holds its response if the exercise triggered in the meantime is still pending |

Reminders: `triggerSource` (`timer`/`hook`/`both`) determines whether hook triggers are considered at all (`"timer"` only → every hook call responds immediately without triggering anything). `hookEveryN` (default 1) only applies to hook triggers, not the timer or the manual button. Mode (`notify`/`gate`/`mixed`) is a global setting, the same regardless of trigger source.

## 4. Functional scope

**Included**
- Local HTTP server in `core`, started with the app
- Exercise trigger via Claude Code hook, choice of trigger point (`hookTriggerMode`: end of response / start of response / while Claude is thinking — sprint 6)
- Timer / hook / both setting
- Dashboard card with automatic hook enable/disable (direct `settings.json` editing)

**UX fix to bake in**
- On the mascot popup, clicking "Done" or "Skip" must **never** open the dashboard — only close the popup. Verified in the current code (`recordAndHide()`, `main/index.js`): already the case, only the settings (gear) button opens the dashboard via `open-dashboard`. Requirement documented here so it isn't accidentally reintroduced in a future sprint.

**Excluded (to revisit later if relevant)**
- Codex support (hook mechanism to be verified — not done yet)
- Automatic pause during an active session (`UserPromptSubmit`/`SessionStart` hook to avoid interrupting mid-typing) — see sprint 4, optional
- Authentication/hardening of the local endpoint (not needed as long as it's loopback-only)

## 5. Development sprints

1. **Sprint 1 — Local IPC server**: `HookServer` in `core` (native `node:http`, fixed port), unit tests (startup, `/trigger` fires the callback). Testable in isolation without Electron.
2. **Sprint 2 — Automatic installer**: `claude-hook-installer.ts` (`isInstalled`/`install`/`uninstall`), unit tests against a temp file (idempotent merge, preserves the user's existing hooks).
3. **Sprint 3 — App wiring + timer/hook/both setting**: `HookServer` instantiated in `main/index.js`, new `triggerSource` setting in `Storage`/dashboard, `Scheduler` paused when `"hook"` only.
4. **Sprint 4 — "Claude Code integration" dashboard card**: status + enable/disable button wired to the installer, user docs (README).
5. **Sprint 5 (optional, partially done)** — Smart pause during an active session (not done) + Codex support investigation (not done) + real Claude Code session blocking in blocking mode (**done**, see sprint 7).
6. **Sprint 6 (done, 2026-08-16)** — Triggering while Claude is "thinking". New dashboard setting `hookTriggerMode` (in the "Claude Code integration" card) to choose the trigger point:
   - **`stop`** (default, historical behavior) — `Stop` hook installed, triggers at the end of Claude's response.
   - **`start`** — `UserPromptSubmit` hook installed, triggers immediately as soon as the user submits their message (start of Claude's turn).
   - **`thinking`** — `UserPromptSubmit` **and** `Stop` installed together: `UserPromptSubmit` starts an 8s debounce (`THINKING_DEBOUNCE_MS` in `main/index.js`) before proposing the exercise, `Stop` cancels it if Claude answered before that delay. Answers the open question from the previous point ("avoid spamming on short exchanges") without needing `PreToolUse`/`PostToolUse`.
   - **Architecture**: `claude-hook-installer.ts` installs the hook combination specific to each mode (cleanly removes the previous mode's hooks before installing the new one, without touching third-party hooks); `HookServer` (core) exposes two new routes `/turn-start` and `/turn-end` alongside `/trigger`; `main/index.js` carries the debounce logic (`pendingThinkingTimer`) and automatically reinstalls hooks if the mode changes while the integration is already active.
   - **Not addressed for now** (carried over unchanged from the previous point): combining with `PreToolUse`/`PostToolUse` to distinguish genuinely long work from a quick back-and-forth (the fixed 8s debounce is good enough as a first pass); fine-grained coexistence with sprint 5's opposite idea (pause during active typing) — both use `UserPromptSubmit` but for different purposes, not yet reconciled.
7. **Sprint 7 (done, 2026-08-18)** — Real Claude Code session blocking in blocking mode (not just the mascot UI). The mechanism ended up simpler than the initial plan envisioned (no `{"decision": "block"}` JSON returned by the hook): the local server **holds the HTTP response** of the `/trigger` hook as long as the exercise it just triggered is blocking (`mode: "gate"`, or `"mixed"` with debt > 0) and hasn't been marked done — `curl` (so the Claude Code hook, so control returned to the user in their terminal) stays pending until then.
   - **`HookServer`** (`hook-server.ts`): `onTrigger` now takes a `respond()` callback to call to send the HTTP response, instead of auto-responding — lets the caller hold it. `server.timeout`/`server.requestTimeout` set to `0` (Node's default timeouts would otherwise cut the connection before the user finishes).
   - **`claude-hook-installer.ts`**: `stop`/`start` mode hooks (which go through `/trigger`) are installed with a `timeout: 600` field (seconds) — otherwise Claude Code would kill the hook after its default 60s, well before an exercise has any chance of being completed. No timeout added for `thinking` mode (see next point, `/turn-start` never blocks).
   - **`main/index.js`**: `showExercise()` now returns `blocking`; `maybeTriggerFromHook(respond)` stores `respond` in `pendingHookRespond` if the triggered exercise is blocking (otherwise calls it right away); `recordAndHide()` calls it (and clears it) once the exercise is marked done — since skip is already ignored in blocking mode (existing safety net), that's the only way out. Also released if the app quits while a blocking exercise is pending (`will-quit`), so the hook isn't left hanging indefinitely.
   - **`thinking` mode covered too, via `/turn-end`** (added after a first pass that excluded it): `/turn-start` never blocks (otherwise every turn, even a fast one, would be delayed at the start — defeating the point of this mode). `onTurnEnd` (Stop), however, now also receives a `respond()`: if the debounce ended up triggering a blocking exercise and it's not yet complete by the time Claude finishes working, the `/turn-end` response is held (same `pendingHookRespond` mechanism, reused) until the user completes it. Result: Claude always starts instantly, but only hands control back once the exercise is done if it ended up triggering. `HookServer.onTurnEnd` therefore has the same `(respond) => void` signature as `onTrigger`.
   - **UX question from the previous point** ("impact if the user just wants to finish a quick turn"): unresolved at this stage, assumed to be intended behavior for blocking mode (`gate`/`mixed`+debt) — that's precisely the point of this mode, consistent with the overlay UI's existing blocking behavior (the "Skip" button already hidden).
8. **Sprint 8 (optional, unimplemented idea)** — Anticipate turn length instead of a fixed delay. Today `thinking` mode uses a hardcoded threshold (`THINKING_DEBOUNCE_MS = 8000`): no real anticipation, just an arbitrary delay before assuming Claude is "still working." Ideas under consideration, to be decided/prioritized when we get to it:
   - **Count tool calls during the turn** (`PreToolUse`/`PostToolUse` hooks, already identified as an unexplored path in sprint 6) — several chained tool calls are a strong signal of long-running work, independent of elapsed time. Could trigger on whichever of two thresholds is hit first (e.g. 8s **or** 3 tool calls).
   - **Real turn-duration history** — log the actual duration of each turn (`UserPromptSubmit` start → `Stop` end) in addition to what `recordSession` already stores, then compute a rolling average/median to dynamically adjust `THINKING_DEBOUNCE_MS` instead of a global constant.
   - **Prompt-content heuristic** (keywords like "refactor"/"implement" vs. a simple question) — considered then dropped, judged too fragile/unreliable to be useful as-is.
   - Scope to define: pilot a single heuristic (probably the first, the simplest to bolt onto the existing hooks architecture) rather than combining all three from the start.

## 6. Next

Once this version ships, back to the general MVP plan roadmap (section 6) — the natural next step: **V0.5+** (animated mascots) or **V1** (exercise generation via the Claude API), depending on current priority.
