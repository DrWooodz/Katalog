import { REF, S, adaptive, daysAgo, deloadOn, inRef, liftName, sorted } from "../core/state.js";
import { epley, fmtDate, num, r5 } from "../core/util.js";
import { REGION } from "../data/plans.js";
import { BARBELL_LIFTS, MAIN, TYPES } from "../data/types.js";
import { BACKOFF, MAXMODE, DELOAD, MAINT, REENTRY, TOP, TOP_REPS_MAX, WORKMAX, pct, pctOff } from "../data/rules.js";
import { barStep, isMaint, jumpFor, planTarget, repsFirst, toBar, upBar } from "./plan.js";
import { cleanSets, r1, rowsOf, topRows } from "./sets.js";

/* Working max: in adaptive mode, the best e1RM from clean sets (≤10 reps) in your last 3 sessions of that lift within 6 weeks.
   Falls back to the saved max when there's nothing recent. Max mode always uses the saved max. */
export function workMax(key){
  const orm = S.profile.oneRM[key];
  if (!adaptive()) return {v:orm, src:"saved max"};
  const lift = liftName(key), rows = [];
  sorted().forEach(s=>{ if (daysAgo(s.date)>WORKMAX.days) return; (s.lifts||[]).forEach(l=>{ if (l.lift===lift) cleanSets(l).forEach(x=>{ if (x.reps<=WORKMAX.maxReps) rows.push({date:s.date, w:x.w, reps:x.reps}); }); }); });
  const dates = [...new Set(rows.map(r=>r.date))].slice(0,WORKMAX.sessions);
  const recent = rows.filter(r=>dates.includes(r.date));
  if (!recent.length) return {v:orm, src:"saved max (no recent clean sets)"};
  const best = recent.reduce((m,r)=> epley(r.w,r.reps)>epley(m.w,m.reps) ? r : m);
  return {v:Math.round(epley(best.w,best.reps)), src:"from "+best.w+"×"+best.reps+" on "+fmtDate(best.date)};
}
/* unknown max: flagged as a placeholder and never tested with a clean set. Its base max is the best logged e1RM, else the floor. */
export function bestLoggedE1(key){ const lift = liftName(key); let b = 0; S.sessions.filter(inRef).forEach(s=>(s.lifts||[]).forEach(l=>{ if (l.lift===lift) cleanSets(l).forEach(x=>{ if (x.reps<=WORKMAX.maxReps) b = Math.max(b, epley(x.w, x.reps)); }); })); return Math.round(b); }
export const maxUnknown = key => !!((S.profile.unknown||{})[key]) && !bestLoggedE1(key);
export function baseMax(key){ if ((S.profile.unknown||{})[key]){ const b = bestLoggedE1(key); return b || num((S.profile.floors||{})[key]) || S.profile.oneRM[key]; } return S.profile.oneRM[key]; }
export function readyAdj(key, o){
  const rd = (REF && REF.ready) || S.ready;
  if (!adaptive() || rd[REGION[key]]!=="y" || deloadOn()) return o;
  return Object.assign(o, {w:r5(o.w*TOP.soSoPct), why:o.why+" · −"+pctOff(TOP.soSoPct)+"% for so-so readiness"});
}
/* Top set prescription. Returns {w, reps, sets, phase, why}. */
export function nextTop(key){ return toBar(nextTopRaw(key)); }
export function nextTopRaw(key){
  const lift = liftName(key), orm = baseMax(key), short = TYPES[key].short.toLowerCase();
  // Test day: the saved max is a placeholder and no clean set has been logged yet. Work up to a clean heavy triple from the floor.
  if (maxUnknown(key)){ const fl = num((S.profile.floors||{})[key]) || r5(orm*0.6), j = jumpFor(key);
    return {w:r5(fl), reps:TOP.reps, sets:1, phase:"test", why:"Test day: your "+short+" max is unknown. After warm-ups, triples from "+r5(fl)+" up in "+j+"–"+(2*j)+" lb jumps; stop at the last solid, clean triple. Your max is then taken from it"}; }
  if (!adaptive()) return deloadOn() ? {w:r5(orm*DELOAD.topPct), reps:TOP.reps, sets:1, why:"Deload: "+pct(DELOAD.topPct)+"% of saved "+orm} : {w:r5(orm*MAXMODE.topPct), reps:TOP.reps, sets:1, why:pct(MAXMODE.topPct)+"% of saved "+orm};
  const wm = workMax(key);
  if (deloadOn()) return {w:r5(wm.v*DELOAD.topPct), reps:TOP.reps, sets:1, phase:"deload", why:"Deload week: "+pct(DELOAD.topPct)+"% of working max, no progression"};
  const all = topRows(lift), tops = all.filter(t=>!t.under), last = tops[0];
  // Re-entry ramp: nothing heavy in 6 weeks (e.g. a lift you haven't trained). 3×5 from ~70%, +10 lb (lower body) or +5 lb (upper) per clean session up to ~85% of saved max.
  const lapsed = all[0] ? daysAgo(all[0].date) > REENTRY.lapseDays : !!(S.profile.detrained||{})[key];
  if (lapsed) return {w:r5(orm*REENTRY.startPct), reps:REENTRY.reps, sets:REENTRY.sets, phase:"reentry", why:"Re-entry: "+(last?"no heavy "+short+" in "+(REENTRY.lapseDays/7)+" weeks":short+" marked as out of practice")+". "+REENTRY.sets+"×"+REENTRY.reps+" at "+pct(REENTRY.startPct)+"% of saved max, add weight each clean session"};
  if (!last){ return readyAdj(key, {w:r5(wm.v*TOP.firstPct), reps:TOP.reps, sets:1, why:pct(TOP.firstPct)+"% of working max "+wm.v}); }
  if (last.reps>=REENTRY.reps && last.sets>=REENTRY.sets && last.w < r5(orm*REENTRY.untilPct)){
    return last.clean ? {w:upBar(last.w,key), reps:REENTRY.reps, sets:REENTRY.sets, phase:"reentry", why:"Re-entry: "+last.w+" for "+REENTRY.sets+"×"+REENTRY.reps+" was clean, next loadable jump"}
                      : {w:last.w, reps:REENTRY.reps, sets:REENTRY.sets, phase:"reentry", why:"Re-entry: repeat "+last.w+" until all "+REENTRY.sets+"×"+REENTRY.reps+" are clean"};
  }
  if (isMaint(key)) return readyAdj(key, {w:r5(wm.v*MAINT.topPct), reps:TOP.reps, sets:1, phase:"maint", why:"Maintenance: one heavy triple at ~"+pct(MAINT.topPct)+"% keeps strength"});
  const goalR = planTarget(key).r, gap = daysAgo(last.date);
  // First session back after 10+ days without this lift: repeat the last clean top set before jumping again.
  if (last.clean && gap >= TOP.returnGapDays){ const cl = tops.find(t=>t.clean); return readyAdj(key, {w:cl.w, reps:TOP.reps, sets:1, why:"first "+short+" in "+gap+" days: repeat "+cl.w+"×"+TOP.reps+" before the next jump"}); }
  if (last.clean && last.reps >= Math.min(TOP.reps,goalR)){
    if (repsFirst(key) && last.reps < TOP_REPS_MAX) return readyAdj(key, {w:last.w, reps:last.reps+1, sets:1, why:"last "+last.w+"×"+last.reps+" was clean: add a rep. Your plates jump the bar "+barStep()+" lb, so earn reps first ("+TOP.reps+"→"+TOP_REPS_MAX+"), then +"+barStep()});
    const nw = upBar(last.w, key);
    return readyAdj(key, {w:nw, reps:TOP.reps, sets:1, why:"last "+last.w+"×"+last.reps+" was clean, +"+(nw-last.w)+" and back to "+TOP.reps+" reps"});
  }
  const misses = tops.filter((t,i)=> i<TOP.missesToDrop && t.w===last.w && !t.clean).length;
  if (misses>=TOP.missesToDrop) return readyAdj(key, {w:r5(last.w*TOP.dropTo), reps:TOP.reps, sets:1, why:"missed "+last.w+" twice, rebuild"});
  return readyAdj(key, {w:last.w, reps:TOP.reps, sets:1, why:"repeat "+last.w+" until it's clean"});
}
export function nextBackoff(key){ return toBar(nextBackoffRaw(key)); }
export function nextBackoffRaw(key){
  const orm = S.profile.oneRM[key], top = nextTop(key);
  if (top.phase==="reentry") return {w:0, sets:0, why:"No back-offs during re-entry; the 3×5 is the work"};
  if (top.phase==="test") return {w:0, sets:0, why:"No back-offs on a test day"};
  if (!adaptive()) return {w:r5(orm*MAXMODE.backoffPct), sets:deloadOn()?DELOAD.backoffSets:BACKOFF.sets, why:pct(MAXMODE.backoffPct)+"% of saved max"};
  const wm = workMax(key), base = r5(wm.v*BACKOFF.pct);
  if (deloadOn()) return {w:base, sets:DELOAD.backoffSets, why:"Deload: one back-off set"};
  if (top.phase==="maint") return {w:r5(wm.v*MAINT.backoffPct), sets:1, why:"Maintenance: one set at "+pct(MAINT.backoffPct)+"%"};
  const last = rowsOf(liftName(key), l=>l.role==="backoff").filter(r=>!r.under)[0];
  if (last && !last.clean && last.w <= base) return {w:r5(last.w-BACKOFF.missStep), sets:BACKOFF.sets, why:"last back-offs at "+last.w+" weren't clean, −"+BACKOFF.missStep};
  return {w:base, sets:BACKOFF.sets, why:pct(BACKOFF.pct)+"% of working max "+wm.v};
}
/* Accessories: double progression, no microloading. Earn the top of the rep range on every set at a weight, then jump
   (+5 upper / +10 lower) and drop back to the bottom of the range. Held near a cap (a share of the main lift's working max) so they
   don't eat into its recovery: at the cap the weight holds, it never takes weight off something you're already doing clean, and it
   rises as your max does. */
