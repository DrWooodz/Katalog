/* The progression rules, one small log at a time. Each test states a rule from the Method tab and checks the code does it.
   Numbers come from src/data/rules.js where the rule is a setting, so changing a setting there doesn't break these. */
import { test } from "node:test";
import assert from "node:assert/strict";
import * as E from "../src/logic/engine.js";
import { deriveRow } from "../src/logic/sets.js";
import { BACKOFF, HANG, HANGS, JUMP, PULL_BW, PULLING, REENTRY, TOP, WRIST } from "../src/data/rules.js";

const NO25 = [45, 35, 25, 15, 10, 5], WITH25 = [45, 35, 25, 15, 10, 5, 2.5];
let n = 0;
const S = (date, type, lifts, more) => Object.assign({id: "t" + (++n), date, type, created: n, lifts: lifts || [], fingers: {done: false}, climb: {on: false}}, more || {});
const R = (lift, role, sets, extra) => deriveRow(Object.assign({lift, role, sl: sets.map(([w, reps, st, tgt]) => ({w, reps, tgt: tgt ?? reps, st: st ?? "ok"}))}, extra || {}));
const prof = more => Object.assign({oneRM: {bench: 300, dead: 405, squat: 315, ohp: 135}, unknown: {}, plates: WITH25, plan: {id: "foundation", start: "2026-11-02"}}, more || {});
const run = (sessions, date, fn, profile, ready) => E.withLog({sessions, profile: profile || prof(), date, ready}, fn);

test("clean top triple: +5 upper / +10 lower when the plates allow it", () => {
  const log = [S("2026-11-02", "bench", [R("Bench", "top", [[275, 3]])]), S("2026-11-03", "dead", [R("Deadlift", "top", [[365, 3]])])];
  assert.equal(run(log, "2026-11-05", () => E.nextTop("bench")).w, 275 + JUMP.upper);
  assert.equal(run(log, "2026-11-05", () => E.nextTop("dead")).w, 365 + JUMP.lower);
});

test("without 2.5s the bench earns reps first (3 -> 4 -> 5), then takes the 10 lb jump", () => {
  const p = prof({plates: NO25});
  const at = reps => run([S("2026-11-02", "bench", [R("Bench", "top", [[275, reps]])])], "2026-11-05", () => E.nextTop("bench"), p);
  assert.deepEqual([at(3).w, at(3).reps], [275, 4]);
  assert.deepEqual([at(4).w, at(4).reps], [275, 5]);
  assert.deepEqual([at(5).w, at(5).reps], [285, 3]);
});

test("a miss repeats the weight; two misses in a row drop it by 7.5% and rebuild", () => {
  const miss = d => S(d, "bench", [R("Bench", "top", [[280, 2, "miss", 3]])]);
  assert.equal(run([miss("2026-11-02")], "2026-11-05", () => E.nextTop("bench")).w, 280);
  const two = run([miss("2026-10-30"), miss("2026-11-02")], "2026-11-05", () => E.nextTop("bench"));
  assert.equal(two.w, 260);   // 280 x 0.925 = 259, rounded to 5
  assert.match(two.why, /twice/);
});

test("first session after 10+ days off repeats the last clean top set", () => {
  const log = [S("2026-10-20", "bench", [R("Bench", "top", [[270, 3]])])];
  const t = run(log, "2026-10-30", () => E.nextTop("bench"));   // 10 days later
  assert.equal(t.w, 270); assert.match(t.why, /repeat 270×3/);
});

test("no heavy work in 6 weeks: re-entry 3x5 at 70% of the saved max", () => {
  const log = [S("2026-09-01", "dead", [R("Deadlift", "top", [[365, 3]])])];
  const t = run(log, "2026-11-05", () => E.nextTop("dead"));
  assert.equal(t.phase, "reentry"); assert.equal(t.reps, REENTRY.reps); assert.equal(t.sets, REENTRY.sets);
  assert.equal(t.w, Math.round(405 * REENTRY.startPct / 5) * 5);
  assert.equal(run(log, "2026-11-05", () => E.nextBackoff("dead")).sets, 0);
});

test("unknown max with nothing logged: a test day from the floor, no back-offs", () => {
  const p = prof({unknown: {ohp: true}, floors: {ohp: 90}});
  const t = run([], "2026-11-05", () => E.nextTop("ohp"), p);
  assert.equal(t.phase, "test"); assert.equal(t.w, 90);
  assert.equal(run([], "2026-11-05", () => E.nextBackoff("ohp"), p).sets, 0);
  const tested = [S("2026-11-03", "ohp", [R("OHP", "top", [[115, 3]])])];
  assert.equal(run(tested, "2026-11-05", () => E.maxUnknown("ohp"), p), false);
});

