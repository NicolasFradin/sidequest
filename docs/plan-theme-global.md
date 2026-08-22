# Development Plan — Global Themes (skins)

**Local repo**: `/Users/nicolas/perso/ClaudeCodeGym`
**Status**: feature not planned initially in the roadmap (see [`plan-mvp-mascotte-coach.md`](plan-mvp-mascotte-coach.md), section 6) — started directly on 2026-08-16 at the user's request, documented after the fact.

## 1. Vision

The MVP offers 2 mascots independent of the dashboard's light/dark theme. This feature introduces a **global theme** ("skin") concept: a complete visual identity pairing a dashboard color palette with one or more dedicated mascots, selectable by the user. Different from the existing light/dark theme (`theme: "dark" | "light"`), which stays and coexists (orthogonal — a global theme can be shown in a light or dark variant).

## 2. Locked-in decisions

- **4 themes at launch**: Miami 80's (GTA Vice City vibe), Military camo (1980s Military vibe), Dragonball, Roman Empire.
- **Selector**: round bubbles laid out horizontally in the sidebar, just above the existing "Theme" (light/dark) button. Each bubble has a textured/gradient background representative of the theme's world (colors only, no logo or pictogram inside).
- **Scope of this first iteration**: only the selection UI (bubbles + active state + persisting the choice via a new `visualTheme` setting). The actual reskin of the rest of the dashboard's colors and theme-specific dedicated mascots are **out of scope** for now.
- **Mascots**: pending dedicated per-theme mascots (to be provided later by the user), all 4 themes reuse the 2 already-available mascots as-is (`ronnie-coleman`, `miami-80s`) — no change to the existing mascot selector.

## 3. Technical architecture

- **`core/src/storage.ts`**: new type `VisualTheme = "miami-80s" | "military-camo" | "dragonball" | "roman-empire"`, new field `Settings.visualTheme` (default `"miami-80s"`), persisted like other settings (key/value `settings` table, no schema migration needed).
- **Dashboard** (`app/src/dashboard/`):
  - `index.html`: new `<div class="visual-theme-row">` with 4 `.visual-theme-bubble` buttons, placed between the nav and `#theme-toggle` inside `<aside class="sidebar">`.
  - `style.css`: one class per theme (`.visual-theme-miami-80s`, `.visual-theme-military-camo`, `.visual-theme-dragonball`, `.visual-theme-roman-empire`) defining a `background` (gradient/stacked `radial-gradient` layers for the camo effect) — colors only, no images. `.active` state with a `box-shadow` ring.
  - `renderer.js`: follows the same pattern as `mascotButtons`/`modeButtons` — `visualThemeButtons`, toggling `.active` in `applySettingsToUI()`, `save({ visualTheme })` on click.
- No extra IPC wiring needed: `dashboard:update-settings` is already generic (`Partial<Settings>`).
- **`docs/branding/`** reorganized into a subfolder per theme (`miami-80s/`, `military-camo/`, `roman-empire/`, `dragonball/`) — see `docs/branding/README.md` for what each subfolder contains and what's still left to integrate.

## 4. Functional scope

**Included (across sprints 1 to 3, all done)**
- 4 selection bubbles in the sidebar, textured background per theme (colors only)
- `visualTheme` setting persisted to storage and reflected by the selected bubble's `.active` state
- Reskin of the dashboard's accent colors per theme (`--accent-*` via `[data-visual-theme]`)
- Dedicated mascots per theme, dashboard selector filtered by the active global theme

**Excluded (for later, sprint 4)**
- Mascot overlay visually adapted to the chosen theme (today only the dashboard is reskinned)

## 5. Development sprints

