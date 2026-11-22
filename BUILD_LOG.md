# BUILD_LOG — best-card-game-20261122-1826 — Ember Sigil

- Contest: best-card-game-20261122-1826, "Make the best card game", $50 (top 10 share: 1st $12 … 10th $3).
- Deadline: 2026-11-23 06:26 UTC (13:26 WIB). Results due 2026-12-07 18:26 UTC.
- Kit level: 36 (kit 0.1.0, build 98fe3e67b4f8). Suggested repo: `makefun-best-card-game-20261122-1826`.
- Account: @verren044 / GitHub verren044. Entry title: "Ember Sigil".

## Design

Original turn-based card battler, canvas 1280x720, no library, no network, no external
assets (all art is drawn shapes + system fonts, sounds are WebAudio blips).

- You are the Warden vs the AI Ash Herald. 30 HP each; mana starts at 1, +1 per turn to 10.
- 24-card decks (16 creatures, 8 spells) from a 15-card pool: 10 creatures (Ember Imp,
  Frost Wisp, Stone Whelp, Thorn Wolf, Gale Hawk, Cinder Knight, Tide Serpent, Moss Troll,
  Pyre Drake, Ember Golem) and 5 spells (Spark Bolt, Mending Light, Sigil Insight,
  Flame Wave, Ember Surge). Keywords: Guard (must be attacked first), Swift (attacks the
  turn played). Empty deck: fatigue 1, 2, 3… damage; a full hand burns the drawn card.
- Mouse: click a hand card to play it (Spark Bolt asks for a target), click a creature then
  an enemy creature/hero to attack, End Turn button. Keys: 1–7 play cards, Space ends the
  turn, P pause, M mute, R restart after a duel. Win count kept in localStorage.
- Screenshots: 4 real renders via `?shot=` + seed 7 — 1-start (title), 2-play (mid-duel,
  turn 8), 3-win (VICTORY in 15 turns), 4-loss (DEFEAT in 14 turns). All staged by playing
  real games forward with the autopilot (`game/src/shots.js`); win/loss shots replay biased
  duels until the wanted side wins.

## Files

- `main.ts` — copies game/ + screenshots/ to /output, writes dossier.json via vendored
  `vendor/makefun-game.ts` (kit copy, unchanged). Never rmSync's the output dir itself.
- `game/index.html`, `game/src/{config,random,world,render,input,shots,main}.js`
- `serve.ts` — kit's static server, unchanged. `shots.json` — the 4 shot queries.
- `screenshots/1-start.jpg` (33,949 B), `2-play.jpg` (54,244 B), `3-win.jpg` (53,514 B),
  `4-loss.jpg` (43,403 B) — all ≤256 KiB, 1280x720. `package.json` (`{"type":"module"}`).
- `README.md` (3 live badge lines from the requirements readme_template),
  `LICENSE` (MIT, SPDX first line).

## Practice / verification (all local, 2026-11-23 ~01:50 WIB)

- `node --check` passes on all 7 game modules + main.ts.
- Headless Chromium (Playwright) served via `node serve.ts`: all 4 `?shot=` scenes set
  `window.__shotReady`, zero console/page errors; screenshots visually checked (title,
  mid-duel table with both hands and boards, VICTORY, DEFEAT).
- Interactive smoke test: Begin the Duel → play a card → Space ends turn → Herald acts
  (AI timer), no errors.
- Logic simulation in Node (world.js only, no DOM): 200 full autopilot duels, all
  terminated (avg 15.9 turns, max 23); player-first wins 154/200 — first-player edge is
  real; bias check: win-bias 30/30, loss-bias 0/30 (shots land on the wanted screen).
- `main.ts` run twice into two dirs: `diff -r` clean — byte-identical output.
  Dossier 288,908 B, keys cover/images/schema/text.
- Bugs fixed during practice: (1) `MAX_MANA` missing import in render.js (crashed the
  frame loop); (2) fatigue damage never checked for a win + full-hand draws never burned
  the deck + autopilot counting a failed play as an action — together these stalled games
  forever with full boards/hands; fixed by checking over after the turn-start draw,
  burning draws on a full hand, and treating only successful plays/attacks as actions.
  (3) Player hero overlapped the hand — moved to bottom-left. (4) Negative HP shown on
  the loss screen — clamped at 0 for display.

## Not done by this build (parent's step)

- No GitHub repo created, no push, no submit — builder only, per task.
- Kit `check` / bundle not run here (needs the kit CLI + transcripts; parent handles it).
