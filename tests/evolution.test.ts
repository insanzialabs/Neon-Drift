import { test } from "node:test";
import assert from "node:assert/strict";
import { Run } from "../src/game";
import { medal, earned, readBook, challengeResult } from "../src/progression";
const tick = (r: Run, seconds: number) => {
  for (let i = 0; i < Math.round(seconds * 120); i++)
    r.update(1 / 120, false, () => {});
};
test("a real traffic wake banks one surge; a lane change releases it without spending energy", () => {
  const r = new Run();
  r.reset();
  r.cells = [];
  r.traffic = [{ x: 0, z: -82, kind: 1, passed: false }];
  tick(r, 1.1);
  assert.equal(r.draftReady, true);
  const energy = r.energy;
  r.steer(1);
  r.update(1 / 120, false, () => {});
  assert.equal(r.surges, 1);
  assert.ok(r.surge > 1.9);
  assert.equal(r.energy, energy);
  assert.equal(r.boost, true);
  r.steer(-1);
  r.update(1 / 120, false, () => {});
  assert.equal(r.surges, 1);
});
test("other lanes do not charge a wake and hitting traffic clears a banked surge", () => {
  const r = new Run();
  r.reset();
  r.cells = [];
  r.traffic = [{ x: 4.2, z: -82, kind: 1, passed: false }];
  tick(r, 1.1);
  assert.equal(r.draft, 0);
  r.draftReady = true;
  r.draft = 1;
  r.traffic = [{ x: 0, z: 3, kind: 1, passed: false }];
  r.update(0.001, false, () => {});
  assert.equal(r.draftReady, false);
  assert.equal(r.draft, 0);
});
test("Sprint freezes at 60 seconds, emits one finish, and never replaces endless state accidentally", () => {
  const r = new Run();
  r.activity = "sprint";
  r.reset();
  r.traffic = [];
  r.cells = [];
  let finishes = 0;
  for (let i = 0; i < 7300; i++)
    r.update(1 / 120, false, (k) => {
      if (k === "finish") finishes++;
    });
  assert.equal(r.phase, "finished");
  assert.equal(r.elapsed, 60);
  assert.equal(finishes, 1);
  const score = r.score;
  tick(r, 1);
  assert.equal(r.score, score);
  r.reset();
  assert.equal(r.activity, "sprint");
  assert.equal(r.surges, 0);
  assert.equal(r.phase, "playing");
});
test("medals and badges require genuine terminal runs; malformed storage is safe", () => {
  assert.deepEqual([5999, 6000, 10000, 14000].map(medal), [
    "UNRANKED",
    "BRONZE",
    "SILVER",
    "GOLD",
  ]);
  const r = new Run();
  r.reset();
  r.surges = 3;
  r.near = 10;
  r.score = 14000;
  r.phase = "finished";
  assert.equal(earned(r).length, 3);
  assert.equal(challengeResult(r, readBook("{}")).medal, "GOLD");
  r.demo = true;
  assert.deepEqual(earned(r), []);
  assert.equal(challengeResult(r, readBook("{}")).score, 0);
  r.demo = false;
  r.phase = "crashed";
  assert.equal(challengeResult(r, readBook("{}")).score, 0);
  assert.equal(readBook("null").score, 0);
  assert.deepEqual(readBook('{"badges":["made up",null,5]}').badges, []);
});
