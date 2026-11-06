/* Your real logs, checked on your machine only. Put an export from the app (Setup -> Save backup file) at
   local/backup.json; local/ is ignored by git, so it never reaches the public repo. The first run saves what the code
   prescribes to local/real.expected.json; later runs fail if a code change alters any prescription for your log. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { report } from "./report.js";

const LOG = new URL("../local/backup.json", import.meta.url), EXP = new URL("../local/real.expected.json", import.meta.url);
const DATES = ["2026-11-06", "2026-11-10", "2026-11-20", "2026-12-20"];

test("real log: prescriptions unchanged (local/backup.json)", {skip: !existsSync(LOG) && "no local/backup.json"}, () => {
  const log = JSON.parse(readFileSync(LOG, "utf8"));
  const got = JSON.parse(JSON.stringify(Object.fromEntries(DATES.map(d => [d, report(log, d)]))));
  const weights = JSON.stringify(got).match(/"w":(-?[\d.]+)/g) || [];
  assert.ok(!/NaN|null,"reps":null/.test(JSON.stringify(got.top)), "a top-set prescription is empty");
  assert.ok(weights.every(w => isFinite(+w.split(":")[1])), "a weight is not a number");
  if (process.env.UPDATE || !existsSync(EXP)){ mkdirSync(new URL("../local/", import.meta.url), {recursive: true}); writeFileSync(EXP, JSON.stringify(got, null, 1)); return; }
  const want = JSON.parse(readFileSync(EXP, "utf8"));
  for (const d of DATES) assert.deepEqual(got[d], want[d], "date " + d);
});
