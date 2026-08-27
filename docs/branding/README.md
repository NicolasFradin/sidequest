# Branding & Style Guide

This folder centralizes the project's reference visual assets, **organized by pack** — see [`docs/plan-marketplace-packs.md`](../plan-marketplace-packs.md) for the pack model (`source: "bundled" | "imported" | "custom" | "generated"`), [`docs/plan-theme-global.md`](../plan-theme-global.md) for the global visual-theme (skin) system, and `docs/plan-mvp-sidequest.md` section 9 for the base design tokens (palette, typography, components).

`SideQuest-logo.png` (the app's own logo, used in the README and the dashboard sidebar) stays at the top level — it isn't tied to any one pack.

## Structure

- `sidequest/` — the app's own default mascot, used as the fallback for any custom/imported/AI-generated pack that doesn't carry its own mascot (see `plan-marketplace-packs.md` § 3.2/3.8). Shipped at runtime as `app/assets/mascots/sidequest.png`.
  - `mascot-sidequest.png` — source art.
- `sidegym/` — assets for the **SideGym** bundled pack (`sport-basic.json`). SideGym itself has no dedicated mascot yet (falls back to the active global mascot); what lives here are its 4 **visual themes (skins)** — `visualTheme` is a dashboard-wide setting today, but the actual style-guide/mascot art was designed against this pack's fitness-coach identity, so it's grouped under it rather than floating at the top level. All 4 themes have their colors **and** their mascot(s) integrated into the app (`app/assets/mascots/`, dynamically selected based on the active theme in the dashboard — `MASCOTS_BY_THEME` in `app/src/shared/mascots.js`).
  - `miami-80s/` — default theme, Miami Vice / GTA Vice City style.
    - `style-guide-dark.png` / `style-guide-light.png` — reference style guide, dark/light variants.
    - `mascot-ronnie-coleman.png`, `mascot-miami-80s.png`, `mascot-arnold-80s.png` — 3 mascots integrated into the app.
  - `military-camo/` — "1980s Military" theme. Currently the only theme with a distinct light/dark variant (piloted in sprint 5, see `plan-theme-global.md`): dark = forest camo, light = desert camo ("Desert Ops").
    - `style-guide-dark.png` (forest camo) / `style-guide-light.png` (desert camo) — reference style guides.
    - `mascot-sergeant.png` (forest) and `mascot-sergeant-desert.png` (desert) — 2 images for the same logical mascot (`sergeant`), display automatically resolved based on light/dark mode (`MASCOT_LIGHT_VARIANTS`), not a separate choice in the selector.
  - `roman-empire/` — "Roman Empire" theme.
    - `style-guide.png` — reference style guide.
    - `mascot-roman_empire.png` — integrated mascot.
  - `dragonball/` — "Dragonball" theme.
    - `style-guide.png` — reference style guide.
    - `mascot-dragonball.png` — integrated mascot.
- `sidecat/`, `sidetama/` — reserved for those packs' own mascot art once it exists (see the bundled-mascot path-resolution gap noted in `plan-community-packs.md`). No folder yet — nothing to put in it until that art ships.

## Intended use

These images are the source for:
- The dashboard's accent colors per theme (`app/src/dashboard/style.css`, `[data-visual-theme]` selector)
- The mascot selector in the dashboard, filtered by active theme (`app/src/dashboard/renderer.js`)
- The sprites shown in the mascot overlay (`app/src/overlay/renderer.js`)
- The default mascot for packless custom/imported/AI-generated packs (`sidequest/mascot-sidequest.png`)
- Tray and app icons (resized variants to prepare: 16x16, 32x32, 256x256 for Electron packaging) — not done yet, every mascot only has a single source resolution for now

Any new mascot added to a theme must follow the 8-bit/16-bit pixel-art style and the matching style guide's color palette.
