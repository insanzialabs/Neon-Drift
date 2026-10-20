# Skill expansion verification — 2026-10-20

## Focused audit (approximately 20% of the work)
The existing production browser suite passed before changes: desktop/mobile starts, real collisions, pause, modal keyboard focus, retry, pace choice, reduced-motion loading, discovery assets and showcase record isolation. Baseline screenshots and report are retained here with the `baseline-` prefix. No replacement art direction or engine rewrite was needed.

The high-value gaps were limited player decisions between obstacles, no finite successful run, shallow persistent skill rewards and no earned special move in Sonic. New controls introduced two visual overlaps during review; the final HUD separates dash/jump controls and speed/draft telemetry. Existing suite was rerun after integration and passed.

## Implemented innovation (approximately 80%)
Earned special moves with resource/timing tradeoffs; a finite 60-second mode with medals; three skill badges; two cosmetic unlocks; persistent collections separated by pace; explicit success/retry feedback; new synthesized sounds and procedural effects. All rewards are local, with no daily streaks, account gate or online leaderboard. Existing identities, controls, forgiving pace, core art and music preferences are retained.

## Executed checks
- 12 unit/regression tests passed (`npm test`). Real keyboard steering banks and releases a slipstream surge. Model tests verify free energy, single release, hit reset, honest medal thresholds, demo exclusion, terminal state and retry.
- Production build passed. Neon also runs TypeScript and ESLint; Sonic runs module syntax checks.
- Cross-game production Chrome checks: format selection and persistence, locked cosmetics, 320×740 and 390×844 portrait / 844×390 landscape menus, complete 60-second showcase, clearly labelled demo result, no demo reward storage, successful-finish retry, real skill effects, mobile HUD/control non-overlap.
- A clearly identified prior-save fixture checks record display, unlocked style selection and persistence after reload. Fixtures are test setup, not evidence of an earned gameplay achievement.
- Existing audio browser checks passed for both games, including decoded media playback, gesture unlock and pause/resume/toggles. New SFX have distinct synthesis envelopes; speaker mix is not assessed headlessly.
- Canonical URLs, crawl files, favicon and VideoGame/FAQ structured data retained. Visible help and metadata now explain the new mechanics. Search indexing/rich results are not claimed.

## Artifacts and reproduction
See `report.json`, `01-menu.png`, `02-skill-play.png`, `03-challenge-result.png`, `04-collection.png`, `05-mobile-play.png` and responsive menu captures in this directory. `03` is a labelled showcase, never a player achievement. Build both games, then run `npm run test:evolution` from `games/neon-drift` (installed Chrome required). `npm run test:upgrade` verifies the existing cross-game flows.

## Limits
No physical-phone, sustained GPU/thermal or audible speaker test; no retention study or public search indexing verification. The 60-second browser finish uses the normal-physics showcase; earned medal/badge rules are verified in deterministic model tests. Cosmetic persistence uses explicitly seeded prior-save fixtures. No live deployment was performed. Existing media/IP licensing notes in ASSET_CREDITS.md remain applicable. Neon retains its existing Three.js bundle-size warning (~552 kB minified JS, ~145 kB gzip); the new effects add no downloaded assets or rendering dependencies.
