# SideQuest

Desktop app that shows a mascot during idle time, prompting quick quests — 7 bundled sides today (fitness, language learning, coding practice, and more). See the [root README](../README.md) for the full picture.

![SideQuest demo](packages/app/assets/demo/sidequest-demo.gif)

## Installing the app (end users)

Download the latest release from the [GitHub Releases page](../../releases):

- **macOS**: `SideQuest-x.x.x-mac-arm64.dmg` (Apple Silicon) or `SideQuest-x.x.x-mac-x64.dmg` (Intel) → open the DMG, drag the app into `Applications`. The app isn't signed yet (no paid Apple Developer account at this stage), so macOS Gatekeeper will block the first launch ("app is damaged" or "unidentified developer"): **right-click the app → "Open"** (instead of double-clicking), then confirm. Only needed on the very first launch.
- **Windows**: `SideQuest-x.x.x-win-x64.exe` (installer) or the `portable` build. Windows SmartScreen shows a similar warning (unsigned app) → "More info" → "Run anyway".
- **Linux**: `SideQuest-x.x.x-linux-x86_64.AppImage` → `chmod +x` then run it directly, or the `.deb` via `sudo dpkg -i`.

## Structure

- `packages/core` — pure business logic (scheduler, SQLite storage, quest sides), no Electron dependency.
- `packages/app` — Electron app: tray (menu bar), mascot overlay, dashboard.

## Prerequisites (macOS)

- Node.js 22+ (check with `node --version`)
- Xcode Command Line Tools (needed to compile `better-sqlite3`): `xcode-select --install` if not already installed

## Setup

```bash
corepack enable
pnpm install
pnpm approve-builds --all   # allow native compilation of better-sqlite3 and Electron's download
```

## Testing `core` (business logic)

```bash
# Unit test suite (scheduler, storage, quest plans)
pnpm test

# Watch the scheduler run in real conditions (1 quest every 3s, Ctrl+C to stop)
cd packages/core && pnpm demo

# Compile to JS (type-checks the codebase) — required before running the app
pnpm build
```

## Testing the Electron app (tray + overlay)

```bash
cd packages/app
pnpm start
```

You should see an icon appear in the macOS menu bar. Click it to open the menu:

- **"Trigger a quest now"** → shows the mascot overlay immediately (no need to wait for the default 30-minute interval).
- The overlay shows the mascot, a quest, and two buttons ("Done" / "Skip").
- **"Quit"** actually quits the app (just closing the overlay window doesn't — it stays running in the tray).

## ⚠️ Heads-up: shared native module (better-sqlite3)

`core` (tested under plain Node) and `app` (runs under Electron) share the same `better-sqlite3` dependency, but Electron bundles a different Node ABI internally. Running the app (`pnpm start` in `packages/app`) recompiles that module for Electron's ABI — which can then make `pnpm test` in `core` fail with a `NODE_MODULE_VERSION` mismatch.

**If that happens**, from the repo root:

```bash
pnpm run fix:native-modules
```

This cleanly reinstalls the native dependencies for plain Node. You can then run `pnpm test` again normally. You only need to do this round-trip when alternating between testing `core` and running the app — not every single time.

## Packaging the app (local build)

```bash
cd packages/app
pnpm run dist:mac    # .dmg + .zip — requires macOS
pnpm run dist:win    # .exe (nsis) + portable — buildable from any OS
pnpm run dist:linux  # .AppImage + .deb — buildable from any OS
```

Artifacts land in `packages/app/release/`. No code signing configured at this stage (no Apple/Windows certificate) — see the Gatekeeper/SmartScreen warnings in the install section above.

On GitHub, pushing a `vX.Y.Z` tag triggers `.github/workflows/release.yml`: automatic build on macOS/Windows/Linux and publishing to a [GitHub Release](../../releases) with all artifacts attached.

## Sprints shipped

- [x] Sprint 1 — Monorepo skeleton + `core` (scheduler, storage, sport-basic side, tests)
- [x] Sprint 2 — Minimal Electron app (tray + overlay, mascot + exercise + done/skip buttons)
- [x] Sprint 3 — Dashboard (settings, history, charts, light/dark theme)
- [x] Sprint 4 — Gate mode (gate/mixed + honor-system debt of skipped sessions)
- [x] Sprint 5 — Packaging & distribution (electron-builder, GitHub releases)
