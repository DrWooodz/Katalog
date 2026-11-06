import { S, adaptive, asOf, deloadOn, lastWhere, liftName, refDay } from "../core/state.js";
import { epley, r5, today, uid } from "../core/util.js";
import { PDAY } from "../data/plans.js";
import { ACC_PLAN, BO_REPS, MAIN, PULL, PULL_BW, TYPES } from "../data/types.js";
import { fingerInfo, newProb } from "./climb.js";
import { barStep, planDayList, rBar } from "./plan.js";
import { nextAccInfo, nextBackoff, nextTop, workMax } from "./progression.js";
import { mkSets, r1, rowsOf, stampPlan, wLabel } from "./sets.js";
import { bwAt } from "./status.js";
import { doneDayIds } from "./week.js";
import { newHand, newWrist } from "./wrist.js";

export function pullPlan(lift){
  const P = PULL[lift], dl = deloadOn(), bw = bwAt(refDay());
  const last = rowsOf(lift, ()=>true).filter(r=>!r.under)[0];
  const lw = last ? r1(last.w) : 0, lt = lw ? "+"+lw : "BW";
  const tg = last ? Math.max(r1(last.reps), Array.isArray(last.sl) && last.sl.length ? Math.max.apply(null, last.sl.map(x=>r1(x.tgt))) : 0) : 0;
  if (P.mode==="heavy"){
    if (!last) return {w:0, reps:PULL_BW.lo, sets:dl?2:3, why:"First time: bodyweight, 3×"+PULL_BW.lo+". Earn bodyweight reps before adding load"};
    if (dl) return {w:lw, reps:lw ? 3 : Math.max(PULL_BW.lo, tg), sets:2, why:"Deload: same load, 2 sets"};
    if (!lw){
      const r = Math.max(PULL_BW.lo, tg||PULL_BW.lo);
      if (!last.clean) return {w:0, reps:r, sets:3, why:"repeat bodyweight 3×"+r+" until every set is clean"};
      if (r < PULL_BW.hi) return {w:0, reps:r+1, sets:3, why:"bodyweight 3×"+r+" was clean: add a rep (bodyweight reps first, up to 3×"+PULL_BW.hi+")"};
      return {w:5, reps:3, sets:3, why:"earned bodyweight 3×"+PULL_BW.hi+": add 5 lb and restart at 3 reps"};
    }
    if (last.clean) return tg>=5 ? {w:lw+5, reps:3, sets:3, why:"last "+lt+" 3×5 clean, add 5 lb and restart at 3 reps"} : {w:lw, reps:tg+1, sets:3, why:"last "+lt+" for "+tg+" was clean, add a rep"};
    return {w:lw, reps:tg||5, sets:3, why:"repeat "+lt+" for "+(tg||5)+" until every set is clean"};
  }
  if (P.mode==="fast"){
    const cap = r5(bw*0.10);
    if (!last) return {w:0, reps:3, sets:dl?3:5, why:"Bodyweight, 5×3. Pull as fast as you can on every rep and stop the set when one slows"};
    if (dl) return {w:lw, reps:3, sets:3, why:"Deload: same load, 3 sets"};
    if (last.clean && lw+5 <= cap) return {w:lw+5, reps:3, sets:5, why:"last sets were all fast, +5 (cap "+cap+" lb ≈ 10% BW)"};
    return {w:lw, reps:3, sets:5, why:last.clean ? "at the "+cap+" lb (≈10% BW) cap: keep speed, don't add load" : "repeat: every rep must stay fast"};
  }
  const rj = Math.max(5, barStep()), start = rBar(workMax("bench").v*0.5), rr = Math.min(10, Math.max(8, tg||8));
  if (!last) return {w:start, reps:8, sets:dl?2:3, why:"Starting guess ~50% of bench working max. Flat back, bar to lower ribs, adjust after set 1"};
  if (dl) return {w:lw, reps:8, sets:2, why:"Deload: same load, 2 sets"};
  if (!last.clean) return {w:lw, reps:rr, sets:3, why:"repeat "+lw+" until 3×"+rr+" are clean"};
  return rr < 10 ? {w:lw, reps:rr+1, sets:3, why:"last "+lw+" 3×"+rr+" was clean: add a rep (up to 10), then +"+rj} : {w:rBar(lw+rj), reps:8, sets:3, why:"earned "+lw+" 3×10: +"+rj+" and back to 8"};
}
/* Dead and squat days carry ONE other pull, rotating whichever was done least recently, so lower days stay cheap */
export function didLift(lift){ return s => (s.lifts||[]).some(l=>l.lift===lift && ((Array.isArray(l.sl) && l.sl.some(x=>x.st)) || l.done)); }
export function pullAlt(pref){
  const alt = pref==="Fast pull-up" ? "Bent-over row" : "Fast pull-up";
  const dp = lastWhere(didLift(pref)), da = lastWhere(didLift(alt));
  if (dp==null) return pref;
  if (da==null) return alt;
  return da < dp ? alt : pref;
}
/* the plan day a draft is for: its own stamp, else the first day of the current plan with that session type */
export function daySpecFor(type, dayId){
  if (dayId && PDAY[dayId]) return PDAY[dayId];
  const L = planDayList().filter(x=>x.type===type); if (!L.length) return null;
  if (type==="bench"){ const done = doneDayIds(); const nd = L.find(x=>!done.has(x.id)); return nd || L[0]; }
  return L[0];
}
/* the plan's override for one row (e.g. bench volume is 3 sets of back-offs) */
export function rowOverride(l, d){ const sp = d && d.day && PDAY[d.day]; if (!sp) return null; const r = sp.rows.find(x=>x[0]===l.lift && x[1]===l.role); return r && r[2] || null; }
/* the prescription for one row, as of the draft's date */
export function planFor(l, d){
  return asOf(d, ()=>{ const key = MAIN[l.lift], ov = rowOverride(l, d) || {};
    if (key && l.role==="top"){ const t = nextTop(key); return {w:t.w, reps:t.reps, sets:t.sets, why:t.why}; }
    if (key && l.role==="backoff"){ const b = nextBackoff(key); return b.sets ? {w:b.w, reps:ov.reps || BO_REPS[key], sets:ov.sets && !deloadOn() ? ov.sets : b.sets, why:b.why+(ov.sets && !deloadOn() ? " · volume day: "+ov.sets+" sets" : "")} : null; }
    if (PULL[l.lift] && l.role==="acc") return pullPlan(l.lift);
    const A = ACC_PLAN[l.lift]; if (A && l.role==="acc"){ const a = nextAccInfo(l.lift, A[0], A[1], A[2], A[3], A[4]); return {w:a.w, reps:a.reps, sets:deloadOn() ? 2 : 3, why:a.why}; }
    return null; });
}
export function defaultRows(type, spec){
  const row = (lift,w,reps,sets,role) => { const r = {lift,role,sl:mkSets(w,reps,sets,MAIN[lift]||ACC_PLAN[lift]||PULL[lift]),w,reps,sets,clean:false}; if ((MAIN[lift] && role!=="acc") || ((ACC_PLAN[lift] || PULL[lift]) && role==="acc")) stampPlan(r, {w, sets}); return r; };
  const pull = lift => { const p = pullPlan(lift); return row(lift, p.w, p.reps, p.sets, "acc"); };
  const accSets = deloadOn() ? 2 : 3;
  const acc = lift => { const A = ACC_PLAN[lift], a = nextAccInfo(lift, A[0], A[1], A[2], A[3], A[4]); return row(lift, a.w, a.reps, accSets, "acc"); };
  const main = (key, boReps) => {
    const t = nextTop(key), b = nextBackoff(key), out = [row(liftName(key), t.w, t.reps, t.sets, "top")];
    if (b.sets) out.push(row(liftName(key), b.w, boReps, b.sets, "backoff"));
    return out;
  };
  /* a plan day lays out its own rows */
  if (spec){
    const out = [];
    spec.rows.forEach(([lift, role, ov])=>{ ov = ov || {}; const key = MAIN[lift];
      if (key && role==="top"){ const t = nextTop(key); out.push(row(lift, t.w, t.reps, t.sets, "top")); }
      else if (key && role==="backoff"){ const b = nextBackoff(key); if (b.sets) out.push(row(lift, b.w, ov.reps || BO_REPS[key], ov.sets && !deloadOn() ? ov.sets : b.sets, "backoff")); }
      else if (PULL[lift]) out.push(pull(lift));
      else if (ACC_PLAN[lift]) out.push(acc(lift)); });
    return out;
  }
  if (type==="bench") return main("bench",5).concat([acc("RDL"), pull("Weighted pull-up")]);
  if (type==="dead") return main("dead",4).concat([acc("Legs-up bench"), pull(pullAlt("Fast pull-up"))]);
  if (type==="squat") return main("squat",5).concat([row("Bench",nextTop("bench").w,3,1,"acc"), pull(pullAlt("Bent-over row"))]);
  if (type==="ohp") return main("ohp",8).concat([row("Deadlift",nextTop("dead").w,3,1,"acc"), pull("Weighted pull-up")]);
  if (type==="other") return [row("Bench",0,5,3,"acc")];
  return [];
}
export function newDraft(type, fingers, base, dayId){
  const d0 = {id:(base && base.id) || uid(), date:(base && base.date) || today(), created:(base && base.created) || Date.now(), readiness:(base && base.readiness) || {fingers:S.ready.fingers, back:S.ready.back, press:S.ready.press}};
  return asOf(d0, ()=>{
  const fi = fingerInfo(), sp = daySpecFor(type, dayId);
  const climbs = sp ? sp.climb : (type==="limit"||type==="light");
  /* hangs: a plan day says A, B or none; "fingers" from Today can switch them off when fingers aren't ready */
  const hPlan = sp ? (!!sp.hangs && (fingers==null || !!fingers)) : (fingers==null ? (type!=="limit" && type!=="other") : !!fingers);
  const light = sp && sp.hangs ? (sp.hangs==="B" || !!fi.deload || !!fi.back) : ((fi.week>=1)||!!fi.deload);
  const out = {
    id:d0.id, date:d0.date, type, created:d0.created,
    readiness:d0.readiness,
    lifts:defaultRows(type, sp),
    fingers:{done:false, plan:hPlan, edge:S.profile.edge||20, light, added:light?fi.b:fi.a, secs:10, hangs:light ? fi.hb : fi.ha, clean:false, test:false},
    climb:{on:climbs, send:"", tried:"", attempts:"", problems:"", list: type==="limit" ? [newProb()] : [], stop:""},
    wb: Object.assign(newWrist(false), {plan: sp ? sp.wrist : (type==="bench"||type==="dead"||type==="squat"||type==="ohp")}),
    hs: Object.assign(newHand(false), {plan: sp ? sp.hs : type==="light"}),
    wristPain:"", wrist:false, handstand:false, bw:"", notes:""
  };
  if (sp) out.day = sp.id;
  return out;
  });
}
export function pctText(l){
  if (wLabel(l.lift, 0)){ const bw = bwAt(refDay()), tot = bw + r1(l.w); return "Total load "+Math.round(tot)+" lb = "+(tot/bw).toFixed(2)+"× bodyweight"+(l.reps?" · e1RM total "+Math.round(epley(tot,l.reps)):""); }
  if (l.lift==="Bent-over row"){ const wm = workMax("bench").v; return l.w ? Math.round(l.w/wm*100)+"% of bench working max "+wm : ""; }
  const key = MAIN[l.lift] || (l.lift==="RDL"||l.lift==="Tempo deadlift"?"dead":(l.lift==="Legs-up bench"||l.lift==="Tempo bench"?"bench":null));
  if (!key || !l.w) return "";
  const wm = workMax(key).v;
  return Math.round(l.w/wm*100)+"% of "+TYPES[key].short.toLowerCase()+(adaptive()?" working max ":" saved max ")+wm+(l.reps?" · e1RM "+Math.round(epley(l.w,l.reps)):"");
}
