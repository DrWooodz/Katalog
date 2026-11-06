/* The frozen simulator still loads and passes its own model checks (28 of 30 at v30; the two known failures are
   sumo trunk angle and wide-grip triceps, see the roadmap). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

test("sim.js model checks: at least 28 of 30 pass", () => {
  const code = readFileSync(new URL("../src/frozen/sim.js", import.meta.url), "utf8");
  const ctx = {console, Math, JSON, Date}; ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx); vm.runInContext(code, ctx, {filename: "sim.js"});
  const res = ctx.SLSimEngine.runChecks();   // without a DOM, sim.js exposes only its engine
  const pass = res.filter(c => c.pass).length;
  assert.ok(res.length >= 30, "expected 30 checks, got " + res.length);
  assert.ok(pass >= 28, "only " + pass + "/" + res.length + " pass: " + res.filter(c => !c.pass).map(c => c.name).join("; "));
});
