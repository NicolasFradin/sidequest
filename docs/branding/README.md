# Branding & Style Guide

This folder centralizes the project's reference visual assets, **organized by side** — see [`docs/plan-marketplace-sides.md`](../plan-marketplace-sides.md) for the side model (`source: "bundled" | "imported" | "custom" | "generated"`), [`docs/plan-theme-global.md`](../plan-theme-global.md) for the global visual-theme (skin) system, and `docs/plan-mvp-sidequest.md` section 9 for the base design tokens (palette, typography, components).

`SideQuest-logo.png` (the app's own logo, used in the README and the dashboard sidebar) stays at the top level — it isn't tied to any one side.

## Structure

- `emblem/` — the app's square "S" badge mark (distinct from the horizontal `SideQuest-logo.png` wordmark above), source art at native resolution in 3 variants:
  - `sidequest-emblem-color.png` — full-color version, resized to 1024×1024 and used as `app/build/icon.png` (the source electron-builder generates the macOS `.icns`/Windows `.ico`/Linux app icons from).
  - `sidequest-emblem-black.png` — black-on-transparent version, resized to 256×256 and used as `app/assets/tray-icon.png` (the menu bar/system tray icon — already loaded with `setTemplateImage(true)` in `main/index.js`, so macOS auto-inverts it for light/dark menu bars; the color doesn't matter for that purpose, black is just the standard convention).
  - `sidequest-emblem-white.png` — white-on-transparent version, kept as spare source art (not currently wired into the app — template mode already covers dark menu bars from the black asset alone).
- `sidequest/` — the app's own default mascot, used as the fallback for any custom/imported/AI-generated side that doesn't carry its own mascot (see `plan-marketplace-sides.md` § 3.2/3.8). Shipped at runtime as `app/assets/mascots/sidequest.png`.
  - `mascot-sidequest.png` — source art.
- `sidegym/` — assets for the **SideGym** bundled side (`sport-basic.json`). SideGym itself has no dedicated mascot yet (falls back to the active global mascot); what lives here are its 4 **visual themes (skins)** — `visualTheme` is a dashboard-wide setting today, but the actual style-guide/mascot art was designed against this side's fitness-coach identity, so it's grouped under it rather than floating at the top level. 3 of the 4 themes have their colors **and** their mascot(s) integrated into the app (`app/assets/mascots/`, dynamically selected based on the active theme in the dashboard — `MASCOTS_BY_THEME` in `app/src/shared/mascots.js`); the 4th ("Manga", see below) has colors only.
  - `miami-80s/` — default theme, Miami Vice / GTA Vice City style.
    - `style-guide-dark.png` / `style-guide-light.png` — reference style guide, dark/light variants.
    - `mascot-arnold-80s.png` — integrated mascot. `ronnie-80s` and `miami-80s` are also part of this theme's mascot set (`app/assets/mascots/`) but have no source file left in this folder.
  - `military-camo/` — "1980s Military" theme. Currently the only theme with a distinct light/dark variant (piloted in sprint 5, see `plan-theme-global.md`): dark = forest camo, light = desert camo ("Desert Ops").
    - `style-guide-dark.png` (forest camo) / `style-guide-light.png` (desert camo) — reference style guides.
    - `mascot-sergeant.png` (forest) and `mascot-sergeant-desert.png` (desert) — 2 images for the same logical mascot (`sergeant`), display automatically resolved based on light/dark mode (`MASCOT_LIGHT_VARIANTS`), not a separate choice in the selector.
  - `roman-empire/` — "Roman Empire" theme.
    - `style-guide.png` — reference style guide.
    - `mascot-roman_empire.png` — integrated mascot.
  - "Manga" theme (formerly "Dragonball") — no branding folder here anymore: the licensed mascot and its style-guide art were removed, the theme kept only its color palette (renamed in code) and now falls back to the default SideQuest mascot, same as any theme without a dedicated one.
- `sidecat/`, `sidetama/` — reserved for those sides' own mascot art once it exists (see the bundled-mascot path-resolution gap noted in `plan-community-sides.md`). No folder yet — nothing to put in it until that art ships.

## Intended use

These images are the source for:
- The dashboard's accent colors per theme (`app/src/dashboard/style.css`, `[data-visual-theme]` selector)
- The mascot selector in the dashboard, filtered by active theme (`app/src/dashboard/renderer.js`)
- The sprites shown in the mascot overlay (`app/src/overlay/renderer.js`)
- The default mascot for sideless custom/imported/AI-generated sides (`sidequest/mascot-sidequest.png`)
- Tray and app icons (`emblem/` above) — `app/build/icon.png` (app/Dock/installer icon, all platforms) and `app/assets/tray-icon.png` (menu bar/system tray)

Any new mascot added to a theme must follow the 8-bit/16-bit pixel-art style and the matching style guide's color palette.
