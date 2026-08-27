# Development Plan — Marketplace Packs (custom import, gallery, gamification, community PR path)

**Local repo**: `/Users/nicolas/perso/sidequest`
**Status**: planned, not started — designed 2026-08-26/27 (see roadmap section 6 of [`plan-mvp-sidequest.md`](plan-mvp-sidequest.md), new "V1+" entry).

## 1. Vision

The repo already presents SideQuest as a marketplace (README, roadmap), but today only one pack ships (**SideGym** / `sport-basic.json`), loaded through a single hardcoded file lookup (`loadPack(packId)`, `packages/core/src/packs.ts`). The mascot is a global setting fully disconnected from the active pack, and the dashboard's plan import/export only handles `{name, exercises}` — no mascot, no notion of provenance (official vs. imported vs. custom).

This plan makes three things possible: users **import their own pack (exercises + their own mascot) locally**, a real **packs gallery** in the dashboard instead of a plain "Plans" tab, and a documented **community contribution path via PR** — without building the V1.5/V2 infrastructure (dynamic registry, install CLI, paid backend), which stays out of scope and is already tracked in the roadmap.

`Plan` (SQLite, dashboard CRUD) and `Pack` (bundled JSON) are today two near-identical, unrelated types — unifying them is the prerequisite that unlocks everything else (a pack carrying its own mascot, discovery of more than one bundled pack, etc.).

## 2. Locked-in decisions

- **Custom pack import format**: a single JSON file, mascot image embedded as base64 — reuses the existing plan-import dialog as-is, no zip/folder handling.
- **Packs gallery** in the dashboard is in scope, not just an extension of plan import/export — it's what makes the app read as a marketplace rather than a single "create your training plan" screen.
- **Two additional pack ideas** added to the catalog vision: **SideCat** ("look after your cat") and **SideTama** (tamagotchi-like growth). Both are modeled as ordinary `Exercise`-based packs (a popup is a short care action: "feed your cat", "pet it", "let it sleep") — no new pack "type" or state-machine engine, to avoid over-building a simulation for what is really "show a progression".
- **Cross-pack XP bar** for gamification, additive on top of the existing per-session history (no change to `sessions`/streak logic).
- **Official SideQuest logo** (`docs/branding/SideQuest-logo.png`, transparent PNG, pixel-art explorer mascot, tagline "CODE. QUEST. GROW.") integrated at the top of the README. Its palette (cyan/cream/dark) becomes the app's base brand palette, layered on top of — not replacing — the 4 existing `visualTheme` skins (see [`plan-theme-global.md`](plan-theme-global.md)).
- **Per-pack color**: each pack carries its own accent color, shown in 3 places — the gallery card badge/border, the XP bar fill, and the overlay's accent color while that pack's exercise is showing.

## 3. Technical architecture

### 3.1 Data model unification (`Pack` / `Plan`)

Extend `Pack` rather than keep two parallel types; `Plan` becomes a type alias of `Pack`.

- **`packages/core/src/packs.ts`**: add `PackSource = "bundled" | "imported" | "custom"`, `PackMascot { id, label, imagePath }` (absolute file path, base64 is never stored as-is), extend `Pack` with `source: PackSource`, `mascot?: PackMascot`, `color?: string` (hex — added here directly to avoid a second migration later, used in 3.5). `loadPack()` tags its result `source: "bundled"`. New `listBundledPacks(): Pack[]` scans `src/exercises/*.json` instead of the current single hardcoded lookup — this is what lets several bundled packs (SideGym + future community packs merged via PR, 3.6) be discovered with zero code change.
- **`packages/core/src/storage.ts`**: replace the local `Plan` interface with `export type Plan = Pack;`. `plans` table gains `source TEXT NOT NULL DEFAULT 'custom'`, `mascot_id`, `mascot_label`, `mascot_image_path`, `color TEXT` via the same additive-migration pattern already used for `sessions.mascot`/`sessions.mode`. `createPlan(name, exercises, opts?: { source?, mascot?, color? })` defaults to `source: "custom"` so existing plans keep working unchanged. `deletePlan` stays as-is in core (no fs access there); mascot file cleanup happens app-side (3.2).