export function nextAccInfo(lift, key, pct, cap, lo, hi){ const o = nextAccInfoRaw(lift, key, pct, cap, lo, hi); return BARBELL_LIFTS[lift] ? toBar(o) : o; }
export function nextAccInfoRaw(lift, key, pct, cap, lo, hi){
  lo = lo || 6; hi = hi || Math.max(lo, 8);
  const base = r5(baseMax(key)*pct), short = TYPES[key].short.toLowerCase(), j = BARBELL_LIFTS[lift] ? Math.max(jumpFor(key), barStep()) : jumpFor(key);
  if (!adaptive()) return {w:base, reps:lo, why:Math.round(pct*100)+"% of saved "+short+" max"};
  const wm = workMax(key), ceil = r5(wm.v*cap);
  const last = rowsOf(lift, ()=>true).filter(r=>!r.under)[0];
  if (!last) return {w:r5(wm.v*pct), reps:lo, why:Math.round(pct*100)+"% of "+short+" working max "+wm.v+", "+lo+"–"+hi+" reps"};
  const tg = Math.max(r1(last.reps), Array.isArray(last.sl) && last.sl.length ? Math.max.apply(null, last.sl.map(x=>r1(x.tgt))) : 0) || lo;
  const lw = r1(last.w), reps = Math.min(hi, Math.max(lo, tg));
  if (!last.clean) return {w:lw, reps, why:"repeat "+lw+"×"+reps+" until every set is clean"};
  if (reps < hi) return {w:lw, reps:reps+1, why:"last "+lw+"×"+reps+" was clean: add a rep (up to "+hi+"), then +"+j};
  if (lw+j <= ceil) return {w:lw+j, reps:lo, why:"earned "+lw+"×"+hi+": +"+j+" and back to "+lo+" reps"};
  return {w:lw, reps:hi, why:"hold "+lw+"×"+hi+": at the cap ("+Math.round(cap*100)+"% of "+short+" working max "+wm.v+"), rises as that max does"};
}
export const nextAcc = (lift, key, pct, cap) => nextAccInfo(lift, key, pct, cap).w;
export function stalled(key){
  const lift = Object.keys(MAIN).find(k=>MAIN[k]===key);
  const t = topRows(lift).filter(x=>!x.under).slice(0,TOP.stallTops);
  return t.length===TOP.stallTops && t.every(x=>!x.clean);
}
