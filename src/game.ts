export type Phase = "menu" | "playing" | "paused" | "crashed";
export const LANES = [-4.2, 0, 4.2];
export type Traffic = { x: number; z: number; kind: number; passed: boolean };
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
  if (dz < 2 && dx >= 1.75 && dx < 3.6) return "near";
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
export class Run {
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
  reset(demo = false) {
    this.phase = "playing";
    this.distance = 0;
    this.score = 0;
    this.speed = 46;
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
    if (this.phase === "playing" && !this.demo)
      this.lane = Math.max(0, Math.min(2, this.lane + dir));
  }
  update(dt: number, boosting: boolean, event: (kind: string) => void) {
    if (this.phase !== "playing") return;
    this.elapsed += dt;
    this.noticeTime -= dt;
    if (this.demo) {
      const nearest = this.traffic
        .filter((t) => t.z < 6 && t.z > -85)
        .sort((a, b) => b.z - a.z)[0];
      if (nearest && nearest.z < -20) {
        const occupied = Math.round(nearest.x / 4.2) + 1;
        this.lane = occupied === 1 ? 2 : 1;
      }
      boosting = this.elapsed % 11 > 6 && this.elapsed % 11 < 8.8;
    }
    this.boost = boosting && this.energy > 1;
    this.energy = Math.max(
      0,
      Math.min(100, this.energy + (this.boost ? -24 : 3.4) * dt),
    );
    this.speed +=
      (46 +
        Math.min(24, this.elapsed * 0.32) +
        (this.boost ? 26 : 0) -
        this.speed) *
      dt *
      2;
    const ahead = this.traffic
      .filter((t) => t.z < 12 && t.z > -90)
      .sort((a, b) => b.z - a.z)[0];
    const target =
      this.demo && ahead
        ? ahead.x + (ahead.x > 0 ? -2.6 : 2.6)
        : LANES[this.lane];
    this.x += (target - this.x) * Math.min(1, dt * 9);
    this.distance += this.speed * dt;
    this.score += this.speed * dt * (this.boost ? 1.6 : 1);
    for (const cell of this.cells) {
      cell.z += this.speed * dt;
      if (Math.abs(cell.z - 3) < 2.5 && Math.abs(cell.x - this.x) < 1.3) {
        this.energy = Math.min(100, this.energy + 28);
        this.pickups++;
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
      const p = proximity(this.x, 3, t.x, t.z, t.kind === 0);
      if (p === "hit") {
        this.phase = "crashed";
        this.boost = false;
        event("crash");
        return;
      }
      if (!t.passed && t.z > 3) {
        t.passed = true;
        if (Math.abs(this.x - t.x) < 3.6 && Math.abs(this.x - t.x) >= 1.75) {
          this.near++;
          this.streak++;
          this.score += 250 * this.streak;
          this.energy = Math.min(100, this.energy + 14);
          this.notice = `NEAR MISS ×${this.streak}`;
          this.noticeTime = 1.6;
          event("near");
        } else this.streak = 0;
      }
      if (t.z > 26) {
        t.z = Math.min(...this.traffic.map((v) => v.z)) - 62;
        t.x = LANES[Math.floor(this.rng() * 3)];
        t.kind = Math.floor(this.rng() * 4);
        t.passed = false;
      }
    }
  }
}
