# Katalog: notes for Claude

Katalog is a phone home-screen training log (lifting, climbing, max hangs, wrist/tendon work, handstands), ported from
the "Send Log" Claude artifact (v32). It is a static site on GitHub Pages: plain ES modules, **no build step**, data
on the device in IndexedDB.

The program context (goals, plan design, decisions and why) lives in the claude.ai Project "Train", in
`claude/sendlog-handoff.md` and `claude/sendlog-review-2026-11-06.md`. Read those for training questions, not this repo.

## How to work here (keeps chats cheap)

- **Read only the files the task needs.** Use the map below to pick them; don't read the whole tree, and never read
  `src/frozen/sim.js` (4,000 lines) unless the task is about the simulator itself.
- Before finishing: `npm test` (Node 22+, no install needed). All tests must pass.
- Commit in small steps with clear messages. Push to `main` publishes the site (GitHub Pages, ~1 min).
- Keep files under ~400 lines (a test enforces it). Split by responsibility, not by line count.
- `src/logic/` and `src/data/` must not touch the DOM: tests import them in Node.
- When you add, rename or delete a file under `src/`, `css/` or `icons/`, update `SHELL` in `sw.js` (a test checks)
  and bump `VERSION` there.

## Hard rules

- **Never commit personal training data.** The repo is public. Exports and real logs go in `local/` (git-ignored).
  Test fixtures are synthetic (`test/fixtures/make-synthetic.mjs`).
- **Training logic changes are deliberate.** The numbers live in `src/data/rules.js`; the Method tab is built from the
  same constants, so it always says what the code does. A rule change shows up in the snapshot test: re-run with
  `UPDATE=1 npm test` only when the change is intended, and say what changed in the commit message.
- **Frozen features** (`src/frozen/`: simulator/Build tab, Film a set, setup cues, strength balance, hard-sets grid,
  fast pull-ups): bug fixes only. `sim.js` stays byte-identical to the artifact unless the task is the simulator.
- **Data shape is a contract.** Backups are `{profile, sessions, body}`, exactly the artifact's shape, so files move
  between Katalog, the old artifact and Claude reviews. Don't rename or drop fields; add new ones only.

## File map

| Need to change... | Read |
|---|---|
| a progression number (jumps, %s, reps, gaps) | `src/data/rules.js` |
| how a lift progresses | `src/logic/progression.js` (+ `plan.js` for bar rounding) |
| pull-ups, row, a new session's rows | `src/logic/draft.js` |
| hangs, limit bouldering | `src/logic/climb.js` |
| wrist block, handstands | `src/logic/wrist.js` |
| what Today suggests, plan-day gaps, the floor | `src/logic/week.js` |
| fatigue/deload signals, plan end, PRs | `src/logic/status.js` |
| a plan, plan days, goals | `src/data/plans.js` |
| Method text | `src/data/playbook.js`, `src/data/compendium.js`, `src/data/refs.js` |
| a tab's layout | `src/tabs/<tab>.js` (Stats = `stats.js`) |
| a button's behaviour | `src/events/click.js` (inputs: `change.js`; backup: `backup.js`) |
| storage, import/export | `src/store/store.js`, `src/store/db.js` |
| timers, live session | `src/ui/live.js` |
| styles | `css/app.css`, `css/skins.css` |
| offline / install | `sw.js`, `manifest.webmanifest`, `src/pwa.js` |

Every module starts with a one-line comment saying what it holds. Directory roles:

- `src/core/` state (`S`, `REF`/`asOf`) and helpers. `src/data/` constants and text. `src/logic/` pure-ish training
  logic: functions read `S` and the "as of" date; `src/logic/engine.js` → `withLog({sessions, profile, date}, fn)`
  runs any of them on a given log without touching the app.
- `src/ui/` rendering helpers, `src/tabs/` one file per tab (Log is split into `log.js`, `log-form.js`, `limit.js`),
  `src/events/` listeners, `src/store/` IndexedDB, `src/frozen/` frozen features (Film a set and `sim.js` load only
  when opened).
- `pose/` MoveNet model for Film a set (must stay at the site root: `sim.js` fetches `pose/...` relative to the page).

## Data

- IndexedDB `katalog`: store `sessions` (keyPath `id`), store `kv` (`profile`, `body`). UI prefs and the in-progress
  draft stay in localStorage (`sl.tab`, `sl.ready`, `sl.draft`, `sl.skin`, `sl.mxbal`).
- A session: `{id, date "YYYY-MM-DD", type, created, day?, readiness, lifts:[{lift, role top|backoff|acc, sl:[{w, reps,
  tgt, st ""|ok|grind|miss, t?, vid?}], w, reps, sets, clean, ps?, pw?}], fingers, climb, wb, hs, wristPain, rpe,
  duration, bw, notes, live?, prs}`. Row fields `w/reps/sets/clean` are derived from `sl` (`deriveRow`).

## Tests

- `test/rules.test.js` one test per stated rule. `test/snapshot.test.js` pins every prescription for the synthetic log
  across dates and settings. `test/real.test.js` does the same for `local/backup.json` if present (your machine only).
- `test/structure.test.js` file sizes, imports, the service-worker list, no personal data. `test/sim.test.js` the
  simulator's own model checks (28/30; the two known failures are documented in the roadmap).

## Changelog

- 1.0.0 (2026-11-06): ported from Send Log v32. Same training logic; IndexedDB storage; backup file export/import;
  installable and offline; rules as data (Method text now matches the code in three places it didn't: top set ~89%,
  deadlift back-offs 2×4, RDL 55–60%).
