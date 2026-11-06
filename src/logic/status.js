/* Fatigue signals, plan end conditions (planStatus), PRs, bodyweight by date (bwAt), e1RM series. */
import { S, daysAgo, deloadOn, liftName, sorted } from "../core/state.js";
import { epley, gradeN, num } from "../core/util.js";
import { MAIN, TYPES } from "../data/types.js";
import { curPlan, planLifts, planStart, planTarget, planWeek } from "./plan.js";
import { cleanSets, progView, topRows } from "./sets.js";

/* ---------- fatigue monitor, deloads, block status, PRs, bodyweight ---------- */
export function fatigue(){
  const sig = [], p = S.profile, focus = planLifts();
  const heavy = sorted().filter(s=>["bench","dead","squat","ohp"].includes(s.type) && daysAgo(s.date)<=21).slice(0,4);
  const missed = heavy.reduce((t,s)=>t+(s.lifts||[]).filter(l=>{ if (l.role!=="top" || !l.w) return false; const v = progView(l); return !v.clean && !v.under; }).length,0);
  if (missed>=2) sig.push(missed+" unclean top sets in your last "+heavy.length+" heavy sessions");
  focus.forEach(k=>{
    const ser = e1Series(liftName(k)); if (ser.length<3) return;
    const last = ser[ser.length-1]; if (daysAgo(last.x)>10) return;
    const best = Math.max.apply(null, ser.filter(x=>daysAgo(x.x)<=42).map(x=>x.y));
    if (last.y < best*0.95) sig.push(TYPES[k].short+" e1RM is "+Math.round((1-last.y/best)*100)+"% under its 6-week best");
  });
  const rs = sorted().filter(s=>s.readiness).slice(0,6);
  const off = rs.filter(s=>Object.values(s.readiness).some(v=>v!=="g")).length;
  if (rs.length>=4 && off>=Math.ceil(rs.length/2)) sig.push("so-so or red readiness in "+off+" of your last "+rs.length+" sessions");
  const lim = sorted().filter(s=>s.type==="limit" && s.climb && s.climb.stop).slice(0,3);
  if (lim.filter(s=>["fingers","power"].includes(s.climb.stop)).length>=2) sig.push("2 of your last 3 limit sessions ended on fingers or power");
  const wp = sorted().find(s=>s.wristPain!=="" && s.wristPain!=null);
  if (wp && +wp.wristPain>5 && daysAgo(wp.date)<=7) sig.push("wrist pain "+wp.wristPain+"/10 this week");
  const rp = sorted().filter(s=>num(s.rpe)!=null).slice(0,5);
  if (rp.length>=4){ const a = rp.reduce((t,s)=>t+num(s.rpe),0)/rp.length; if (a>=8.5) sig.push("average session effort "+a.toFixed(1)+"/10 over your last "+rp.length+" sessions"); }
  const since = p.lastDeload || (S.sessions.length ? S.sessions.map(x=>x.date).sort()[0] : null);
  const sessSince = since ? S.sessions.filter(s=>s.date>since).length : 0;
  if (since && daysAgo(since)>=56 && sessSince>=24) sig.push(Math.floor(daysAgo(since)/7)+" weeks of training since your last deload");
  return {signals:sig, recommend: !deloadOn() && sig.length>=2};
}
/* where the current plan stands against its end conditions: targets hit cleanly (twice each), a stall, or its week cap */
export function hitDates(key, since){ const g = planTarget(key), lift = liftName(key);
  return [...new Set(sorted().filter(s=>s.date>=since && (s.lifts||[]).some(l=>l.lift===lift && cleanSets(l).some(x=>x.w>=g.w && x.reps>=g.r))).map(s=>s.date))]; }
