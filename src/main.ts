import "./style.css";
import { Run, beatAt } from "./game";
import { World } from "./world";
import { Sound } from "./audio";
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
app.innerHTML = `<div id="scene" aria-label="3D racing game"></div><div class="vignette"></div><header><a class="brand" href="./" aria-label="Neon Drift home"><span class="brand-icon">∕∕</span> INSANZIA <b>ARCADE</b></a><div class="live"><i></i> AFTERHOURS NETWORK <span> / 04</span></div><div class="tools"><button id="music" aria-label="Toggle music">MUSIC OFF</button><button id="sound" aria-label="Toggle sound effects">SFX ON</button><button id="quality" aria-label="Toggle graphics quality">HIGH</button></div></header>
<main id="menu" class="panel"><div class="eyebrow"><span>04</span> NO CURFEW. NO FINISH LINE.</div><h1>NEON<br><em>DRIFT</em><span class="title-mark">↗</span></h1><div class="subtitle"><span></span> AFTERHOURS RUN</div><p class="intro">The city is yours after midnight.<br>Thread the traffic. Chase the close call.</p><div class="actions"><button class="primary" id="start">IGNITE THE NIGHT <span>↗</span></button><button class="demo" id="demo">▷ WATCH SHOWCASE</button></div><p class="start-hint">PRESS ANY KEY · CLICK OR TAP ANYWHERE</p><div class="menu-meta"><span>PERSONAL BEST <strong id="best">000000</strong></span><span class="status"><i></i> ALL SYSTEMS READY</span></div></main>
<div class="garage-label" id="garage"><span class="line"></span><div><small>YOUR RIDE / 001</small><b>VANTA GT</b><span>DUAL ION · REAR DRIVE</span></div></div>
<section id="hud" class="hidden"><div class="run-top"><div><small id="sector">01 / MIDNIGHT SKYLINE</small><b id="score">000000</b><span id="demo-label"></span></div><button id="pause" aria-label="Pause game">Ⅱ</button></div><div class="speed"><strong id="speed">220</strong><span>KM/H</span></div><div class="energy"><div><span>ION RESERVE</span><b id="energy-label">55%</b></div><div class="energy-track"><i id="energy-fill"></i></div><small>HOLD SPACE TO BOOST</small></div><div class="run-stats"><span>NEAR MISSES <b id="near">0</b></span><span>DISTANCE <b id="distance">0.0 KM</b></span></div><div id="notice" aria-live="polite"></div><div id="touch"><button id="left" aria-label="Steer left">‹</button><button id="boost" aria-label="Hold to boost">BOOST</button><button id="right" aria-label="Steer right">›</button></div></section>
<div id="overlay" class="hidden"><div class="overlay-card"><div class="eyebrow" id="overlay-kicker">SIGNAL INTERRUPTED</div><h2 id="overlay-title">RUN ENDED.</h2><p id="overlay-description"></p><div id="results"></div><button class="primary" id="retry">RUN IT BACK ↗</button><button class="demo" id="home">BACK TO GARAGE</button></div></div>
<footer><div id="instructions"><kbd>←</kbd><kbd>→</kbd> STEER <span></span><kbd>SPACE</kbd> BOOST <span></span><kbd>P</kbd> PAUSE</div><span>An Insanzia Labs experiment</span><span class="footer-right">EST. 00:00 <i>●</i> NIGHT SHIFT</span></footer><div id="fallback" class="hidden" role="alert"><h2>THE SIGNAL WENT DARK.</h2><p>WebGL is unavailable or the graphics context was lost. Try reloading with hardware acceleration enabled.</p><button class="primary" onclick="location.reload()">RECONNECT ↗</button></div>`;
const el = (id: string) => document.getElementById(id)!;
let best = Number(stored("neon-best", "0"));
el("best").textContent = String(best).padStart(6, "0");
const run = new Run(),
  sound = new Sound();
sound.muted = stored("neon-sfx", "on") === "off";
sound.musicMuted = stored("neon-soundtrack", "on") === "off";
let world: World;
let held = false;
let previous = performance.now(),
  lastBeat = 0;
function soundLabels() {
  el("sound").textContent = `SFX ${sound.muted ? "OFF" : "ON"}`;
  el("music").textContent =
    `MUSIC ${sound.musicUnavailable ? "RETRY" : sound.musicMuted ? "OFF" : "ON"}`;
}
sound.onMusicError = soundLabels;
soundLabels();
function start(demo = false) {
  if (!world || !el("fallback").classList.contains("hidden")) return;
  run.reset(demo);
  held = false;
  lastBeat = 0;
  sound.beginRun();
  soundLabels();
  el("menu").classList.add("hidden");
  el("garage").classList.add("hidden");
  el("hud").classList.remove("hidden");
  el("overlay").classList.add("hidden");
  el("demo-label").textContent = demo
    ? "SHOWCASE / AUTOPILOT · SCORES NOT SAVED"
    : "";
  document.body.classList.add("running");
}
function overlay(crashed: boolean) {
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
    sound.setPlaying(true);
    el("overlay").classList.add("hidden");
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
  sound.setPlaying(false);
  run.boost = false;
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
  sound.start();
  if (sound.musicUnavailable) {
    sound.musicUnavailable = false;
    sound.musicMuted = false;
    sound.setPlaying(false);
  } else sound.musicMuted = !sound.musicMuted;
  sound.setPlaying(run.phase === "playing");
  save("neon-soundtrack", sound.musicMuted ? "off" : "on");
  soundLabels();
};
el("quality").onclick = () => {
  world.quality(!world.low);
  el("quality").textContent = world.low ? "LITE" : "HIGH";
  save("neon-quality", world.low ? "lite" : "high");
};
// Bubble-phase clicks keep menu buttons and the return-to-garage action intact.
document.addEventListener("click", (e) => {
  if (run.phase !== "menu") return;
  if (e.target instanceof Element && e.target.closest("button, a")) return;
  start();
});
window.addEventListener("keydown", (e) => {
  if (run.phase === "menu" && !e.repeat && !e.isComposing) {
    const activatingControl =
      e.target instanceof Element &&
      e.target.closest("button, a") &&
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
  const dt = Math.min((now - previous) / 1000, 0.04);
  previous = now;
  if (world) {
    run.update(dt, held, (kind) => {
      sound.fx(kind);
      if (kind === "near" || kind === "crash") world.burst(run.x);
      if (kind === "crash") {
        document.body.classList.add("impact");
        setTimeout(() => document.body.classList.remove("impact"), 450);
        if (!run.demo) {
          best = Math.max(best, Math.floor(run.score));
          save("neon-best", String(best));
          el("best").textContent = String(best).padStart(6, "0");
        }
        overlay(true);
      }
    });
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
    world.update(run, dt, now / 1000);
    sound.update(run.speed, run.phase === "playing", run.boost);
    el("score").textContent = String(Math.floor(run.score)).padStart(6, "0");
    el("speed").textContent = String(Math.floor(run.speed * 4.2));
    el("energy-fill").style.width = `${run.energy}%`;
    el("energy-label").textContent = `${Math.floor(run.energy)}%`;
    el("near").textContent = String(run.near);
    el("distance").textContent = `${(run.distance / 1000).toFixed(2)} KM`;
    el("notice").textContent = run.noticeTime > 0 ? run.notice : "";
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