1. **Sprint 1 (done, 2026-08-16)** — `visualTheme` setting in `core`, selection bubbles in the dashboard (UI + persistence only, no reskin).
2. **Sprint 2 (done, 2026-08-16)** — Dedicated color palette per theme applied to the dashboard. The user provided style-guide templates (`docs/branding/<theme>/style-guide*.png`) for the 4 themes (Miami 80's, Military camo, Roman Empire, then Dragonball added afterward) — see section 3.1 for the extracted color details. Scope: only the 4 accent tokens (`--accent-teal`, `--accent-magenta`, `--accent-gold`, `--accent-blue`), overridden via `[data-visual-theme]` in `style.css`, independent of light/dark (`--bg-*`/`--text-*` stay driven by `[data-theme]`).
3. **Sprint 3 (done, 2026-08-16)** — Integration of dedicated per-theme mascots. The 4 candidates (`mascot-sergeant.png`, `mascot-arnold-80s.png`, `mascot-dragonball.png`, and `mascot-roman_empire.png` provided along the way) are copied into `app/assets/mascots/` (`sergeant`, `arnold-80s`, `goku`, `centurion`). The dashboard's mascot selector (`renderer.js`, `MASCOTS_BY_THEME`) is now rendered dynamically based on the active `visualTheme` — miami-80s offers 3 (Ronnie Coleman, Miami 80s, Arnold 80s), the 3 other themes have 1 each for now. Switching theme automatically reassigns `activeMascot` to the new theme's first mascot if the current one doesn't belong to it. The overlay (`overlay/renderer.js`) knows about all mascots, independent of the active theme at display time.
4. **Sprint 4 (upcoming)** — Reskin of the mascot overlay (`app/src/overlay/`) per theme, not covered by sprint 2 (dashboard only) today.
5. **Sprint 2.1 (done, 2026-08-16)** — Adjustment to sprint 2's reskin, judged not distinctive enough in practice: card borders (`--border-card`, `--border-option`) stayed always teal-tinted regardless of theme (only 4 accent tokens changed, drowned in an otherwise generic chrome) — they're now derived from the active theme via `color-mix()`. New `--btn-primary-text` variable (replaces the hardcoded `#0b0e1a` text on active CTAs/nav) to let a theme use a darker, more saturated button gradient with light text, instead of being limited to pastel shades with dark text like all 4 themes had until now. Military camo palette recalibrated on this basis (green/brown/near-black with cream text, instead of pastel green/red/tan) following direct feedback on this specific example.
6. **Sprint 5 (piloted on Military camo, 2026-08-16)** — Light/dark variants per theme. Until now a theme (`visualTheme`) had a single accent palette, valid whether in light or dark mode (only `--bg-*`/`--text-*` changed with `[data-theme]`, independent of the visual theme). The user provided a second style-guide for Military camo (`docs/branding/military-camo/style-guide-light.png`, "Desert Ops") in addition to the one already in use (renamed `style-guide-dark.png`, forest camo), along with a matching mascot (`mascot-sergeant-desert.png`) — chosen scope: Military only as a pilot, the 3 other themes keep a single palette for now.
   - **Technical**: the `:root[data-visual-theme="military-camo"]` block is split into `:root[data-visual-theme="military-camo"][data-theme="dark"]` (forest camo, green/brown/near-black, already done in sprint 2.1) and `[data-theme="light"]` (desert camo, sand/tan/caramel/blue extracted from the new style guide) — simply combines the two attributes already present on `<html>`, no architecture change. The selection bubble itself (`.visual-theme-military-camo`) also switches pattern via a `:root[data-theme="light"] .visual-theme-military-camo` selector.
   - **Mascot**: `sergeant-desert` isn't a separate choice in `MASCOTS_BY_THEME` (which still only lists `sergeant`) — a new `MASCOT_LIGHT_VARIANTS` table (a generic mechanism, reusable for future themes) maps `sergeant` → `sergeant-desert`, and `resolveMascotImage(mascotId, theme)` returns the desert variant in light mode, the normal one otherwise. `activeMascot` stays `"sergeant"` in storage regardless of mode — only the displayed preview (dashboard and overlay) follows the light/dark theme. Wired into `dashboard/renderer.js` (mascot selector + light/dark button, which didn't refresh the UI before this fix) and `overlay/renderer.js` (re-evaluates the displayed image if the theme changes while a session is already showing).
   - **Left open for extending to the other 3 themes**: does Roman Empire (white marble vs. imperial night?) and Dragonball (day vs. nighttime Super Saiyan?) each have a light/dark variant that makes sense — to be defined theme by theme once dedicated style guides are provided, rather than applying a uniform rule.

### 3.1 Colors extracted from the templates (sprint 2)

| Theme | accent-teal (primary role) | accent-magenta (CTA) | accent-gold (CTA, pair) | accent-blue (nav, secondary) | Source |
|---|---|---|---|---|---|
| Miami 80's | `#00e5d4` | `#ff2d95` | `#ffd23f` | `#1e90ff` | palette already in place (`style-guide-dark.png` / `style-guide-light.png`) |
| Military camo | `#2e8b57` (green) | `#c0392b` (red) | `#d7cda6` (khaki) | `#4b5e3a` (olive) | `military-camo/style-guide.png` |
| Roman Empire | `#1e88e5` (blue) | `#e53935` (red) | `#fbc02d` (gold) | `#00c853` (green) | `roman-empire/style-guide.png` |
| Dragonball | `#00c2ff` (cyan) | `#e6391b` (red) | `#fdc82e` (gold) | `#1e3a8a` (navy blue) | `dragonball/style-guide.png` |

## 6. Next

Once sprints 3 and 4 are done, this feature joins the general MVP plan roadmap (section 6) as its own line item (see the row added to the table).
