import { test } from "node:test";
import assert from "node:assert/strict";
import { Run, proximity, beatAt, seeded } from "../src/game";
test("collision and near miss envelopes are distinct", () => {
  assert.equal(proximity(0, 3, 0, 3), "hit");
  assert.equal(proximity(2.5, 3, 0, 3), "near");
  assert.equal(proximity(4.2, 3, 0, 3), "clear");
  assert.equal(proximity(0, 3, 0, -10), "clear");
});
test("three scenery beats repeat", () =>
  assert.deepEqual([0, 420, 840, 1260].map(beatAt), [0, 1, 2, 0]));
test("restart resets all run state and deterministic traffic", () => {
  const r = new Run();
  r.reset();
  const first = structuredClone(r.traffic);
  r.score = 1000;
  r.x = 4;
  r.phase = "crashed";
  r.reset();
  assert.equal(r.score, 0);
  assert.equal(r.x, 0);
  assert.equal(r.phase, "playing");
  assert.deepEqual(r.traffic, first);
});
test("paused run freezes and steering stays within road", () => {
  const r = new Run();
  r.reset();
  for (let i = 0; i < 10; i++) r.steer(1);
  assert.equal(r.lane, 2);
  r.phase = "paused";
  r.update(1, true, () => {});
  assert.equal(r.distance, 0);
});
test("real overlaps crash and close passes reward once", () => {
  const r = new Run();
  r.reset();
  r.traffic = [{ x: 0, z: 3, kind: 1, passed: false }];
  r.update(0.01, false, () => {});
  assert.equal(r.phase, "crashed");
  r.reset();
  r.x = 2.5;
  r.lane = 2;
  r.traffic = [{ x: 0, z: 3, kind: 1, passed: false }];
  r.update(0.01, false, () => {});
  assert.equal(r.near, 1);
  r.update(0.01, false, () => {});
  assert.equal(r.near, 1);
});
test("boost spends reserve and seeds repeat", () => {
  const r = new Run();
  r.reset();
  r.update(0.1, true, () => {});
  assert.ok(r.energy < 55);
  assert.ok(r.speed > 46);
  assert.equal(seeded(1)(), seeded(1)());
});
