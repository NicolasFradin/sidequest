# Branding & Style Guide

This folder centralizes the project's reference visual assets, **organized by global theme (skin)** — see [`docs/plan-theme-global.md`](../plan-theme-global.md) for the feature plan, and `docs/plan-mvp-sidequest.md` section 9 for the base design tokens (palette, typography, components).

## Structure

All 4 themes now have their colors **and** their mascot(s) integrated into the app (`app/assets/mascots/`, dynamically selected based on the active theme in the dashboard — `MASCOTS_BY_THEME` in `app/src/dashboard/renderer.js`).

- `miami-80s/` — default theme, Miami Vice / GTA Vice City style.
  - `style-guide-dark.png` / `style-guide-light.png` — reference style guide, dark/light variants.
  - `mascot-ronnie-coleman.png`, `mascot-miami-80s.png`, `mascot-arnold-80s.png` — 3 mascots integrated into the app.
- `military-camo/` — "1980s Military" theme. Currently the only theme with a distinct light/dark variant (piloted in sprint 5, see `plan-theme-global.md`): dark = forest camo, light = desert camo ("Desert Ops").
  - `style-guide-dark.png` (forest camo) / `style-guide-light.png` (desert camo) — reference style guides.
  - `mascot-sergeant.png` (forest) and `mascot-sergeant-desert.png` (desert) — 2 images for the same logical mascot (`sergeant`), display automatically resolved based on light/dark mode (`MASCOT_LIGHT_VARIANTS` in `renderer.js`), not a separate choice in the selector.
- `roman-empire/` — "Roman Empire" theme.
  - `style-guide.png` — reference style guide.
  - `mascot-roman_empire.png` — integrated mascot.
- `dragonball/` — "Dragonball" theme.
  - `style-guide.png` — reference style guide.
  - `mascot-dragonball.png` — integrated mascot.

## Intended use

These images are the source for:
- The dashboard's accent colors per theme (`app/src/dashboard/style.css`, `[data-visual-theme]` selector)
- The mascot selector in the dashboard, filtered by active theme (`app/src/dashboard/renderer.js`)
- The sprites shown in the mascot overlay (`app/src/overlay/renderer.js`)
- Tray and app icons (resized variants to prepare: 16x16, 32x32, 256x256 for Electron packaging) — not done yet, every mascot only has a single source resolution for now

Any new mascot added to a theme must follow the 8-bit/16-bit pixel-art style and the matching style guide's color palette.
