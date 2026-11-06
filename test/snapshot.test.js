/* Pins every prescription the logic makes from the synthetic log, across dates and settings.
   The expected file was produced from code whose rendered output matched Send Log v32 on real and synthetic logs.
   If you change a rule on purpose: UPDATE=1 node --test test/snapshot.test.js, then review the diff of
   test/fixtures/synthetic.expected.json in the commit. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { report } from "./report.js";

const FIX = new URL("./fixtures/synthetic.json", import.meta.url);
const EXP = new URL("./fixtures/synthetic.expected.json", import.meta.url);
const log = JSON.parse(readFileSync(FIX, "utf8"));
export const DATES = ["2026-09-30", "2026-10-20", "2026-11-06", "2026-11-10", "2026-12-20"];
export const VARIANTS = {
  base: {}, plates25: {plates: [45, 35, 25, 10, 5, 2.5]}, deload: {deloadUntil: "2026-12-31"}, maxMode: {mode: "max"},
  oldPlan: {plan: {id: "bd", start: "2026-10-01"}}, days3: {planDays: 3}, days5: {planDays: 5}
};
const READY = {soso: {fingers: "y", back: "y", press: "y"}, red: {fingers: "r", back: "r", press: "r"}};

function all(){
  const out = {};
  for (const [v, patch] of Object.entries(VARIANTS)){
    const L = {sessions: log.sessions, profile: Object.assign({}, log.profile, patch)};
    for (const d of DATES) out[v + "|" + d] = report(L, d);
  }
  for (const [r, rd] of Object.entries(READY)) out["ready-" + r + "|2026-11-10"] = report(log, "2026-11-10", rd);
  return JSON.parse(JSON.stringify(out));
}

test("synthetic log: prescriptions match the pinned snapshot", () => {
  const got = all();
  if (process.env.UPDATE || !existsSync(EXP)){ writeFileSync(EXP, JSON.stringify(got, null, 1) + "\n"); return; }
  const want = JSON.parse(readFileSync(EXP, "utf8"));
  for (const k of Object.keys(want)) assert.deepEqual(got[k], want[k], "scenario " + k);
  assert.deepEqual(Object.keys(got).sort(), Object.keys(want).sort());
});
