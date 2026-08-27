# MVP Development Plan — SideQuest (idle time marketplace)

**Local repo**: `/Users/nicolas/perso/ClaudeCodeGym`

## 1. Product vision

A cross-platform desktop app that shows a mascot on screen (Clippy-style) during the user's idle time (e.g. waiting on a Claude Code / Codex / Copilot response) to suggest quick exercise breaks. Long-term positioning: an "idle time" marketplace (sport, yoga, courses...), with a premium layer (leaderboard, skins, advanced settings, AI).

Inspirations: `claude-gym` (gentle notification, local log reading) and `workout-gate` (real session blocking, anti-cheat webcam).

## 2. Locked-in decisions

- **Friction**: both modes available from the MVP, configurable in settings (soft notification **and** real blocking).
- **Platforms**: macOS, Windows, Linux from the MVP.
- **Stack**: Electron (npm ecosystem), settled after comparing Neutralino.js, Tauri, and 100%-Python alternatives (PySide6, pywebview) — Electron chosen for ecosystem maturity (tray, autolaunch, transparent windows) and solo-dev iteration speed. No webcam/anti-cheat in the MVP, but the data schema is ready for it.
- **Mascots**: the 2 provided mascots (Ronnie Coleman, Miami 80s) integrated from the MVP, Miami Vice 80s theme.
- **License**: MIT/Apache 2.0 on the public repo starting now — future premium features will never be published in this repo (see section 7).

## 3. Technical architecture

### 3.1 Monorepo (pnpm workspaces)

```
sidequest/
├── packages/
│   ├── core/                # pure npm package, no Electron dependency
│   │   ├── scheduler.ts     # timer + triggers (idle time)
│   │   ├── hooks/           # Claude Code / Codex log readers (v0.5)
│   │   ├── exercises/       # static exercise data (JSON packs)
│   │   ├── storage.ts       # SQLite (better-sqlite3): history + settings
│   │   └── gate.ts          # session-blocking logic
│   └── app/                 # Electron app
│       ├── main/            # main process: tray, windows, autolaunch
│       ├── overlay/         # mascot window (vanilla HTML/CSS/JS, transparent, always-on-top)
│       └── dashboard/       # settings/history window (vanilla HTML/CSS/JS, hand-rolled canvas/SVG charts — Sprint 3 decision: consistency with the overlay, no bundler in the MVP)
├── assets/mascots/          # sprites (Ronnie Coleman, Miami 80s)
└── package.json
```

`core` is reusable independently of the GUI app (e.g. via `npx`), and will become the foundation of the future marketplace "packs" system.

### 3.2 Data model (local SQLite)

**`settings`**
- `interval_minutes`, `mode` (`notify` / `gate` / `mixed`), `active_mascot`, `autolaunch` (bool), `active_program`

**`sessions`**
- `id`, `timestamp`, `exercise_id`, `status` (`done` / `skipped` / `missed`), `trigger_type` (`timer` / `hook`), `verified` (bool, `false` by default — ready for future anti-cheat)

**`exercises`** (packs, declarative JSON format — never executable code, see 3.3)

Dashboard charts (streak, volume/week) are computed on the fly from `sessions`, no stored aggregate score field — this avoids any migration the day the scoring formula changes.

### 3.3 Pack format (extensible from the MVP)

A pack is a declarative JSON file (never executed JS), e.g.:

```json
{
  "id": "sport-basic",
  "name": "Sport - Basic Program",
  "exercises": [
    { "id": "squat-10", "label": "10 squats", "duration_sec": 30, "category": "legs" },
    { "id": "pushup-10", "label": "10 push-ups", "duration_sec": 30, "category": "arms" }
  ]
}
```

This choice (declarative data, no code) is what will later let us open pack creation up to third-party creators without any security risk (no JS sandboxing to worry about).

### 3.4 Launch at startup

`app.setLoginItemSettings({ openAtLogin: true })` (macOS/Windows) + generating a `.desktop` file in `~/.config/autostart/` for Linux. Toggle exposed in the dashboard.

### 3.5 Dashboard access

The app runs in the background as a "menu bar app" (no window open by default, just a tray/menu bar icon):

- **Click on the tray icon** (left or right, no distinction on macOS) → shows the context menu: "Open dashboard", "Pause", "Quit". The dashboard never opens automatically on click, only via "Open dashboard" (decision revised during Sprint 5 — the plan originally called for a single click to directly toggle it).
- **Configurable global keyboard shortcut** (e.g. `Cmd/Ctrl+Shift+M`) to open the dashboard from anywhere without touching the mouse.
- **From the mascot overlay**: a discreet settings icon (⚙) opens the dashboard directly on the relevant tab.
- **First launch**: the dashboard opens automatically (onboarding: mascot choice, interval, autolaunch).
- Technically: a single `BrowserWindow` instance is created once and reused (hidden/shown, never recreated), with `app.requestSingleInstanceLock()` to avoid duplicates if the app is relaunched while already running.
- Closing the window (the × button) doesn't quit the app — it goes back to the tray, only "Quit" in the tray menu ends the process. Standard menu-bar-app behavior (Spotify, Docker Desktop, etc.).

