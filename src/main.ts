import "./style.css";
import { Run, beatAt, RUN_GOALS, driverRank } from "./game";
import { World } from "./world";
import { Sound } from "./audio";
import {
  medal,
  targets,
  earned,
  readBook,
  challengeResult,
  badgeDescriptions,
} from "./progression";
const app = document.querySelector<HTMLDivElement>("#app")!;
const stored = (k: string, f: string) => {
  try {
    return localStorage.getItem(k) ?? f;
  } catch {
    return f;
  }
};
const save = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* Storage can be disabled. */
  }
};
app.innerHTML = `<div id="scene" aria-label="3D racing game"></div><div class="vignette"></div><header><a class="brand" href="./" aria-label="Neon Drift home"><span class="brand-icon">∕∕</span> INSANZIA <b>ARCADE</b></a><div class="live"><i></i> AFTERHOURS NETWORK <span> / 04</span></div><div class="tools"><button id="music" aria-label="Toggle music">MUSIC OFF</button><button id="sound" aria-label="Toggle sound effects">SFX ON</button><button id="quality" aria-label="Toggle graphics quality">HIGH</button><button id="help" aria-label="How to play">?</button></div></header>
<main id="menu" class="panel"><div class="eyebrow"><span>04</span> YOUR NIGHT. YOUR CHALLENGE.</div><h1>NEON<br><em>DRIFT</em><span class="title-mark">↗</span></h1><div class="subtitle"><span></span> AFTERHOURS RUN</div><p class="intro">The city is yours after midnight.<br>Thread the traffic. Chase the close call.</p><div class="challenge-select"><label for="activity">RUN FORMAT</label><select id="activity"><option value="endless">Endless · chase your best</option><option value="sprint">Midnight Sprint · 60 seconds</option></select></div><div class="pace-select" role="group" aria-label="Driving pace"><button id="arcade" aria-pressed="true">ARCADE <small>The afterhours rush</small></button><button id="cruise" aria-pressed="false">CRUISE <small>More room to react</small></button></div><div class="actions"><button class="primary" id="start">IGNITE THE NIGHT <span>↗</span></button><button class="demo" id="demo">▷ WATCH SHOWCASE</button></div><p class="start-hint">PRESS ANY KEY · CLICK OR TAP ANYWHERE</p><div class="menu-meta"><span>PERSONAL BEST <strong id="best">000000</strong></span><span class="status" id="medal-shelf"></span></div></main>
<div class="garage-label" id="garage"><span class="line"></span><div><small>YOUR RIDE / 001</small><b>VANTA GT</b><span>DUAL ION · REAR DRIVE</span></div></div>
<section id="hud" class="hidden"><p id="driver-rank"></p><p id="objective"></p><p id="armor" class="armor-indicator">ARMOR READY</p><div class="run-top"><div><small id="sector">01 / MIDNIGHT SKYLINE</small><b id="score">000000</b><span id="demo-label"></span></div><button id="pause" aria-label="Pause game">Ⅱ</button></div><div class="speed"><strong id="speed">220</strong><span>KM/H</span></div><div class="energy"><div><span>ION RESERVE</span><b id="energy-label">55%</b></div><div class="energy-track"><i id="energy-fill"></i></div><small>HOLD SPACE TO BOOST</small></div><div class="run-stats"><span>NEAR MISSES <b id="near">0</b></span><span>DISTANCE <b id="distance">0.0 KM</b></span></div><div id="notice" aria-live="polite"></div><div id="draft-hud"><small id="draft-label">FOLLOW A TRAFFIC WAKE TO CHARGE</small><div class="draft-track"><i id="draft-fill"></i></div></div><div id="touch"><button id="left" aria-label="Steer left">‹</button><button id="boost" aria-label="Hold to boost">BOOST</button><button id="right" aria-label="Steer right">›</button></div></section>
<div id="overlay" role="dialog" aria-modal="true" aria-labelledby="overlay-title" class="hidden"><div class="overlay-card"><div class="eyebrow" id="overlay-kicker">SIGNAL INTERRUPTED</div><h2 id="overlay-title">RUN ENDED.</h2><p id="overlay-description"></p><div id="results"></div><button class="primary" id="retry">RUN IT BACK ↗</button><button class="demo" id="home">BACK TO GARAGE</button></div></div>
<footer><div id="instructions"><kbd>←</kbd><kbd>→</kbd> STEER <span></span><kbd>SPACE</kbd> BOOST <span></span><kbd>P</kbd> PAUSE</div><a href="https://insanzialabs.com/experiments">An Insanzia Labs experiment ↗</a><span class="footer-right">EST. 00:00 <i>●</i> NIGHT SHIFT</span></footer><div id="fallback" class="hidden" role="alert"><h2>THE SIGNAL WENT DARK.</h2><p>WebGL is unavailable or the graphics context was lost. Try reloading with hardware acceleration enabled.</p><button class="primary" onclick="location.reload()">RECONNECT ↗</button></div>`;
const el = (id: string) => document.getElementById(id)!;
let best = Number(stored("neon-best-arcade", stored("neon-best", "0"))) || 0;
el("best").textContent = String(best).padStart(6, "0");
const run = new Run(),
  sound = new Sound();