export function stalledSince(key, since){ const t = topRows(liftName(key)).filter(x=>!x.under && x.date>=since).slice(0,3); return t.length===3 && t.every(x=>!x.clean); }
export function planStatus(){
  const P = curPlan(), start = planStart(), keys = planLifts(), E = P.end || {};
  const hits = keys.map(k=>hitDates(k, start).length), wk = planWeek();
  const stalls = keys.filter(k=>stalledSince(k, start));
  const goalsMet = keys.length && hits.every(n=>n>=(E.hits||2));
  const stuck = E.stall==="any" ? stalls.length>0 : (stalls.length && stalls.length===keys.length);
  const capped = E.weeks && wk > E.weeks;
  return {keys, hits, stalls, week:wk, done: !!(goalsMet || stuck || capped),
    why: goalsMet ? "both targets hit cleanly "+(E.hits||2)+" times" : stuck ? stalls.map(k=>TYPES[k].short).join(" and ")+" stalled (3 unclean top sets in a row)" : capped ? "reached its "+E.weeks+"-week cap" : ""};
}
export function bestBefore(id, date){
  const prior = S.sessions.filter(s=>s.id!==id && s.date<=date);
  const out = {lift:{}, hang:0, grade:-1, hold:{}};
  prior.forEach(s=>{
    (s.lifts||[]).forEach(l=>{ if (MAIN[l.lift]) cleanSets(l).forEach(x=>{ if (x.reps<=10) out.lift[l.lift] = Math.max(out.lift[l.lift]||0, epley(x.w,x.reps)); }); });
    if (s.fingers && s.fingers.done && !s.fingers.light && s.fingers.clean){ const bw = num(s.bw)||bwAt(s.date); out.hang = Math.max(out.hang, (bw+(num(s.fingers.added)||0))/bw); }
    const g = s.climb && s.climb.on ? gradeN(s.climb.send) : null; if (g!=null) out.grade = Math.max(out.grade, g);
    if (s.hs && s.hs.done && num(s.hs.best)){ const L = s.hs.level||1; out.hold[L] = Math.max(out.hold[L]||0, num(s.hs.best)); }
  });
  return {out, any: prior.length>0};
}
export function findPRs(d){
  const {out:b, any} = bestBefore(d.id, d.date), prs = [];
  if (!any) return prs;
  const mine = {};
  (d.lifts||[]).forEach(l=>{ if (MAIN[l.lift]) cleanSets(l).forEach(x=>{ if (x.reps<=10) mine[l.lift] = Math.max(mine[l.lift]||0, epley(x.w,x.reps)); }); });
  Object.keys(mine).forEach(L=>{ if (b.lift[L] && Math.round(mine[L]) > Math.round(b.lift[L])) prs.push(L+" e1RM "+Math.round(mine[L])+" (+"+Math.round(mine[L]-b.lift[L])+")"); });
  if (d.fingers && d.fingers.done && !d.fingers.light && d.fingers.clean){ const bw = num(d.bw)||bwAt(d.date), r = (bw+(num(d.fingers.added)||0))/bw; if (b.hang && r > b.hang+0.004) prs.push("Hang load "+r.toFixed(2)+"× BW"); }
  const g = d.climb && d.climb.on ? gradeN(d.climb.send) : null; if (g!=null && b.grade>=0 && g > b.grade) prs.push("First V"+g+" send");
  if (d.hs && d.hs.done && num(d.hs.best)){ const L = d.hs.level||1; if (b.hold[L] && num(d.hs.best) > b.hold[L]) prs.push("Handstand L"+L+" hold "+d.hs.best+" s"); }
  return prs;
}
/* bodyweight on a date: that day's entry, else the latest one before it, else the earliest one, else the profile value */
export function bwAt(date){
  const ser = bwSeries(); let v = null;
  for (const p of ser){ if (p.x <= date) v = p.y; else break; }
  return v != null ? v : (ser.length ? ser[0].y : (S.profile.bw || 175));
}
export function bwSeries(){
  const m = {};
  (S.profile.bwLog||[]).forEach(x=>{ if (x && x.d && num(x.w)) m[x.d] = num(x.w); });
  S.sessions.forEach(s=>{ if (num(s.bw)) m[s.date] = num(s.bw); });
  return Object.keys(m).sort().map(x=>({x, y:m[x]}));
}
export function e1Series(lift){
  const byDate = {};
  S.sessions.forEach(s=>(s.lifts||[]).forEach(l=>{ if (l.lift===lift) cleanSets(l).forEach(x=>{ if (x.reps<=10){ const e = epley(x.w,x.reps); if (!byDate[s.date]||e>byDate[s.date]) byDate[s.date]=e; } }); }));
  return Object.keys(byDate).sort().map(x=>({x, y:Math.round(byDate[x])}));
}
