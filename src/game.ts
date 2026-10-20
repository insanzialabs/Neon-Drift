export type Phase = "menu" | "playing" | "paused" | "crashed" | "finished";
export const LANES = [-4.2, 0, 4.2];
export type Traffic = {
  x: number;
  z: number;
  kind: number;
  passed: boolean;
  closest?: number;
};
export function proximity(
  x: number,
  z: number,
  otherX: number,
  otherZ: number,
  truck = false,
): "hit" | "near" | "clear" {
  const dx = Math.abs(x - otherX),
    dz = Math.abs(z - otherZ);
  if (dz < (truck ? 3.5 : 2.7) && dx < 1.75) return "hit";
  if (dz < 2 && dx >= 1.75 && dx < 4.65) return "near";
  return "clear";
}
export function beatAt(distance: number) {
  return Math.floor(distance / 420) % 3;
}
export function seeded(seed: number) {
  let n = seed;
  return () => {
    n = (n * 1664525 + 1013904223) >>> 0;
    return n / 4294967296;
  };
}
export const RUN_GOALS = [
  { name: "Close-call artist", key: "near", target: 5 },
  { name: "Ion collector", key: "pickups", target: 3 },
  { name: "Night voyager", key: "distance", target: 1000 },
] as const;
export function driverRank(score: number) {
  return score >= 14000
    ? "NIGHT LEGEND"
    : score >= 7000
      ? "GHOST DRIVER"
      : score >= 3000
        ? "STREET ACE"
        : score >= 1000
          ? "AFTERHOURS"
          : "ROOKIE";
}
export class Run {
  activity: "endless" | "sprint" = "endless";
  draft = 0;
  draftReady = false;
  surge = 0;
  surges = 0;
  surgeQueued = false;
  mode: "arcade" | "cruise" = "arcade";
  armor = 1;
  repairCells = 0;
  invulnerable = 0;
  boosts = 0;
  boostLatch = false;
  completed = new Set<number>();
  phase: Phase = "menu";
  distance = 0;
  score = 0;
  speed = 46;
  energy = 55;
  x = 0;
  lane = 1;
  streak = 0;
  near = 0;
  boost = false;
  demo = false;
  elapsed = 0;
  notice = "";
  noticeTime = 0;
  pickups = 0;
  cells = [
    { x: 0, z: -65 },
    { x: 4.2, z: -260 },
    { x: -4.2, z: -480 },
  ];
  traffic: Traffic[] = [];
  rng = seeded(17);
  reset(demo = false, mode = this.mode) {
    this.draft = 0;
    this.draftReady = false;
    this.surge = 0;
    this.surges = 0;
    this.surgeQueued = false;
    this.mode = mode;
    this.armor = 1;
    this.repairCells = 0;
    this.invulnerable = 0;
    this.boosts = 0;
    this.boostLatch = false;
    this.completed = new Set();
    this.phase = "playing";
    this.distance = 0;
    this.score = 0;
    this.speed = mode === "cruise" ? 36 : 46;
    this.energy = 55;
    this.x = 0;
    this.lane = 1;
    this.streak = 0;
    this.near = 0;
    this.elapsed = 0;
    this.demo = demo;
    this.boost = false;
    this.pickups = 0;
    this.notice = demo ? "SHOWCASE · AUTOPILOT" : "CHASE THE AFTERHOURS";
    this.noticeTime = 2;
    this.cells = [
      { x: 0, z: -65 },
      { x: 4.2, z: -260 },
      { x: -4.2, z: -480 },
    ];
    this.rng = seeded(17);
    this.traffic = Array.from({ length: 10 }, (_, i) => ({
      x: LANES[Math.floor(this.rng() * 3)],
      z: -95 - i * 62,
      kind: i % 4,
      passed: false,
    }));
  }
  steer(dir: number) {
    if (this.phase !== "playing" || this.demo) return;
    const next = Math.max(0, Math.min(2, this.lane + dir));
    if (next !== this.lane) this.releaseSurge();
    this.lane = next;
  }
  releaseSurge() {
    if (this.phase !== "playing" || !this.draftReady) return;
    this.surgeQueued = true;
    this.draftReady = false;
    this.draft = 0;
  }
  update(dt: number, boosting: boolean, event: (kind: string) => void) {
    if (this.phase !== "playing") return;
    // A finite challenge ends once, before any traffic advances past the finish.
    if (this.activity === "sprint")
      dt = Math.min(dt, Math.max(0, 60 - this.elapsed));
    this.elapsed += dt;
    this.surge = Math.max(0, this.surge - dt);
    if (this.surgeQueued) {
      this.surgeQueued = false;
      this.surge = 2;
      this.surges++;
      this.score += 400;
      this.notice = "SLIPSTREAM RELEASE · FREE SURGE +400";
      this.noticeTime = 2;
      event("surge");
    }
    const drafting = this.traffic.some(
      (t) => Math.abs(t.x - this.x) < 1.2 && t.z < -20 && t.z > -85,
    );
    if (!this.draftReady && this.surge === 0) {
      this.draft = Math.max(
        0,
        Math.min(1, this.draft + (drafting ? dt : -dt * 0.6)),
      );
      if (this.draft >= 1) {
        this.draftReady = true;
        this.notice = "SURGE BANKED · CHANGE LANE TO RELEASE";
        this.noticeTime = 2;
        event("charged");
      }
    }
    this.invulnerable = Math.max(0, this.invulnerable - dt);
    this.noticeTime -= dt;
    if (this.demo) {
      if (this.draftReady) this.releaseSurge();
      const nearest = this.traffic
        .filter((t) => t.z < 6 && t.z > -85)
        .sort((a, b) => b.z - a.z)[0];
      if (nearest && nearest.z < -20) {
        const occupied = Math.round(nearest.x / 4.2) + 1;
        this.lane = occupied === 1 ? 2 : 1;
      }
      boosting = this.elapsed % 11 > 6 && this.elapsed % 11 < 8.8;
    }
    if (!boosting) this.boostLatch = false;
    if (this.energy <= 1) this.boostLatch = true;
    const wasBoosting = this.boost;
    this.boost =
      this.surge > 0 || (boosting && this.energy > 1 && !this.boostLatch);
    if (this.boost && !wasBoosting) {
      this.boosts++;
      event("boost");
    }
    this.energy = Math.max(
      0,
      Math.min(
        100,
        this.energy + (this.surge > 0 ? 0 : this.boost ? -24 : 3.4) * dt,
      ),
    );
    this.speed +=
      ((this.mode === "cruise" ? 36 : 46) +
        Math.min(this.mode === "cruise" ? 14 : 24, this.elapsed * 0.26) +
        (this.boost ? 26 : 0) -
        this.speed) *
      dt *
      2;
    const ahead = this.traffic
      .filter((t) => t.z < 12 && t.z > -90)
      .sort((a, b) => b.z - a.z)[0];
    const target =
      this.demo && ahead
        ? ahead.z < -35 && !this.draftReady && this.surge === 0
          ? ahead.x
          : ahead.x + (ahead.x > 0 ? -2.6 : 2.6)
        : LANES[this.lane];
    this.x += (target - this.x) * Math.min(1, dt * 9);
    this.distance += this.speed * dt;
    this.score += this.speed * dt * (this.boost ? 1.6 : 1);
    for (const cell of this.cells) {
      cell.z += this.speed * dt;
      if (Math.abs(cell.z - 3) < 2.5 && Math.abs(cell.x - this.x) < 1.3) {
        this.energy = Math.min(100, this.energy + 28);
        this.pickups++;
        if (this.armor === 0) this.repairCells++;
        if (this.repairCells >= 3 && this.armor === 0) {
          this.armor = 1;
          this.repairCells = 0;
          this.notice = "ARMOR REPAIRED";
          this.noticeTime = 1.7;
          event("repair");
        }
        this.score += 100;
        this.notice = "ION CELL +28";
        this.noticeTime = 1;
        event("pickup");
        cell.z = -610;
      }
      if (cell.z > 25) {
        cell.z = -610;
        cell.x = LANES[Math.floor(this.rng() * 3)];
      }
    }
    for (const t of this.traffic) {
      t.z += (this.speed - 17) * dt;
      if (Math.abs(t.z - 3) < 6)
        t.closest = Math.min(t.closest ?? Infinity, Math.abs(this.x - t.x));
      const p = proximity(this.x, 3, t.x, t.z, t.kind === 0);
      if (p === "hit" && this.invulnerable === 0) {
        if (this.armor > 0) {
          this.armor = 0;
          this.repairCells = 0;
          this.invulnerable = 1.8;
          this.streak = 0;
          this.draft = 0;
          this.draftReady = false;
          this.surge = 0;
          this.speed *= 0.8;
          this.energy = Math.max(0, this.energy - 18);
          t.z = 24;
          t.passed = true;
          this.notice = "ARMOR SPENT · KEEP DRIVING";
          this.noticeTime = 1.8;
          event("damage");
          continue;
        }
        this.phase = "crashed";
        this.boost = false;
        event("crash");
        return;
      }
      if (!t.passed && t.z > 3 + (t.kind === 0 ? 3.5 : 2.7)) {
        t.passed = true;
        if ((t.closest ?? Infinity) < 4.65 && (t.closest ?? 0) >= 1.75) {
          this.near++;
          this.streak = Math.min(5, this.streak + 1);
          this.score += 150 * this.streak;
          this.energy = Math.min(100, this.energy + 14);
          this.notice = `NEAR MISS ×${this.streak}`;
          this.noticeTime = 1.6;
          event("near");
        } else this.streak = 0;
      }
      if (t.z > 26) {
        t.z =
          Math.min(...this.traffic.map((v) => v.z)) -
          Math.max(46, 66 - this.elapsed * 0.14);
        t.x = LANES[Math.floor(this.rng() * 3)];
        t.kind = Math.floor(this.rng() * 4);
        t.passed = false;
        t.closest = undefined;
      }
    }
    RUN_GOALS.forEach((goal, index) => {
      if (this[goal.key] >= goal.target && !this.completed.has(index)) {
        this.completed.add(index);
        this.score += 500;
        this.notice = `GOAL COMPLETE · ${goal.name.toUpperCase()}`;
        this.noticeTime = 2;
        event("goal");
      }
    });
    if (this.activity === "sprint" && this.elapsed >= 60 - 1e-8) {
      this.elapsed = 60;
      this.phase = "finished";
      this.boost = false;
      event("finish");
    }
  }
}
