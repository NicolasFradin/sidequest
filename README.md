<p align="center">
  <img src="docs/branding/SideQuest-logo.png" alt="SideQuest — Code. Quest. Grow." width="480">
  <br>
  <strong>SideQuest — an idle-time marketplace: micro-quests for your desktop while you wait</strong>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue?style=flat-square" alt="License"></a>
  <a href="../../releases"><img src="https://img.shields.io/badge/platforms-macOS%20%7C%20Windows%20%7C%20Linux-informational?style=flat-square" alt="Platforms"></a>
</p>

**You ship code. Your body ships pain.** Stand up. Stretch your back. Shake out your legs. It takes 30 seconds and your body will stop screaming at you by 6pm.

SideQuest sits in your tray and pops up a mascot with a quick micro-quest whenever you've been idle for a while — or, if you're running Claude Code, exactly when Claude finishes answering and you're staring at the screen waiting on nothing. It's built to grow into a marketplace of idle-time quests, not just one: whatever fits in 30 seconds between two prompts, including quests proposed by the community down the line. See the [Roadmap](#roadmap--major-next-steps) below.

### The quest packs

| Pack | Status | |
|---|---|---|
| 🏋️ **SideGym** — fitness | ships today | **You ship code. Your body ships pain.** Stand up. Stretch your back. Shake out your legs. It takes 30 seconds and your body will stop screaming at you by 6pm. |
| 🐱 **SideCat** — look after your cat | ships today | **Your cat exists even when you're coding.** A pet, a bowl, 30 seconds. It grows with your streak, not your guilt. |
| 🐣 **SideTama** — grow a tamagotchi | ships today | **Your tamagotchi doesn't judge your commits, it grows with them.** 30 seconds, one more level. |
| 🦜 **SideParrot** — language learning | planned | **You ship code. Your vocabulary ships rust.** One phrase, one flashcard, one rep while the build runs. It takes 30 seconds and that language you keep meaning to learn actually sticks. |
| 🧘 **SideYoga** — relaxation | planned | **You ship code. Your shoulders ship tension.** Breathe. Unclench your jaw. Roll your neck. It takes 30 seconds and you'll stop carrying your inbox in your spine. |
| 🎮 **SideCodingGame** — coding practice | planned | **You ship code. Your skills ship rust.** One kata, one riddle, one rep while the tests run. It takes 30 seconds and you'll actually remember it next time you need it. |
| 🧓 **SideMamie** — check in on your grandma | planned | **Your commits ship. Your calls to mamie don't.** A text, a call, 30 seconds between two prompts. She won't remember your last PR, but she'll remember you thought of her. |

SideGym, SideCat and SideTama ship in the app today — SideParrot/SideYoga/SideCodingGame/SideMamie are names reserved for what's next. Build your own pack from scratch, import a JSON file, or generate one with AI right from the packs gallery — see below.

## How it works

- A **timer** fires every N minutes (configurable) and shows a mascot with a random quest from your active pack.
- A **Claude Code hook** (optional) fires instead of or alongside the timer — at the end of Claude's response, at the start of your turn, or only if Claude is still working after a few seconds. No API keys, no network calls: just a local HTTP hook SideQuest installs into `~/.claude/settings.json` for you.
- Three modes: **soft notification** (skip whenever), **hard gate** (can't dismiss without doing the quest — this can also hold your Claude Code hook open until you're done), or **mixed** (soft until you rack up a debt of skipped sessions, then it gates).
- A **packs gallery** in the dashboard: browse the bundled packs, build your own from scratch, import a JSON file, or **generate one with AI** — your own Anthropic/OpenAI API key, the Claude Code/Codex CLI you already have installed (no key ever touches the app), or a fully local Ollama model, all optional and off by default. Only one pack is active at a time; each tracks its own XP and level as you use it. Export/import as JSON to share a pack with someone else.
- Give any pack **its own mascot** right in its editor — pick one of the bundled ones or upload your own image, no JSON editing needed.

If it saves your back even once, [leave a star](../../) — it helps other Claude Code users find this.

## Install

Download the latest build from the [**Releases**](../../releases) page:

| OS | File |
|---|---|
| macOS | `SideQuest-x.x.x-mac-x64.dmg` |
| Windows | `SideQuest-x.x.x-win-x64.exe` (or the `portable` build) |
| Linux | `SideQuest-x.x.x-linux-x86_64.AppImage` (or the `.deb`) |

The app isn't code-signed yet (no paid developer certificate at this stage), so your OS will warn you on first launch — that's expected, the app is open source and the code is right here:

- **macOS**: right-click the app → **"Open"** (instead of double-clicking), then confirm.
- **Windows**: SmartScreen → "More info" → "Run anyway".
- **Linux**: `chmod +x SideQuest*.AppImage` and run it directly, or `sudo dpkg -i` for the `.deb`.

## Usage

Once installed, **SideQuest runs in the background** — no window opens on launch (except the very first time, to pick your settings). Find it in:

- the **macOS menu bar** or the **Windows/Linux system tray** — click for the menu (open dashboard, trigger a quest now, quit);
- the **Dock/taskbar**, if your OS shows it there.

A quest pops up automatically every 30 minutes by default (configurable in the dashboard). To wire it up to Claude Code instead of (or alongside) the timer, open the dashboard's **"Claude Code integration"** card and hit activate.

## Build from source / contribute

The app's code lives in [`sidequest/`](sidequest/) — see [`sidequest/README.md`](sidequest/README.md) for dev setup, running tests, and packaging the app yourself.

```
sidequest/
├── packages/core/   # pure business logic (scheduler, SQLite storage, quest packs) — no Electron dependency
└── packages/app/    # Electron app: tray, mascot overlay, dashboard
```

Design docs live in [`docs/`](docs/) — see [`docs/plan-mvp-sidequest.md`](docs/plan-mvp-sidequest.md) for the original product plan, [`docs/plan-marketplace-packs.md`](docs/plan-marketplace-packs.md) for the packs gallery/import/XP design, and [`docs/plan-llm-pack-generation.md`](docs/plan-llm-pack-generation.md) for AI pack generation.

## Roadmap — major next steps

- **Smarter hook debounce** — the "Claude is still thinking" trigger currently waits a fixed 8 seconds before showing a quest. Next: anticipate actual turn length instead (count `PreToolUse`/`PostToolUse` calls as a signal, or learn from real turn-duration history) rather than a hardcoded delay.
- **Pause during an active session** — don't interrupt mid-typing; only trigger during genuine idle time, not just "Claude is between turns."
- **Codex support** — investigate whether Codex's hook mechanism (if any) can plug into the same local server, alongside Claude Code.
- **Animated mascots** — the overlay currently shows static PNGs; idle/quest/done animation is next (CSS keyframes, sprite frames, or a [Rive](https://rive.app) state machine, depending on how much time we want to sink into it).
- **Marketplace of quests** — SideGym, SideCat and SideTama ship today. Pack import/export (JSON) and AI generation already work as stepping stones toward an installable pack registry (`sidequest install sidegym`, `sideparrot`, `sideyoga`, `sidecodinggame`...), followed further out by a full marketplace open to third-party/community-submitted quests.
- **Unsigned-app polish** — investigate the intermittent macOS Dock icon glitch (likely tied to running unsigned), and eventually get a real code-signing certificate so installs don't need the Gatekeeper/SmartScreen workaround above.

Full sprint-by-sprint history and open questions live in [`docs/`](docs/).

## FAQ

**Is this an Anthropic product?** Nope. Personal project, not affiliated.

**Does it phone home?** By default, no — zero network calls, zero telemetry, everything (settings, history, packs) stored locally in SQLite. The one opt-in exception: AI pack generation. Turn it on in Settings and pick a remote provider (an Anthropic/OpenAI API key, or a non-local Ollama server) and *that specific action* calls out to generate a pack — nothing else in the app does, and it stays off until you configure it. The Claude Code integration itself stays a local HTTP hook on `127.0.0.1`, unrelated to this.

## Disclaimer

The exercises are quick desk-friendly movements, not a training program. They are not a substitute for professional fitness or medical advice — please use correct form and listen to your body.

If you feel any pain or discomfort, stop immediately and consult a physiotherapist or doctor. Do not exercise through injury. The authors of this project accept no responsibility for harm resulting from improper exercise.

## License

Apache 2.0 — see [LICENSE](LICENSE). Inspired by [claude-gym](https://github.com/477-Studio/claude-gym) (gentle notifications, local-only) and `workout-gate` (real session blocking).