test("back-offs: 80% of working max; unclean back-offs at or under that drop 5 lb", () => {
  const top = R("Bench", "top", [[270, 3]]);
  const ok = run([S("2026-11-02", "bench", [top])], "2026-11-05", () => [E.workMax("bench").v, E.nextBackoff("bench")]);
  assert.equal(ok[1].w, Math.round(ok[0] * BACKOFF.pct / 5) * 5); assert.equal(ok[1].sets, BACKOFF.sets);
  const bad = run([S("2026-11-02", "bench", [top, R("Bench", "backoff", [[240, 5], [240, 3, "miss", 5]])])], "2026-11-05", () => E.nextBackoff("bench"));
  assert.equal(bad.w, 240 - BACKOFF.missStep);
});

test("accessories: one more rep per clean session up to the top of the range, then a jump back to the bottom", () => {
  const acc = reps => run([S("2026-11-02", "dead", [R("Legs-up bench", "acc", [[150, reps], [150, reps], [150, reps]])])], "2026-11-05",
    () => E.nextAccInfo("Legs-up bench", "bench", 0.65, 0.7, 6, 8));
  assert.deepEqual([acc(6).w, acc(6).reps], [150, 7]);
  assert.deepEqual([acc(8).w, acc(8).reps], [150 + JUMP.upper, 6]);
});

test("weighted pull-ups: bodyweight reps first (3x5 -> 3x8), then +5 lb at 3 reps, 3 -> 5, +5", () => {
  const pu = (w, reps) => run([S("2026-11-02", "bench", [R("Weighted pull-up", "acc", [[w, reps], [w, reps], [w, reps]])])], "2026-11-05", () => E.pullPlan("Weighted pull-up"));
  assert.deepEqual([pu(0, PULL_BW.lo).w, pu(0, PULL_BW.lo).reps], [0, PULL_BW.lo + 1]);
  assert.deepEqual([pu(0, PULL_BW.hi).w, pu(0, PULL_BW.hi).reps], [PULLING.addStep, PULLING.addedLo]);
  assert.deepEqual([pu(5, 4).w, pu(5, 4).reps], [5, 5]);
  assert.deepEqual([pu(5, PULLING.addedHi).w, pu(5, PULLING.addedHi).reps], [5 + PULLING.addStep, PULLING.addedLo]);
});

test("max hangs: earn hangs 4 -> 5 -> 6, then one plate and back to 4; B is ~80% of A's total load", () => {
  const h = (added, hangs, clean) => S("2026-11-03", "limit", [], {fingers: {done: true, added, hangs, clean, light: false}, bw: 180});
  const a = run([h(10, HANGS.lo, true)], "2026-11-05", () => E.fingerInfo());
  assert.deepEqual([a.a, a.ha], [10, HANGS.lo + 1]);
  const b = run([h(10, HANGS.hi, true)], "2026-11-05", () => E.fingerInfo(), prof({plates: NO25}));
  assert.deepEqual([b.a, b.ha], [15, HANGS.lo]);
  assert.equal(b.b, Math.round(((180 + 15) * HANG.bPct - 180) / 5) * 5);
  const c = run([h(10, 5, false)], "2026-11-05", () => E.fingerInfo());
  assert.deepEqual([c.a, c.ha], [10, 5]);
});

test("wrist curls: reps first, then one 5 lb step; pain above 5 steps down", () => {
  const w = (reps, sets, pain) => run([S("2026-11-03", "bench", [], {wb: {done: true, phase: 1, ext: {w: 15, reps, sets}, flex: {w: 20, reps, sets}}, wristPain: pain})], "2026-11-05", () => E.nextWrist());
  assert.equal(w(WRIST.top[1], WRIST.sets[1], 1).ext, 15 + WRIST.step);
  assert.equal(w(10, 3, 1).ext, 15);
  assert.equal(w(WRIST.top[1], WRIST.sets[1], 6).ext, 10);
});

test("only the planned sets judge progression: an extra set doesn't spoil a clean row, a lighter day doesn't count", () => {
  const extra = R("Bench", "top", [[270, 3], [280, 1, "miss", 1]], {ps: 1, pw: 270});
  const v = E.progView(extra); assert.equal(v.clean, true); assert.equal(v.w, 270); assert.equal(v.extra, 1);
  const light = R("Bench", "top", [[250, 3]], {ps: 1, pw: 270});
  assert.equal(E.progView(light).under, true);
});

test("plan days: bench waits 2 days after bench; the floor counts this week's sessions", () => {
  const log = [S("2026-11-02", "bench", [R("Bench", "top", [[270, 3]])], {day: "bench", wb: {done: true}})];
  const g = run(log, "2026-11-03", () => E.gates().find(x => x.key === "vol"));
  assert.equal(g.wait, 1);
  const f = run(log, "2026-11-03", () => E.floorCheck());
  assert.deepEqual(f.map(x => x.v), [1, 0, 0, 1]);
});