No new dependency (no zod) — kept consistent with the existing hand-rolled validation style.

### 3.2 Custom pack import (exercises + own mascot)

Import format — a single JSON file, `mascot` optional:

```json
{
  "name": "SideYoga - Douceur",
  "mascot": { "label": "Yogi", "image": "data:image/png;base64,iVBORw0KGgo..." },
  "exercises": [{ "id": "stretch-1", "label": "Étirement dos", "durationSec": 30, "category": "étirement" }]
}
```

- **`packages/app/src/main/index.js`**: extend `dashboard:import-plan` — validate `mascot.image` against `data:image/(png|jpe?g|webp);base64,...`, cap the decoded size (~3 MB), decode with `Buffer.from(..., "base64")`, write to `path.join(app.getPath("userData"), "custom-mascots", `${randomUUID()}.${ext}`)`. The base64 blob is **never** stored in SQLite — only the resulting absolute path, via `storage.createPlan(..., { source: "imported", mascot })`. Extend `dashboard:export-plan` to re-embed the mascot as base64 for a lossless round-trip (this doubles as the sharing mechanism for 3.6's PR path). Extend `dashboard:delete-plan` to best-effort `unlinkSync` a mascot file living under `userData/custom-mascots/`. `showExercise()` exposes `payload.mascotImage` (`file://` + path) so the overlay never needs filesystem access itself.
- **Mascot resolution de-duplication**: `MASCOT_LABELS`/`MASCOT_IMAGES`/`resolveMascotImage` are currently duplicated in `dashboard/renderer.js` and `overlay/renderer.js`. New shared `packages/app/src/shared/mascots.js`, loaded via `<script defer>` in both `index.html` files, single source of truth. `resolveMascotImage(mascotId, theme, overrideImageUrl?)` gains an optional 3rd argument that short-circuits to a resolved custom image when provided.

**Risks**: base64 size cap (new constant, no repo precedent — document inline); context isolation preserved (renderer never gets direct fs access, everything flows through IPC like today); orphaned-file cleanup stays best-effort, no startup GC pass.

**Explicitly out of scope**: zip/folder import, multi-file drag-and-drop, animated mascots (gif/Rive) — png/jpg/webp static only, matching today's bundled mascots.

### 3.3 Packs gallery in the dashboard

Reuses the existing "Plans" tab (`dashboard/renderer.js`, panel in `index.html`) rather than a second screen — the actual gap is multi-pack discovery, not the grid UI, which already exists.

- **`main/index.js`**: `dashboard:get-plans` returns `{ bundledPacks: listBundledPacks(), customPlans: storage.getPlans() }` instead of the singular `defaultPlan: loadPack("sport-basic")`. `dashboard:export-plan`'s `sport-basic` special case generalizes to a lookup in `listBundledPacks()` by id.
- **`dashboard/renderer.js`**: `allPlans()` concatenates `bundledPacks` + `customPlans`. `renderPlansGrid()` adds a mascot thumbnail per card (via the shared `resolveMascotImage`), a provenance badge ("Official" / "Imported" / none for "Custom"), and generalizes the "can't delete" rule from `id === DEFAULT_PLAN_ID` to `source === "bundled"`.
- **`dashboard/index.html` + i18n files**: cosmetic rename "Plans" → "Packs" / "Packs gallery" (open for naming bikeshedding), import button label.

**Risk to verify**: `packages/app/package.json`'s electron-builder `files` doesn't explicitly list `packages/core/dist/exercises/*.json` — it already works today for the single `sport-basic.json` via workspace dependency resolution, but this is the first time multi-pack discovery is exercised in a packaged build → run `pnpm run build` + a packaged-app smoke test once `listBundledPacks()` ships.

**Explicitly out of scope**: search/filter, ratings, remote/downloadable packs.

### 3.4 XP bar (gamification) + SideCat / SideTama packs

- **`packages/core/src/storage.ts`**: new `pack_progress (plan_id TEXT PRIMARY KEY, xp INTEGER NOT NULL DEFAULT 0, level INTEGER NOT NULL DEFAULT 1)` table, created alongside `plans`/`sessions` in `migrate()`. `addXp(planId, amount)` increments `xp` and recomputes `level` with a deliberately simple v1 formula: `level = Math.floor(xp / 100) + 1` (no per-pack curve yet). `getPackProgress(planId)` reads, defaulting to `{ xp: 0, level: 1 }`.
- **`main/index.js`**: in `recordAndHide(status)`, right after `storage.recordSession(...)`, call `storage.addXp(currentPlan.id, XP_PER_EXERCISE)` (flat constant, e.g. `10`) when `status === "done"`. New `dashboard:get-pack-progress` handler feeds the gallery's bar.
- **`packages/core/src/packs.ts`**: `PackMascot` gains an optional `stages?: { minLevel: number; imagePath: string }[]` — generic, not pet-specific, but what lets SideCat/SideTama visually grow with level (kitten → cat → majestic cat; egg → baby → adult), on the same principle as the existing `MASCOT_LIGHT_VARIANTS` mechanism but keyed by level instead of theme. Packs without `stages` (SideGym, SideYoga...) just show the bar without a mascot change.
- **`dashboard/renderer.js`**: gallery card gains a progress bar (`xp % 100` width, "Level N" label) below the mascot thumbnail. Shared `resolveMascotImage` resolves the highest `stage` whose `minLevel <= level` when `mascot.stages` is set — used by both the gallery and the overlay.
- **Two example packs** (illustrative — either shipped as JSON under `packages/core/src/exercises/` or kept as examples in 3.6's doc):
  - **SideCat** — care actions ("Feed your cat (10s)", "Scratch its ears", "Change the litter box"); hook line: **Your cat exists even when you're coding.** A pet, a bowl, 30 seconds. It grows with your streak, not your guilt.
  - **SideTama** — care actions ("Feed it", "Play with it", "Let it sleep"); hook line: **Your tamagotchi doesn't judge your commits, it grows with them.** 30 seconds, one more level.

**Explicitly out of scope (v1)**: no decay/hunger over time (no real tamagotchi that "dies"), no per-pack/per-exercise XP formula, no level reset/prestige, no server/leaderboard for XP (see V2 in `plan-mvp-sidequest.md`) — the bar stays a local, cosmetic indicator.

### 3.5 Logo & per-pack color system

- **README** — done: `docs/branding/SideQuest-logo.png` (2092×752, transparent background) integrated centered at the top of `README.md` (`<img ... width="480">` inside the existing `<p align="center">` block).
- **Base palette** read off the actual file (background is transparent, not black — the black seen in a chat preview was just the window background): cyan/turquoise ≈ `#3ecfd6` (primary), cream/sand ≈ `#ecd8a8` (secondary), brown ≈ `#8a6a45` (tertiary accent variation), dark anthracite ≈ `#12181a` (dashboard dark base, not pure black). Exposed as new CSS custom properties (`--sq-accent`, `--sq-cream`, ...) in the dashboard's shared stylesheet, additive to the existing `visualTheme` skin tokens (section 3.1 of `plan-theme-global.md`) — this becomes the product's default/brand palette, skins remain a cosmetic choice on top.
- **Per-pack color, 3 usage points**: (1) gallery card border/badge tinted with `pack.color` (3.3); (2) XP bar fill uses `pack.color` instead of one global color (3.4); (3) overlay — `showExercise()` adds `payload.packColor`, the overlay sets `document.documentElement.style.setProperty("--pack-accent", payload.packColor)`, consumed by its existing CSS (popup border, primary button) — same mechanism as `payload.mascotImage` in 3.2.
- **Packs without an explicit color** (custom/imported, no `color` in the JSON): stable fallback computed by hashing the pack id into an HSL hue (small utility function, no new dependency) rather than forcing a color picker into the import UI.
- **Indicative color proposal** for already-named packs (to confirm later): SideGym `#3ecfd6` (logo cyan — current official pack), SideParrot green, SideYoga soft lavender, SideCodingGame electric blue, SideCat `#8a6a45` (logo brown) or warm orange, SideTama `#ecd8a8` (logo cream) or gold.

**Explicitly out of scope**: no custom color picker in the import UI for v1 (the JSON's `color` field is optional, hash fallback otherwise); no retouch of the 4 existing `visualTheme` skins.

### 3.6 Community contribution via PR (docs only)

New doc, `docs/plan-community-packs.md`, linked from the V1.5 roadmap row:

1. **Mechanic possible today with zero extra code** (thanks to 3.1/3.3): a contributor adds a pack JSON (`packages/core/src/exercises/`) + a mascot image (`packages/app/assets/mascots/`, optionally several `stages`) via PR. `listBundledPacks()` picks it up automatically — no registry file to edit.
2. **Limitation to state explicitly**: a merged pack only reaches users on the **next tagged release** (no dynamic registry = no hot install) — unlike 3.2's local JSON import, which works **instantly, offline**. This is the key thing to communicate to a contributor.
3. **Relationship to the existing roadmap**, without contradicting it: this PR path is a lightweight, manual (regular human code review) precursor to V1.5 (`sidequest install <pack>`, dynamic registry) and V3 (paid, formally-reviewed third-party marketplace) already described in `plan-mvp-sidequest.md`.
4. **Constraints carried over**: packs stay purely declarative JSON (same security rationale as `packs.ts`'s existing comment); no CI schema-validation bot, no art-licensing requirement for now — left to human review, deliberately not over-engineered.

## 4. Functional scope

**Included**
- Custom pack import (exercises + own mascot, base64 single-file JSON)
- Packs gallery replacing the single "Plans" tab (bundled + imported packs, provenance badges, mascot thumbnails)
- Per-pack XP bar + level, with mascot growth stages for packs that define them
- Two new example packs: SideCat, SideTama
- Official logo in the README + base brand palette + per-pack color (gallery, XP bar, overlay)
- Community contribution documented as a PR-based path (docs only)

**Excluded (later roadmap, V1.5+)**
- Dynamic pack registry / `sidequest install <pack>` CLI
- Zip/folder pack bundles, drag-and-drop
- XP leaderboard / server-side anything
- Reviewed, paid third-party marketplace (V3)

## 5. Development sprints (planned)

1. **Sprint 1 — done, 2026-08-27** — `Pack`/`Plan` unification, `listBundledPacks()`, storage migrations (3.1). Core test suite extended (`packs.test.ts`, `storage.test.ts`), 61/61 passing.
2. **Sprint 2 — done, 2026-08-27** — Custom pack import/export with embedded mascot (decode/encode + size cap + best-effort cleanup on delete in `main/index.js`), shared `packages/app/src/shared/mascots.js` module replacing the dashboard/overlay duplication, `showExercise()` now exposes `payload.mascotImage` (3.2). Verified via `node --check` on all touched files (no bundler/typecheck exists for the app package). Live Electron smoke-test inside the coding-agent's sandboxed shell initially looked broken (`electron .` crashing with a Node ESM-loader error before even reaching `main/index.js`, reproduced identically on the pre-change code via `git stash`) — root-caused to the sandbox exporting `ELECTRON_RUN_AS_NODE=1` in its ambient shell environment, which makes any Electron binary run as plain Node instead of bootstrapping the app (`electron --version` printed a Node version instead of `33.4.11` as the tell). Confirmed with `env -u ELECTRON_RUN_AS_NODE electron --version` → correct Electron version. **Not a real bug** — a normal terminal (no `ELECTRON_RUN_AS_NODE` set) launches fine; live UI smoke-testing from within this agent's shell needs `env -u ELECTRON_RUN_AS_NODE` prefixed to any Electron launch. Side-effect caught and fixed during this investigation: the app's `prestart` hook (`electron-rebuild -f -w better-sqlite3`) recompiles the native module for Electron's Node ABI, which breaks `packages/core`'s own Vitest run right after (`NODE_MODULE_VERSION` mismatch) — fixed locally with `npx prebuild-install`, worth noting for whoever runs both in the same session.
3. **Sprint 3 — done, 2026-08-27** — Packs gallery in the dashboard (3.3): `dashboard:get-plans` now returns `{ bundledPacks: listBundledPacks(), customPlans }` instead of a single `defaultPlan`; the "Plans" tab is relabeled "Packs" / "Galerie de packs" (nav, page title, import/new-pack buttons); each card gets a mascot thumbnail (the pack's own mascot if it has one, otherwise the currently active global mascot — an honest preview of what actually shows if that pack is activated) and a provenance badge ("Officiel" for `source: "bundled"`, "Importé" for `source: "imported"`, none for `"custom"`); the "can't delete" guard generalized from `id === "sport-basic"` to `source === "bundled"`. Verified visually via an in-app `capturePage()` screenshot (not OS `screencapture`, blocked by missing Screen Recording permission in this sandboxed shell) driving a scripted click on the Packs nav tab — SideGym shows correctly as Officiel+Actif with no delete button, a leftover custom plan shows no badge and a delete button. Core tests still 61/61 (no core changes needed for this sprint — `listBundledPacks()` already existed from Sprint 1).
4. **Sprint 4 — done, 2026-08-27** — XP bar + `pack_progress` table (3.4). `storage.addXp(planId, amount)` / `getPackProgress(planId)`, cleaned up on `deletePlan`; `recordAndHide()` in `main/index.js` credits `XP_PER_EXERCISE = 10` to the active pack on every "done" (tracked via a new `currentPlanId`, mirroring `currentExercise`/`currentMascot`). Mascot growth stages resolved via a small `resolvePackMascotStage(mascot, level)` helper — duplicated on purpose once in `shared/mascots.js` (dashboard/overlay, browser context) and once in `main/index.js` (Node context, feeds the overlay's `payload.mascotImage`) since the two can't share a module. Gallery card gains an XP bar (`xp % 100` width, "Niveau N" label) below the exercise count. **SideCat and SideTama shipped as real bundled packs** (`packages/core/src/exercises/sidecat.json`, `sidetama.json`, exercises only, `color` field set per the Sprint 6 proposal) — no `mascot`/`stages` yet, no cat/tamagotchi art exists to ship; they fall back to the global active mascot in the gallery and overlay exactly like SideGym does today, and the `stages` mechanism is ready to wire in the moment real art shows up (no further code change needed, just add `mascot` to the JSON). Verified with a debug-injected XP credit + scripted screenshot: SideGym at 250 XP → "Niveau 3", bar at 50%; SideCat at 30 XP → "Niveau 1", bar at 30%. Core suite 65/65 (4 new tests for `addXp`/`getPackProgress`/deletion cleanup).
5. **Sprint 5 — done, 2026-08-27** — Official logo integrated in the README (3.5, logo part only); base palette identified.
6. **Sprint 6 (planned)** — Per-pack color system wired into the gallery, XP bar, and overlay (3.5, remainder).
7. **Sprint 7 (planned)** — `docs/plan-community-packs.md` (3.6).

## 6. Next

Once sprints land, fold the "V1+" roadmap row below back into `plan-mvp-sidequest.md` section 6 as a completed/linked entry, the same way `plan-theme-global.md` and `plan-v0.5-hooks-claude-code.md` are referenced today.
