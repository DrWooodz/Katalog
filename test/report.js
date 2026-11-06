/* Everything the app would prescribe from a log on a given date, as plain JSON. Used by the snapshot tests
   (synthetic fixture in git, real logs from local/ which git ignores). */
import * as E from "../src/logic/engine.js";
import { PDAY } from "../src/data/plans.js";
import { ACC_PLAN } from "../src/data/rules.js";

const KEYS = ["bench", "dead", "squat", "ohp"];
const strip = o => JSON.parse(JSON.stringify(o, (k, v) => (k === "id" || k === "created") ? undefined : v));

export function report(log, date, ready){
  return E.withLog({sessions: log.sessions, profile: log.profile, date, ready}, () => {
    const out = {date};
    out.top = {}; out.backoff = {}; out.workMax = {};
    KEYS.forEach(k => { out.top[k] = E.nextTop(k); out.backoff[k] = E.nextBackoff(k); out.workMax[k] = E.workMax(k); });
    out.acc = {}; Object.keys(ACC_PLAN).forEach(n => { const A = ACC_PLAN[n]; out.acc[n] = E.nextAccInfo(n, A[0], A[1], A[2], A[3], A[4]); });
    out.pull = {}; ["Weighted pull-up", "Fast pull-up", "Bent-over row"].forEach(n => { out.pull[n] = E.pullPlan(n); });
    const fi = E.fingerInfo(); out.hangs = Object.assign({}, fi, {last: fi.last ? fi.last.date : null});
    out.wrist = E.nextWrist(); out.hand = E.nextHand(); out.limit = E.limitTargets();
    out.suggestion = E.suggestion(); out.gates = E.gates(); out.floor = E.floorCheck();
    out.planStatus = E.planStatus(); out.fatigue = E.fatigue(); out.week = E.planWeek();
    out.drafts = {};
    Object.keys(PDAY).forEach(id => { const d = E.newDraft(PDAY[id].type, undefined, {date, created: Number.MAX_SAFE_INTEGER}, id); out.drafts[id] = strip({lifts: d.lifts, fingers: d.fingers, wb: d.wb, hs: d.hs, climb: d.climb}); });
    return strip(out);
  });
}