sound.muted = stored("neon-sfx", "on") === "off";
sound.musicMuted = stored("neon-soundtrack", "on") === "off";
let world: World;
run.mode = stored("neon-pace", "arcade") === "cruise" ? "cruise" : "arcade";
run.activity =
  stored("neon-activity", "endless") === "sprint" ? "sprint" : "endless";
(el("activity") as HTMLSelectElement).value = run.activity;
const recordKey = () => `neon-sprint-${run.mode}`;
const badgeKey = () => `neon-badges-${run.mode}`;
const recordBook = () => readBook(stored(recordKey(), "{}"));
function shelf() {
  const book = recordBook(),
    badges = readBook(stored(badgeKey(), "{}")).badges;
  el("medal-shelf").textContent =
    `SPRINT ${book.medal} · ${badges.length}/3 BADGES`;
  el("medal-shelf").title =
    `Sprint targets: 6,000 / 10,000 / 14,000 points. Badges: ${badgeDescriptions.join("; ")}. Earned: ${badges.join(", ") || "none yet"}.`;
  el("best").textContent = String(
    run.activity === "sprint" ? book.score : best,
  ).padStart(6, "0");
}
el("activity").onchange = () => {
  run.activity =
    (el("activity") as HTMLSelectElement).value === "sprint"
      ? "sprint"
      : "endless";
  save("neon-activity", run.activity);
  shelf();
};
let held = false;
let accumulator = 0;
function refreshPace() {
  best =
    Number(
      stored(
        `neon-best-${run.mode}`,
        run.mode === "arcade" ? stored("neon-best", "0") : "0",
      ),
    ) || 0;
  el("best").textContent = String(best).padStart(6, "0");
  for (const mode of ["arcade", "cruise"] as const)
    el(mode).setAttribute("aria-pressed", String(run.mode === mode));
  shelf();
}
for (const mode of ["arcade", "cruise"] as const)
  el(mode).onclick = () => {
    run.mode = mode;
    save("neon-pace", mode);
    refreshPace();
  };
refreshPace();
let previous = performance.now(),
  lastBeat = 0;
