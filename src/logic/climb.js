import { S, adaptive, daysAgo, deloadOn, isFinger, refDay, sorted } from "../core/state.js";
import { num } from "../core/util.js";
import { PROG_RANK } from "../data/types.js";
import { DELOAD, HANG, HANGS, SOLID, pct } from "../data/rules.js";
import { plateStep, rStep } from "./plan.js";
import { bwAt } from "./status.js";

/* Limit bouldering targets from your own limit sessions */
export function limitTargets(){
  const def = {lo:15, hi:30, grade:"V8+", project:"", zone:8, zoneTxt:"V8+", ramp:"V4–V7", why:"default plan", warn:""};
  if (!adaptive()) return def;
  const ls = sorted().filter(s=>s.type==="limit" && s.climb && s.climb.list && s.climb.list.length).slice(0,5);
  const t = Object.assign({}, def);
  const good = ls.filter(s=>["quality","plan",""].includes(s.climb.stop||"")).map(s=>s.climb.list.reduce((a,p)=>a+(num(p.attempts)||0),0)).filter(x=>x>0).sort((a,b)=>a-b);
  if (good.length>=2){
    const m = good[Math.floor(good.length/2)];
    t.lo = Math.max(8, Math.round(m*0.85)); t.hi = Math.max(t.lo+4, Math.round(m*1.15)); t.why = "around your median of "+m+" attempts on good days";
  }
  if (deloadOn()){ t.lo = Math.round(t.lo*0.6); t.hi = Math.round(t.hi*0.6); t.warn = "Deload week: about 60% of your usual attempts, no new project grade."; }
  else if (ls[0] && ls[0].climb.stop==="fingers"){ t.lo = Math.round(t.lo*0.8); t.hi = Math.round(t.hi*0.8); t.warn = "Last session ended on fingers, so volume is cut 20%."; }
  else if (ls[0] && ls[0].climb.stop==="skin"){ t.warn = "Last session ended on skin. Favor less abrasive holds or fewer attempts on sharp problems."; }
  const PM = projectMap();
  let solid = null;
  // solid grade = the hardest grade with 2+ problems sent within 3 tries in the last 90 days. Limit work sits one to two grades above it.
  for (let g=12; g>=0; g--){ if (PM.filter(p=>p.grade==="V"+g && p.sent && p.sentAtt && p.sentAtt<=SOLID.tries && daysAgo(p.last)<=SOLID.days).length>=SOLID.sends){ solid = g; break; } }
  if (solid!=null){ const z = Math.min(12, solid+1), z2 = Math.min(12, solid+2);
    Object.assign(t, {grade:"V"+solid, project:"V"+z, zone:z, zoneTxt:"V"+z+(z2>z?"–V"+z2:""), ramp:"V"+Math.max(0, solid-3)+"–V"+solid}); }
  return t;
}
/* Max hangs, no microloading: at a load, earn hangs first (4 → 5 → 6 clean 10 s hangs), then add one plate step (your smallest
   plate) and go back to 4 hangs. B = ~80% of A's total load, rounded to the plate step. First session after 10+ days off: light. */
export function fingerInfo(){
  const f = sorted().filter(isFinger);
  const bw = bwAt(refDay()), st = plateStep();
  const first = f.length ? f[f.length-1].date : null;
  const ramp = first ? daysAgo(first) < 14 : true;
  const week = f.filter(s=>daysAgo(s.date)<7).length;
  const lastTest = f.find(s=>s.fingers.test);
  const testDue = !lastTest ? f.length>=4 : daysAgo(lastTest.date) > HANG.testEveryDays;
  if (!f.length) return {a:0, b:rStep(bw*HANG.bPct-bw), ha:HANGS.lo, hb:HANGS.lo, ramp:true, week, last:null, testDue:false, why:"Find a load you could hold ~12–14 s, "+HANGS.lo+" hangs"};
  // A = heavy session progression; B = ~80% of A's total load (Devise 2022: 80% kept strength gains and added endurance)
  const lastA = f.find(s=>!s.fingers.light) || f[0];
  const last = lastA.fingers, lastAdd = num(last.added)||0, n = Math.max(HANGS.lo, Math.min(HANGS.hi, num(last.hangs)||HANGS.lo));
  let aLoad = lastAdd, ha = n, why;
  if (!last.clean){ why = "repeat "+(lastAdd>=0?"+":"")+lastAdd+" lb × "+n+" until every hang holds"; }
  else if (n < HANGS.hi){ ha = n+1; why = "last heavy hangs clean: one more hang ("+ha+"), same load"; }
  else { aLoad = lastAdd+st; ha = HANGS.lo; why = "earned "+HANGS.hi+" clean hangs: +"+st+" lb (one plate) and back to "+HANGS.lo; }
  const b = rStep((bw+aLoad)*HANG.bPct - bw), hb = Math.max(HANGS.lo, Math.min(HANGS.hi, ha));
  if (deloadOn()) return {a:b, b, ha:DELOAD.hangs, hb:DELOAD.hangs, ramp, week, last:f[0], testDue:false, deload:true, why:"Deload week: light load (~"+pct(HANG.bPct)+"%) only, "+DELOAD.hangs+"–"+(DELOAD.hangs+1)+" hangs"};
  const gap = daysAgo(f[0].date);
  if (gap >= HANG.returnGapDays) return {a:b, b, ha:HANGS.lo, hb:HANGS.lo, ramp, week, last:f[0], testDue, back:true, why:"first hangs in "+gap+" days: light load (~"+pct(HANG.bPct)+"%), "+HANGS.lo+" hangs, then pick up the heavy progression"};
  return {a:aLoad, b, ha, hb, ramp, week, last:f[0], testDue, why};
}
export function newProb(){ return {name:"", grade:"V"+limitTargets().zone, attempts:0, prog:"", style:""}; }
/* limit stats across sessions */
export function allProblems(){
  const out = [];
  S.sessions.slice().sort((a,b)=>a.date<b.date?-1:1).forEach(s=>((s.climb&&s.climb.list)||[]).forEach(p=>{ if (p.grade && (num(p.attempts)||p.prog)) out.push(Object.assign({date:s.date}, p)); }));
  return out;
}
export function projectMap(){
  // named problems group across sessions; unnamed ones stand alone
  const m = {}; let k = 0;
  allProblems().forEach(p=>{
    const key = p.name ? p.name.trim().toLowerCase()+"|"+p.grade : "_"+(k++);
    const g = m[key] || (m[key] = {name:p.name||"", grade:p.grade, att:0, sessions:0, sent:false, sentAtt:null, best:"", first:p.date, last:p.date, style:p.style});
    if (g.sent) return;
    g.att += num(p.attempts)||0; g.sessions++; g.last = p.date;
    if (PROG_RANK[p.prog||""] > PROG_RANK[g.best]) g.best = p.prog;
    if (p.prog==="sent"){ g.sent = true; g.sentAtt = g.att; }
  });
  return Object.values(m);
}
export function openProjects(){ return projectMap().filter(p=>p.name && !p.sent).sort((a,b)=> (a.last<b.last?1:-1)); }
