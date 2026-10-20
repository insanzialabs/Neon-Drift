# Flagship game upgrade — 20 October 2026

This is an implementation and verification report, not a claim that retention or player preference has been proven. No live deployment was performed. Each project's `dist/` is ready for its existing static hosting workflow.

## Audit and resulting changes

1. **Neon gameplay — visually strong; rewards needed repair.** `qa/upgrade/before-play.png` shows the original car/city/HUD. Source and model checks (not screenshots alone) established that ordinary adjacent lanes were outside the near-miss envelope, empty boost could stutter, and the underglow stayed at the road center. The new model counts genuine completed passes, caps ×5 rewards, repairs boost gating, follows the car with its lighting and adds one recoverable armor charge.
2. **Sonic menu — recognizable; shallow navigation.** `qa/upgrade/before-menu.png` shows the old canvas-only title. It lacked visible pause/settings, pace choice, goals and a clear studio return path. The new responsive HTML interface preserves the pixel identity and gives each action an accessible control.
3. **Sonic phone play — poor.** `qa/upgrade/before-mobile.png` shows gameplay confined to a small letterboxed strip. The new camera and full-height presentation keep the character, approach space, score and large Jump control readable. The first input starts a run without also spending a jump.
4. **Upgraded menu → play — verified healthy.** `01-desktop-menu.png`, `02-desktop-play.png`, `menu-390x844.png`, `menu-320x740.png`, `menu-844x390.png`, and `05-mobile-play.png` show desktop, phone and short-landscape layouts. Pace choice keeps separate records; help explains actual mechanics. Assets load locally.
5. **Upgraded pause → crash → retry — verified healthy.** Browser checks freeze score during pause, contain keyboard focus, resume by keyboard, let real collisions end runs and retry with R. `03-crash.png` records the result state. No synthetic score or forced crash is injected.
6. **Showcase / reduced motion / discovery — verified with limits.** `04-showcase.png` and `06-reduced-motion.png` show labeled autoplay and static-motion options. Showcase runs normal collision rules and cannot write best scores. Metadata, schemas, robots, sitemap, text summary, share image and favicon are checked locally. Neon context loss has a recovery message.

All paths above are relative to each game's `qa/upgrade/` directory. Screenshots were captured in this upgrade and inspected. Screenshots alone do not establish accessibility conformance, performance, control fairness or retention; model tests and browser interactions provide the additional evidence described below.

## Design decisions

- Sonic remains a ring-collecting, badnik-jumping endless runner with its existing characters and city. A Canvas 2D renderer replaces the fixed letterboxed KAPLAY presentation; engine-specific originals are retained in `legacy/kaplay/`. Active minified JS falls from about 207 KB to about 18 KB.
- Sonic gets a 140ms landing buffer, variable jump height, descending-only stomps, capped bounce chains, authored ring arcs, a one-charge ring shield, speed/spacing limits, Arcade/Chill, five score ranks and three per-run goals. Particles/trails are bounded. No paid shortcuts or engagement penalties.
- Neon remains the original chase-camera 3D highway racer. Arcade/Cruise, armor/repair, finite skill multipliers, three real goals, ranks, keyboard retry and fixed-step simulation improve the core loop without replacing the city or supplied soundtrack.
- Both have native how-to-play dialogs, separate sound/music preferences, auto-pause, meaningful touch controls, keyboard equivalents, reduced-motion handling, focus containment, bests per pace, error states and transparent demo labels.
- Both retain Insanzia favicon and link back to the studio's Experiments collection. Real text, canonical/social tags, VideoGame and matching FAQ schema, local share images, sitemap, robots and llms.txt support discovery. They are not guarantees of rankings or answer-engine inclusion.

## Validation

- Neon: TypeScript, ESLint, eight model tests and production build passed.
- Sonic: JavaScript syntax checks, six model/audio-race tests and production build passed. Updated Vite installation reported zero vulnerabilities; unused KAPLAY dependency removed.
- The shared suite `npm run test:upgrade` from Neon starts both production previews and Chrome, checks desktop/320px/390px/short-landscape layouts, input/lifecycle, actual crashes, keyboard modality, showcase isolation, motion settings and local discovery assets.
- Per-game reports include the measured short headless desktop frame sample. Approximately 60fps in that sample does not establish sustained physical-phone or thermal performance.
- Existing Neon soundtrack and optional Sonic music playback/pause/resume/mute are each covered by `npm run test:audio` in their own directory. The studio directory technology tag was corrected to Canvas 2D; no site layout or hosting changes were made.
- The original supplied media remains local. Sonic art/font/music and Neon's supplied recording have unverified redistribution rights. No newly downloaded third-party art or recordings were added; original synthesis supplies new feedback sounds. See ASSET_CREDITS.md.

## What remains outside verification

Physical devices, assistive-technology speech output, audible mix quality, prolonged heat/battery behavior, analytics-backed replay/retention and public search indexing were not measured. No online leaderboard is implied; bests are local. Existing Sonic custom-domain DNS needs separate hosting verification. No infrastructure or DNS settings were modified.

## References used

- Game accessibility guidelines: simple controls, adjustable challenge/speed and alternatives (https://gameaccessibilityguidelines.com/).
- Input-buffering design discussion: short windows improve responsiveness without masking player timing (https://www.gamedeveloper.com/design/opinion-dealing-with-designer-input-latency).
- Google AI/search guidance: crawlable, useful text and accurate structured data; no special AI-only markup is required (https://developers.google.com/search/docs/appearance/ai-features).

No claim of “world's best” or proven addictive quality is made. Further human playtesting should tune the initial speed, collision tolerance, ring-arc height and shield frequency using completion/retry feedback rather than manipulative retention mechanics.

Recovery feedback uses outlines, sparks and text rather than high-frequency character flashing.