function soundLabels() {
  el("sound").textContent = `SFX ${sound.muted ? "OFF" : "ON"}`;
  el("music").textContent =
    `MUSIC ${sound.musicUnavailable ? "RETRY" : sound.musicMuted ? "OFF" : "ON"}`;
}
sound.onMusicError = soundLabels;
soundLabels();
function modal(active: boolean) {
  for (const child of Array.from(app.children))
    (child as HTMLElement).inert =
      active && !["overlay", "fallback"].includes(child.id);
}
function start(demo = false) {
  if (!world || !el("fallback").classList.contains("hidden")) return;
  modal(false);
  run.reset(demo);
  accumulator = 0;
  held = false;
  lastBeat = 0;
  try {
    sound.beginRun();
  } catch {
    sound.muted = true;
    sound.musicMuted = true;
  }
  soundLabels();
  el("menu").classList.add("hidden");
  el("garage").classList.add("hidden");
  el("hud").classList.remove("hidden");
  el("overlay").classList.add("hidden");
  el("demo-label").textContent = demo
    ? "SHOWCASE / AUTOPILOT · SCORES NOT SAVED"
    : run.mode === "cruise"
      ? "CRUISE PACE · SEPARATE BEST"
      : run.activity === "sprint"
        ? "MIDNIGHT SPRINT · 60 SECONDS · 6K / 10K / 14K"
        : "";
  document.body.classList.add("running");
  world.renderer.domElement.focus();
}
function overlay(crashed: boolean) {
  modal(true);
  el("overlay").classList.remove("hidden");
  el("overlay-kicker").textContent = crashed
    ? "CONNECTION LOST / IMPACT DETECTED"
    : "TAKE A BREATHER";
  el("overlay-title").textContent = crashed
    ? "NIGHT, INTERRUPTED."
    : "CITY ON HOLD.";
  el("overlay-description").textContent = crashed
    ? "One more run. There’s always a cleaner line."
    : "Your next close call can wait.";
  el("retry").textContent = crashed ? "RUN IT BACK ↗" : "RESUME THE RUN ↗";
  el("overlay-description").textContent = crashed
    ? `${driverRank(run.score)} · ${run.completed.size}/3 goals complete. Collect 3 ion cells to restore armor; close passes build a multiplier up to ×5.`
    : "Your next close call can wait.";
  if (run.phase === "finished") {
    const value = medal(run.score),
      next = targets.find((t) => t > run.score);
    el("overlay-kicker").textContent = run.demo
      ? "SHOWCASE FINISH · NO REWARDS SAVED"
      : "MIDNIGHT SPRINT / FINISH LINE CROSSED";
    el("overlay-title").textContent =
      `${value === "UNRANKED" ? "SPRINT" : value} COMPLETE.`;
    el("overlay-description").textContent =
      `${Math.floor(run.score).toLocaleString()} points in 60 seconds. ${next ? `${Math.ceil(next - run.score).toLocaleString()} points to the next medal.` : "All three medal targets mastered."}`;
  }
  if (crashed && !run.demo) {
    const badges = earned(run);
    if (badges.length)
      el("overlay-description").textContent +=
        ` Badges earned: ${badges.join(" · ")}.`;
  }
  el("retry").focus();
  el("results").innerHTML = crashed
    ? `<div><small>RUN SCORE</small><b>${Math.floor(run.score).toLocaleString()}</b></div><div><small>CLOSE CALLS</small><b>${run.near}</b></div><div><small>DISTANCE</small><b>${(run.distance / 1000).toFixed(2)} km</b></div>`
    : "";
}
function pause() {
  if (run.phase === "playing") {
    run.phase = "paused";
    sound.setPlaying(false);
    held = false;
    overlay(false);
  } else if (run.phase === "paused") {
    run.phase = "playing";
    modal(false);
    sound.setPlaying(true);
    el("overlay").classList.add("hidden");
    world.renderer.domElement.focus();
  }
}
el("start").onclick = () => start();
el("demo").onclick = () => start(true);
el("pause").onclick = pause;
el("retry").onclick = () => {
  if (run.phase === "paused") pause();
  else start(run.demo);
};
el("home").onclick = () => {
  run.phase = "menu";
  modal(false);
  sound.setPlaying(false);
  run.boost = false;
  run.surge = 0;
  shelf();
  el("overlay").classList.add("hidden");
  el("hud").classList.add("hidden");
  el("menu").classList.remove("hidden");
  el("garage").classList.remove("hidden");
  document.body.classList.remove("running");
};
el("sound").onclick = () => {
  sound.muted = !sound.muted;
  save("neon-sfx", sound.muted ? "off" : "on");
  soundLabels();
};
el("music").onclick = () => {
  try {
    sound.start();
  } catch {
    sound.musicUnavailable = true;
  }
  if (sound.musicUnavailable) {
    sound.musicUnavailable = false;
    sound.musicMuted = false;
    sound.setPlaying(false);
  } else sound.musicMuted = !sound.musicMuted;
  sound.setPlaying(run.phase === "playing");
  save("neon-soundtrack", sound.musicMuted ? "off" : "on");
  soundLabels();
};
const guide = document.getElementById("guide") as HTMLDialogElement;
el("help").onclick = () => {
  if (run.phase === "playing") pause();
  const badges = readBook(stored(badgeKey(), "{}")).badges;
  el("collection-status").textContent =
    `Earned: ${badges.join(" · ") || "No badges yet — your first skill run starts here."}`;
  const style = el("livery") as HTMLSelectElement;
  for (const option of Array.from(style.options))
    option.disabled =
      (option.value === "ion" && !badges.includes("Wake rider")) ||
      (option.value === "solar" && !badges.includes("Close-call artist"));
  const selected = stored("neon-livery", "titanium");
  style.value = Array.from(style.options).some(
    (o) => o.value === selected && !o.disabled,
  )
    ? selected
    : "titanium";
  world.setLivery(style.value);
  guide.showModal();
};
el("livery").onchange = () => {
  const value = (el("livery") as HTMLSelectElement).value;
  save("neon-livery", value);
  world.setLivery(value);
};
el("close-guide").onclick = () => guide.close();
el("quality").onclick = () => {
  world.quality(!world.low);
  el("quality").textContent = world.low ? "LITE" : "HIGH";
  save("neon-quality", world.low ? "lite" : "high");
};
// Bubble-phase clicks keep menu buttons and the return-to-garage action intact.
document.addEventListener("click", (e) => {
  if (run.phase !== "menu" || guide.open) return;
  if (
    e.target instanceof Element &&
    e.target.closest("button, a, select, label")
  )
    return;
  start();
});
window.addEventListener("keydown", (e) => {
  if (guide.open || e.target instanceof HTMLSelectElement) return;
  if (e.key === "Tab" && !el("overlay").classList.contains("hidden")) {
    const buttons = [el("retry"), el("home")],
      index = buttons.indexOf(document.activeElement as HTMLElement);
    if (
      index < 0 ||
      (e.shiftKey && index === 0) ||
      (!e.shiftKey && index === 1)
    ) {
      e.preventDefault();
      buttons[e.shiftKey ? 1 : 0].focus();
    }
    return;
  }
  if (
    e.target instanceof Element &&
    e.target.closest("button,a,select") &&
    ["Enter", " "].includes(e.key)
  )
    return;
  if (
    ["crashed", "finished"].includes(run.phase) &&
    e.key.toLowerCase() === "r"
  ) {
    start(run.demo);
    return;
  }
  if (["Tab", "Shift", "Control", "Alt", "Meta"].includes(e.key)) return;
  if (run.phase === "menu" && !e.repeat && !e.isComposing) {
    const activatingControl =
      e.target instanceof Element &&
      e.target.closest("button, a, select, label") &&
      ["Enter", " "].includes(e.key);
    if (activatingControl) return;
    e.preventDefault();
    start();
    // The start gesture must not also steer, boost, or immediately pause.
    return;
  }
  if (["ArrowLeft", "ArrowRight", " ", "ArrowUp"].includes(e.key))
    e.preventDefault();
  if (e.repeat) return;
  if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") run.steer(-1);
  if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") run.steer(1);
  if (e.key === " ") held = true;
  if (e.key.toLowerCase() === "p" || e.key === "Escape") pause();
});
window.addEventListener("keyup", (e) => {
  if (e.key === " ") held = false;
});
window.addEventListener("blur", () => {
  held = false;
  if (run.phase === "playing") pause();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden && run.phase === "playing") pause();
});
for (const [id, dir] of [
  ["left", -1],
  ["right", 1],
] as const) {
  el(id).onpointerdown = (e) => {
    e.preventDefault();
    run.steer(dir);
  };
}
el("boost").onpointerdown = (e) => {
  e.preventDefault();
  held = true;
  el("boost").setPointerCapture(e.pointerId);
};
el("boost").onpointerup = () => (held = false);
el("boost").onpointercancel = () => (held = false);
try {
  world = new World(el("scene"));
  world.setLivery(stored("neon-livery", "titanium"));
  world.renderer.domElement.tabIndex = 0;
  world.renderer.domElement.setAttribute(
    "aria-label",
    "Neon Drift game. Arrow keys steer, Space boosts, P pauses.",
  );
  if (
    stored("neon-quality", "high") === "lite" ||
    navigator.hardwareConcurrency <= 4
  ) {
    world.quality(true);
    el("quality").textContent = "LITE";
  }
  world.renderer.domElement.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    run.phase = "paused";
    el("fallback").classList.remove("hidden");
  });
  let swipe = 0;
  world.renderer.domElement.onpointerdown = (e) => {
    swipe = e.clientX;
  };
  world.renderer.domElement.onpointerup = (e) => {
    if (Math.abs(e.clientX - swipe) > 25)
      run.steer(Math.sign(e.clientX - swipe));
  };
} catch {
  el("fallback").classList.remove("hidden");
}
function frame(now: number) {
  const dt = Math.min((now - previous) / 1000, 0.1);
  previous = now;
  if (world) {
    accumulator += dt;
    while (accumulator >= 1 / 120) {
      run.update(1 / 120, held, (kind) => {
        sound.fx(kind);
        if (
          ["near", "crash", "damage", "goal", "surge", "finish"].includes(kind)
        )
          world.burst(run.x);
        if (kind === "crash" || kind === "finish") {
          document.body.classList.add("impact");
          setTimeout(() => document.body.classList.remove("impact"), 450);
          if (!run.demo) {
            const badges = [
              ...new Set([
                ...readBook(stored(badgeKey(), "{}")).badges,
                ...earned(run),
              ]),
            ];
            save(badgeKey(), JSON.stringify({ badges }));
            if (run.activity === "sprint")
              save(
                recordKey(),
                JSON.stringify(challengeResult(run, recordBook())),
              );
          }
          if (!run.demo && run.activity === "endless") {
            best = Math.max(best, Math.floor(run.score));
            save(`neon-best-${run.mode}`, String(best));
            el("best").textContent = String(best).padStart(6, "0");
          }
          overlay(true);
        }
      });
      accumulator -= 1 / 120;
    }
    const beat = beatAt(run.distance);
    if (beat !== lastBeat && run.phase === "playing") {
      lastBeat = beat;
      run.notice = [
        "MIDNIGHT SKYLINE",
        "ENTER THE LIGHT / ION TUNNEL",
        "ABOVE IT ALL / SKYBRIDGE",
      ][beat];
      run.noticeTime = 2.3;
      sound.fx("near");
    }
    world.update(run, Math.min(dt, 0.05), now / 1000);
    sound.update(run.speed, run.phase === "playing", run.boost);
    el("score").textContent = String(Math.floor(run.score)).padStart(6, "0");
    el("speed").textContent = String(Math.floor(run.speed * 4.2));
    el("energy-fill").style.width = `${run.energy}%`;
    el("energy-label").textContent = `${Math.floor(run.energy)}%`;
    el("draft-label").textContent =
      run.surge > 0
        ? `FREE SURGE · ${run.surge.toFixed(1)}s`
        : run.draftReady
          ? "SURGE READY · CHANGE LANE"
          : `SLIPSTREAM ${Math.floor(run.draft * 100)}% · FOLLOW TRAFFIC`;
    el("draft-fill").style.width =
      `${run.draftReady || run.surge > 0 ? 100 : run.draft * 100}%`;
    el("draft-hud").classList.toggle("ready", run.draftReady || run.surge > 0);
    el("near").textContent = String(run.near);
    el("distance").textContent = `${(run.distance / 1000).toFixed(2)} KM`;
    const message = run.noticeTime > 0 ? run.notice : "";
    if (el("notice").textContent !== message)
      el("notice").textContent = message;
    el("driver-rank").textContent = driverRank(run.score);
    el("armor").textContent = run.armor
      ? "ARMOR READY"
      : `ARMOR SPENT · ${3 - run.repairCells} CELLS TO REPAIR`;
    const goal = RUN_GOALS.find((_, i) => !run.completed.has(i));
    el("objective").textContent =
      run.activity === "sprint"
        ? `SPRINT · ${Math.max(0, Math.ceil(60 - run.elapsed))}s LEFT · ${medal(run.score)}`
        : goal
          ? `${goal.name} · ${Math.min(goal.target, Math.floor(run[goal.key]))}/${goal.target}`
          : "ALL THREE RUN GOALS COMPLETE";
    el("sector").textContent = [
      "01 / MIDNIGHT SKYLINE",
      "02 / ION TUNNEL",
      "03 / SKYBRIDGE",
    ][beat];
    document.body.classList.toggle("boosting", run.boost);
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
