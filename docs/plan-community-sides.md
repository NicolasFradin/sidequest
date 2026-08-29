# Community side contributions — a lightweight, PR-based path

**Local repo**: `/Users/nicolas/perso/sidequest`
**Status**: documentation only, no code — written 2026-08-27 as Sprint 7 of [`plan-marketplace-sides.md`](plan-marketplace-sides.md), linked from the V1.5 row of [`plan-mvp-sidequest.md`](plan-mvp-sidequest.md) section 6.

## What this is (and isn't)

Today, adding a new bundled side to SideQuest — SideGym is the only one that shipped before this — requires zero registry/config changes, thanks to `listBundledSides()` (`packages/core/src/sides.ts`, added in `plan-marketplace-sides.md` Sprint 1): it scans every `*.json` file under `packages/core/src/exercises/` at load time. A side file dropped there is automatically discovered.

That mechanical fact is what makes a **PR-based contribution path** realistic without building any new infrastructure: a contributor adds a side file (and optionally a mascot image) to a pull request, a maintainer reviews it like any other code change, and once merged it ships in the next release.

This is **not** the same thing as:
- **V1.5**'s planned `sidequest install <side>` — a dynamic registry with a CLI, fetched at runtime without an app update. Doesn't exist. This PR path is a lightweight, git-native precursor to it.
- **V3**'s planned third-party marketplace — paid, with a formal review/publishing pipeline. This PR path is just... a normal GitHub PR, reviewed by a human the same way any other contribution is.

## How a contributor adds a side today

1. **Write the side JSON** — same declarative shape as `packages/core/src/exercises/sport-basic.json` or `sidecat.json`:
   ```json
   {
     "id": "sideparrot",
     "name": "SideParrot - Apprends une langue",
     "color": "#3ecfd6",
     "exercises": [
       { "id": "phrase-1", "label": "Répète une phrase à voix haute", "durationSec": 20, "category": "oral" }
     ]
   }
   ```
   `id` must be unique among bundled sides (it's the JSON filename minus `.json`, and the primary key `listBundledSides()`/`storage` use everywhere). `color` is optional — see `plan-marketplace-sides.md` § 3.5 for the fallback if omitted.
2. **Drop it in `packages/core/src/exercises/`**, named `<id>.json`. Nothing else to register — `listBundledSides()` picks it up.
3. **Mascot image, if any: currently a gap, not a supported path.** Every existing mechanism for a side's own mascot (`SideMascot.imagePath`, resolved to `file://...` in the overlay, decoded-to-disk on import) assumes an *absolute filesystem path* produced at runtime for imported/custom sides — there is no equivalent step today that turns a bundled side's mascot filename into a valid path (`packages/core` deliberately has no knowledge of `packages/app/assets/`). Until that's built (tracked in `plan-marketplace-sides.md` Sprint 4's log), a bundled side should ship **without** a `mascot` field — it'll correctly fall back to the user's globally-selected mascot, same as SideGym, SideCat, and SideTama do today. Don't add `mascot` to a contributed side JSON yet; it won't resolve. **Update, Sprint 8**: the exact `path.join(ASSETS_DIR, "mascots", ...)` resolution this gap needs now exists — built for a different call site (`dashboard:set-side-mascot-bundled`, letting a custom side borrow a bundled mascot image, § 3.8 of `plan-marketplace-sides.md`). Closing this specific gap (a bundled side's *own* JSON declaring its mascot) is now a small, well-understood change reusing that same pattern, not a from-scratch design — still not done, since no bundled side needs it yet.
4. **Open a PR.** A maintainer reviews it like any other code change — see Constraints below for what they should be checking.

## The key limitation to set expectations on

A side merged via PR only reaches users at the **next tagged release** — there's no dynamic registry, no hot-reload, no "install without updating the app." Compare with the **local JSON import** already shipped (`plan-marketplace-sides.md` § 3.2): a user importing their own side file gets it **instantly, offline, no release involved**. These are two different distribution paths serving different needs — import is for one person's own side right now, the PR path is for something meant to ship to everyone eventually.

## Constraints a reviewer should hold the line on

- **Declarative JSON only, never executable code.** This isn't a style preference — `packages/core/src/sides.ts`'s own comment on `loadSide()` states the rationale directly: it's what lets side creation be opened up to third parties at all without a JS-sandboxing security problem. A PR that tries to make a side do anything beyond `{id, name, color?, exercises: [...]}` is out of scope for this mechanism, full stop.
- **No CI schema-validation bot exists.** A malformed side JSON degrades gracefully today (`loadSide()` just does `JSON.parse` — a genuinely broken file throws at app startup, so a bad PR would be caught by `pnpm --filter @sidequest/app start` before merge, not by an automated check). Left as manual reviewer diligence for now — not worth building a bot for the current contribution volume.
- **No art-licensing requirement is enforced.** If a side ships an image later (once the mascot-path gap above is closed), the reviewer is the only check on whether the contributor actually has rights to it. Deliberately left as human judgment rather than a license-header convention, consistent with not over-building process ahead of actual need.

## Relationship to the rest of the roadmap

Nothing here contradicts or replaces `plan-mvp-sidequest.md` section 6 — V1.5 and V3 stay exactly as scoped there. This doc just describes what's *already possible*, today, with the tools Sprints 1–6 already built, while that heavier infrastructure remains unbuilt.
