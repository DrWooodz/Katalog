import { S, daysAgo, inRef, isFinger, lastWhere, liftName, refDay } from "../core/state.js";
import { dnStr, mondayN } from "../core/util.js";
import { FLOOR, PDAY } from "../data/plans.js";
import { MAIN, TYPES } from "../data/types.js";
import { GAPS } from "../data/rules.js";
import { curPlan, planDayIds, planDayList } from "./plan.js";
import { workMax } from "./progression.js";
import { workSets } from "./sets.js";

export function readinessBlocks(){
  const r = S.ready;
  return {fingers: r.fingers==="r", back: r.back==="r", press: r.press==="r"};
}
/* ---------- the plan's week (v31) ----------
   Weeks run Monday to Sunday. A session counts as a plan day by its stamp (sessions logged from v31 on) or, for older ones,
   by its type: a bench session with a top set is heavy bench, one without is bench volume. */
export const weekStart = () => dnStr(mondayN(refDay()));
export const thisWeek = () => S.sessions.filter(inRef).filter(s=>s.date>=weekStart() && s.date<=refDay());
export function sessDay(s){
  if (s.day && PDAY[s.day]) return s.day;
  const ids = planDayIds();
  if (s.type==="bench"){ const top = (s.lifts||[]).some(l=>l.lift==="Bench" && l.role==="top"); const h = ids.find(id=>PDAY[id].type==="bench" && (PDAY[id].rows.some(r=>r[1]==="top")===top)); return h || ids.find(id=>PDAY[id].type==="bench") || null; }
  return ids.find(id=>PDAY[id].type===s.type) || null;
}
export function doneDayIds(){ const out = new Set(); thisWeek().forEach(s=>{ const d = sessDay(s); if (d) out.add(d); }); return out; }
/* each plan day's readiness: the gaps the program has always used, plus red readiness */
export function dayGate(sp){
  const blk = readinessBlocks();
  const since = pred => daysAgo(lastWhere(pred));
  const benchS = since(s=>s.type==="bench"), deadS = since(s=>s.type==="dead");
  const fingerS = since(s=>isFinger(s) || s.type==="limit");
  let since0 = null, min = 0, blocked = false, why = "";
  if (sp.type==="bench"){ since0 = benchS; min = GAPS.bench; blocked = blk.press; why = "pressing flagged red"; }
  else if (sp.type==="dead"){ since0 = deadS; min = GAPS.dead; blocked = blk.back; why = "back/legs flagged red"; }
  else if (sp.type==="limit"){ since0 = fingerS; min = GAPS.finger; blocked = blk.fingers; why = "fingers flagged red"; }
  const wait = since0==null ? 0 : Math.max(0, min - since0);
  // hangs on this day: only when fingers aren't red and the last finger day was 2+ days ago
  const hangsOk = !!sp.hangs && !blk.fingers && (fingerS==null || fingerS>=GAPS.finger || sp.type==="limit");
  return {since:since0, min, wait, blocked, blockWhy:why, ready:!blocked && wait===0, hangsOk};
}
export function gates(){
  const done = doneDayIds();
  return planDayList().map((sp, k)=>{ const g = dayGate(sp); return Object.assign({key:sp.id, name:"Day "+(k+1)+" · "+sp.name, done:done.has(sp.id), optional:!!sp.optional}, g); });
}
export function suggestion(){
  const days = planDayList(), done = doneDayIds(), n = days.length;
  const open = days.filter(sp=>!done.has(sp.id));
  const core = open.filter(sp=>!sp.optional);
  const pick = core.find(sp=>dayGate(sp).ready) || (core.length ? null : open.find(sp=>dayGate(sp).ready));
  if (pick){
    const g = dayGate(pick), k = days.indexOf(pick)+1, reasons = ["Day "+k+" of "+n+" this week"];
    if (g.since!=null) reasons.push((pick.type==="limit" ? "last finger day " : "last "+TYPES[pick.type].short.toLowerCase()+" ")+g.since+"d ago");
    if (pick.hangs) reasons.push(g.hangsOk ? "hangs "+pick.hangs+" today" : "skip hangs today ("+(readinessBlocks().fingers ? "fingers flagged" : "too soon after the last finger day")+")");
    return {type:pick.type, day:pick.id, reasons, fingers:!!pick.hangs && g.hangsOk};
  }
  if (!core.length) return {type:"light", day:null, reasons:["this week's plan days are done","anything more is optional: easy climbing, easy aerobic, or rest"], fingers:false, done:true};
  const waits = core.map(sp=>{ const g = dayGate(sp); return sp.name.toLowerCase()+(g.blocked ? " (blocked: "+g.blockWhy+")" : " in "+g.wait+"d"); });
  return {type:"light", day:null, reasons:["nothing in the plan is ready today","next: "+waits.join(", "),"rest, or keep it easy"], fingers:false};
}
/* the floor: what this week still needs. A reminder only; it never blocks anything. */
export const FLOOR_TEST = {
  lift: s => (s.lifts||[]).some(l=>(Array.isArray(l.sl) ? l.sl.some(x=>x.st) : !!(l.w||l.done))),
  climb: s => !!(s.climb && s.climb.on),
  hangs: s => isFinger(s),
  wrist: s => !!((s.wb && s.wb.done) || s.wrist)
};
export function floorCheck(){
  const W = thisWeek();
  return FLOOR.map(f=>{ const v = W.filter(FLOOR_TEST[f.id]).length; return Object.assign({}, f, {v, left:Math.max(0, f.min - v)}); });
}
export function week(){
  const w = S.sessions.filter(s=>{ const a = daysAgo(s.date); return a>=0 && a<7; });
  const P = curPlan(), nd = planDayList().filter(x=>!x.optional).length, nl = planDayList().filter(x=>!x.optional && x.rows.some(r=>MAIN[r[0]] && r[1]==="top")).length;
  const nh = planDayList().filter(x=>x.hs).length;
  return [
    {lab:"Sessions", v:w.length, t:nd+(planDayList().length>nd?"–"+planDayList().length:""), max:Math.max(nd, planDayList().length)},
    {lab:"Finger sessions", v:w.filter(isFinger).length, t:"2", max:2},
    {lab:"Limit bouldering", v:w.filter(s=>s.type==="limit").length, t:"1", max:1},
    {lab:"Heavy lift days", v:w.filter(s=>(s.lifts||[]).some(l=>MAIN[l.lift] && l.role==="top")).length, t:String(nl), max:Math.max(1,nl)},
    {lab:"Wrist block", v:w.filter(s=>s.wrist || (s.wb && s.wb.done)).length, t:"2", max:2},
    {lab:"Handstand sessions", v:w.filter(s=>s.handstand || (s.hs && s.hs.done)).length, t:nh+"+", max:Math.max(1,nh)}
  ].concat(P.emphasis.filter(k=>MAIN[liftName(k)]).map(k=>({lab:TYPES[k].short+" sets ≥80%", v:heavySets(k,7), t:"3–6", max:6})));
}
export function heavySets(key, days){
  const lift = liftName(key), wm = workMax(key).v;
  return S.sessions.filter(s=>{ const a = daysAgo(s.date); return a>=0 && a<days; })
    .reduce((t,s)=>t+(s.lifts||[]).filter(l=>l.lift===lift).reduce((u,l)=>u+workSets(l).filter(x=>x.w>=0.8*wm).length,0),0);
}