No local web server needed for the MVP (the dashboard is loaded directly and locally in the `BrowserWindow`) — that would only become relevant if a web/SaaS version happens later (V2+).

## 4. MVP functional scope

**Included**
- Mascot overlay triggered by a configurable timer (2 mascots to choose from)
- Both soft-notification mode **and** real-blocking mode, configurable
- Dashboard: settings (interval, mode, mascot, autolaunch), session history, 1-2 charts (volume/week, streak)
- 100% local storage (SQLite)
- Cross-platform packaging (macOS/Windows/Linux) via `electron-builder`

**Excluded from the MVP (later roadmap)**
- Webcam verification / anti-cheat
- LLM-generated exercises
- Claude Code / Codex-specific hooks (log reading)
- Leaderboard, user accounts, premium skins, backend

## 5. Development sprints

1. **Sprint 1 — Monorepo skeleton**: pnpm workspaces setup, `core` with scheduler + SQLite storage + 1 "sport" pack (10-15 exercises). Scheduler unit tests.
2. **Sprint 2 — Minimal Electron app**: tray icon, transparent always-on-top overlay showing an exercise when the timer fires, integration of the 2 sprites.
3. **Sprint 3 — Dashboard**: full settings window, history screen + Recharts-style charts.
4. **Sprint 4 — Gate mode**: blocking overlay + logic for a debt of unfinished sessions (honor system, `verified` field always `false`).
5. **Sprint 5 — Packaging & distribution**: `electron-builder` for the 3 OSes, GitHub releases, install README, MIT/Apache 2.0 license.

## 6. Post-MVP roadmap

