/* The progression logic as plain functions of a log, for tests and for anyone reading the rules.
   The app keeps one live state (S in core/state.js) that the logic reads; withLog() swaps a given log into it, runs
   fn "as of" a date (only sessions on or before that date count, exactly like the log form plans a session), and puts
   the app's state back. Nothing is written anywhere.

     withLog({sessions, profile, date:"2026-11-10"}, () => nextTop("bench"))   ->  {w, reps, sets, phase, why}
*/
import { S, asOf } from "../core/state.js";
import { mergeProfile } from "./profile.js";

export function withLog({sessions = [], profile = null, ready = null, date}, fn){
  const keep = {sessions:S.sessions, profile:S.profile, ready:S.ready};
  S.sessions = sessions;
  S.profile = mergeProfile(profile);
  const rd = ready || {fingers:"g", back:"g", press:"g"};
  S.ready = Object.assign({d:date}, rd);
  try{ return asOf({date, id:null, created:Number.MAX_SAFE_INTEGER, readiness:rd}, fn); }
  finally{ S.sessions = keep.sessions; S.profile = keep.profile; S.ready = keep.ready; }
}
export { nextTop, nextBackoff, nextAccInfo, workMax, stalled, baseMax, maxUnknown } from "./progression.js";
export { pullPlan, planFor, newDraft } from "./draft.js";
export { fingerInfo, limitTargets, projectMap } from "./climb.js";
export { nextWrist, nextHand } from "./wrist.js";
export { suggestion, gates, floorCheck } from "./week.js";
export { fatigue, planStatus, findPRs, e1Series } from "./status.js";
export { progView, cleanSets, deriveRow, ensureSL, setClean } from "./sets.js";
export { curPlan, planWeek, rBar, barStep, repsFirst } from "./plan.js";
