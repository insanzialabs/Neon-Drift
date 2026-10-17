# NEON DRIFT — AFTERHOURS RUN

An original browser-local 3D endless highway racer built with Vite, TypeScript, Three.js and Web Audio. No backend, sign-up or remote assets.

## Run

Requires Node.js 20.19+ or 22.12+ and npm.

```sh
npm install
npm run dev
```

Open the printed localhost URL. `npm run build` produces `dist/`; deploy that directory to a static host. For a subdirectory host, configure Vite's `base` accordingly. `npx vite preview` serves a production build locally.

## Play

On the garage screen, press any key or click/tap anywhere to unlock audio and race. **Ignite the night** also starts the run; menu settings and **Watch showcase** retain their own actions. The start key does not also steer, boost, or pause the game. Arrow keys or A/D change lanes; hold Space to boost using ion reserve. P or Escape pauses/resumes. Touch: visible left/right buttons, hold Boost, or swipe the road. The crash screen supports instant retry without reloading assets; Back to Garage returns to the menu. A lane change takes time, so commit before traffic reaches you.

Collect rotating ion cells for +28 energy / +100 score. Close passes award 250 × streak and +14 energy. Safe passes break the close-pass streak. Energy also regenerates slowly. Increasing base speed changes the rhythm of the endless traffic. Skyline, tunnel and bridge repeat every 1,260 world units. Each traffic row has one vehicle and two open lanes with generous approach time.

**Watch showcase** drives a deterministic example with the same physics and collision rules. It is clearly labeled and cannot save best scores. Best score, music, SFX and quality settings use only localStorage; blocked storage does not prevent play. The user-supplied WebM soundtrack starts with gameplay by default; MUSIC toggles it and remembers your choice. It pauses with the run, resumes from its position, and restarts on retry. SFX remains independent. The recording is streamed through an HTML audio element, so the 6.1 MB file is not decoded into Web Audio memory or loaded before the start gesture. No device motion permissions are requested.

## Art direction and architecture

Indigo streets, mint/cyan expressway lighting, magenta architecture and amber vehicle details. Original Vanta GT geometry includes a beveled polygon body, canopy, wheels/hubs, spoiler, front/rear lamps and boost exhaust. Canvas-generated facades/billboards, subtle road reflection geometry, fog, rain, sky and bridge cables create the city. No Blender installation was available; all 3D art is generated locally using Three.js.

- `src/game.ts`: seeded traffic pool, collision/close-pass envelopes, energy, progression and lifecycle.
- `src/models.ts`: vehicle models, material helpers and Canvas signage.
- `src/world.ts`: pooled 11-chunk road/city, merged static geometry, traffic model pool and chase camera.
- `src/audio.ts`: gesture-unlocked WebM playback, synthesized SFX, gain ramps and remembered mute controls.
- `src/main.ts`: input, overlays, persistence, HUD and render lifecycle.
- `src/style.css`: responsive desktop/portrait interface and reduced-motion styles.

One bounded animation loop; bounded traffic/chunks/pickups; static geometry merged by material. No per-frame asset creation. Pixel ratio is capped at 1.75 (Lite: 1); Lite removes rain. Reduced-motion disables camera boost widening and animated rain. Window blur or tab hiding pauses play. WebGL setup failure/context loss shows a reconnect explanation. Restart is allocation-light and does not rebuild the scene.

## Verify

```sh
npm run typecheck
npm run lint
npm test
npm run build
# with npm run dev -- --port 5174 running, and installed Chrome:
npm run test:browser
# focused soundtrack test (starts/stops its own local preview and Chrome):
npm run test:audio
```

Browser QA captures desktop/390×844 screenshots under `qa/`, checks pause/resume, steering input, boost input, a natural collision, retry, showcase, mobile controls and context-loss messaging. Logic tests check collision boundaries, genuine close-pass scoring, restart, pause, lane bounds, boost and scenery cycling. See `qa/browser-report.json` for the latest browser result and `REEL_CAPTURE_GUIDE.md` for capture instructions.

## Practical limits

Stylized mesh reflections replace real-time ray tracing; emissive colors replace expensive bloom. Collision uses deterministic arcade envelopes rather than rigid-body physics. Rain is stylized particles. The game is endless, so there is no finish/win screen. The user-supplied commercial recording has no verified redistribution license; see ASSET_CREDITS.md. No real tilt controls are included. Graphics quality is manually selectable and defaults to Lite on devices reporting four or fewer CPU cores. A 60fps desktop target is a goal, not a verified guarantee across devices; physical phone GPU performance and audio perception need device testing. Node/Vite build may report a large main-chunk advisory because Three.js is bundled locally. WebGL context recovery reloads the app and does not restore the interrupted run.

Implementation references: Three.js official guidance on [merging static geometry](https://threejs.org/manual/pages/optimize-lots-of-objects.html) and [responsive drawing-buffer sizing](https://threejs.org/manual/pages/responsive.html) informed mesh batching and the capped pixel ratio.