| Version | Content |
|---|---|
| V0.5 | Claude Code / Codex hooks (contextual triggering, claude-gym-style) — see [`plan-v0.5-hooks-claude-code.md`](plan-v0.5-hooks-claude-code.md) |
| V0.5.1 | Global themes / skins (dashboard palette + mascots per theme: Miami 80's, Military camo, Dragonball, Roman Empire) — not planned initially, started along the way — see [`plan-theme-global.md`](plan-theme-global.md) |
| V0.5+ | Animated mascots in the overlay (idle + during exercise) — 3 approaches considered, to be decided based on available time: (1) CSS `@keyframes` animation on the existing `<img>` (idle bounce/breathing, zero new assets, fastest); (2) multiple PNG frames swapped in JS (`setInterval` on `mascotImg.src`, hand-drawn sprite style); (3) [Rive](https://rive.app) (`.riv`) driven by a state machine (`idle` / `exercise-proposed` / `done` / `skip` / `blocking`), wired to the events already exposed by `mascotAPI` — the richest option but requires vectorizing the mascots |
| V1 | Exercise generation via an LLM (remote API key, Claude Code/Codex CLI bridge, or local Ollama), personalized programs — see [`plan-llm-pack-generation.md`](plan-llm-pack-generation.md) |
| V1+ | Local-first marketplace groundwork: custom pack import (own exercises + own mascot), packs gallery in the dashboard, per-pack XP/gamification (incl. SideCat, SideTama concept packs), official SideQuest logo & per-pack color system, community pack contribution via PR as a lightweight precursor to the V1.5 registry — see [`plan-marketplace-packs.md`](plan-marketplace-packs.md) |
| V1.5 | Installable pack registry (`sidequest install sidegym` / `sideparrot` / `sideyoga` / `sidecodinggame`), still free. SideGym (fitness) ships in the MVP; SideParrot (language learning), SideYoga (relaxation) and SideCodingGame (coding-game practice) are the names reserved for the next packs |
| V2 | Backend: accounts, national/global leaderboard (composite score, `verified` field activated), premium skins |
| V2.5 | Post-V2-launch refinement based on real usage data: exact composite score formula, webcam anti-cheat verification activation (schema already in place, `verified: bool`), final Free/Premium split details |
| V3 | Marketplace open to third-party creators (commission): the community can submit its own SideQuests (packs) for review and publishing, not just first-party ones. AI subscription |

## 7. License & future monetization strategy

- Current public repo: **MIT or Apache 2.0** license, never changed retroactively.
- All future premium features (leaderboard backend, account sync, verification, licensing logic) are developed in code **never published** (separate private repo), communicating with the open-source client via API.
- The open-source client stays complete and functional without the premium backend — only premium features (leaderboard participation, skins, AI) require a server-verified license/API key.
- Alternative to evaluate later if the risk of a competing fork becomes real: move future sensitive parts to **AGPL** instead of MIT.

## 8. Known issues (to re-investigate)

- **Unreliable macOS Dock icon**: both in dev (`electron .`) and in the unsigned packaged app, the custom Dock icon appears intermittently and can disappear after a few seconds (`app.dock.setIcon()` in dev, but also the packaged bundle's native `.icns`). Most likely hypothesis: known macOS Icon Services/LaunchServices behavior for **unsigned** apps (`mac.identity: null` in the electron-builder config, for lack of a paid Apple Developer account) — worth re-checking once the app is actually signed/notarized. Not blocking: the tray icon (menu bar) works reliably in all cases and is the app's primary access point.

## 8b. Backlog — not yet scheduled

Smaller planned items, cross-cutting enough that they don't belong in a single feature plan. Not assigned to a roadmap version yet.

- **Architecture / flow diagram in the README**: add a diagram (Mermaid, rendered natively by GitHub) to the ["How it works"](../README.md#how-it-works) section, showing the actual runtime flow — timer / Claude Code hook → main process → overlay window vs. dashboard, SQLite storage, and where the LLM providers (`plan-llm-pack-generation.md`) plug in once that ships. Goal: give a new contributor the shape of the app in one picture instead of five paragraphs.
- **Custom mascot upload, own image/GIF**: today a custom mascot only arrives bundled inside a full pack-import JSON (`plan-marketplace-packs.md` § 3.2), static `png`/`jpg`/`webp` only, animated formats explicitly excluded there. Plan a standalone "change my mascot" flow (independent of importing a whole pack) that also allows **animated GIF**, which requires nailing down a format spec before building it: max file size (today's static cap is ~3MB decoded, an animated GIF budget needs its own number), max canvas dimensions, max frame count / duration (a mascot must stay a small idle-loop, not an arbitrary video), and how it renders in the overlay (`<img src="data:image/gif;...">` animates natively, no extra JS needed, unlike the sprite/Rive options considered for *bundled* mascots in section 6's V0.5+ row — worth cross-referencing so both animated-mascot efforts don't diverge on format).
- **New quest pack idea — SideMamie (check in on your grandma)**: reserved as a future pack name alongside SideParrot/SideYoga/SideCodingGame (section 6, V1.5) — a 30-second nudge to text or call a grandparent between two prompts, in the same spirit as SideCat/SideTama's care-action packs. Not designed or scoped yet (no exercises JSON, no mascot); recorded here so the idea isn't lost, to be set up later.

## 9. Visual identity (adapted from the provided template)

Based on the provided "Ronnie Coleman App" style guide (designed for mobile), adapted here for a desktop app (overlay + dashboard). This section predates the SideQuest rebrand and the skin system (section 6, V0.5.1) — the palette below is effectively what the Miami 80's skin's own table reuses in `plan-theme-global.md`. Since 2026-08-27 the project also has an official SideQuest logo (`docs/branding/SideQuest-logo.png`) with its own base brand palette (cyan/cream/dark, additive on top of the 4 skins, not a replacement) — see [`plan-marketplace-packs.md`](plan-marketplace-packs.md) section 3.5 for the extracted colors and the per-pack color system built on top of it.

### Color palette

| Use | Color | Hex |
|---|---|---|
| Primary background | Bluish black | `#0B0E1A` |
| Secondary background (cards) | Midnight blue | `#15182B` |
| Blue accent | Electric blue | `#1E90FF` |
| Cyan accent | Neon turquoise | `#00E5D4` |
| Primary accent (CTA) | Magenta pink | `#FF2D95` |
| Gold accent | Yellow/gold | `#FFD23F` |
| Light text | White | `#FFFFFF` |
| Secondary text | Light gray | `#A1A1AA` |

Gradients: cyan → purple (logo, headers), pink → orange (alternate CTAs, badges).

### Typography

- **Titles/headlines**: Bebas Neue
- **Accents/punchlines** (à la "YEAH BUDDY!"): Permanent Marker
- **Body text** (dashboard, labels, data): Inter

All three are freely available on Google Fonts, usable without restriction for commercial use.

### UI components carried over to the Electron dashboard

- **Primary button**: pink gradient background, white text, rounded corners
- **Secondary button**: cyan/white outline, transparent background
- **Tertiary button**: text link + chevron
- **Card**: `#15182B` background, rounded corners, mascot avatar + title + progress bar
- **Progress bar**: dark background, cyan → pink gradient fill
- **Badge**: pink outline, uppercase text, transparent background
- **Icons**: simple outline style (dumbbell, flame, chart, bell, settings...)

### Mobile → desktop adaptation

- The original template uses a mobile bottom nav bar → on desktop, it becomes a **navigation sidebar** (Home / Program / History / Settings / Profile).
- The **mascot overlay** reuses the template's "card" style in a compact form: dark background with neon outline, pixel-art sprite + exercise text + primary/secondary buttons (done/skip).
- The neon gradient background with skyline (present in the example screens) can dress up the dashboard background, in a subtle version so it doesn't hurt the readability of charts and data.

### Illustrations

8-bit/16-bit pixel-art style, Miami 80s neon vibe, high contrast — consistent with the two mascots already integrated (Ronnie Coleman, Miami 80s) and to be kept for any future additional mascot.

Static mascots (PNG) in the MVP. Animation planned post-MVP (see V0.5+ roadmap): keep this in mind for the format of future assets, without blocking the MVP on this point.
