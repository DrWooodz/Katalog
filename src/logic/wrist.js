import { deloadOn, sorted } from "../core/state.js";
import { num, r5 } from "../core/util.js";
import { HS_LEVELS } from "../data/plans.js";

/* ---------- wrist block + handstand progression ---------- */
export const wristHist = () => sorted().filter(s=>s.wb && s.wb.done);
export const handHist = () => sorted().filter(s=>s.hs && s.hs.done);
export function nextWrist(){
  const H = wristHist();
  const p = {phase:1, ext:10, flex:15, why:"Start light: about 10 lb extension, 15 lb flexion. Find a load you can do 3×12 with a slow 3 s lowering.", advance:null, painFlag:""};
  if (!H.length) return p;
  const last = H[0].wb, pain = num(H[0].wristPain);
  p.phase = last.phase||1;
  const top = p.phase===1 ? 12 : 10, sets = p.phase===1 ? 3 : 4;
  /* no microloading: reps first, then one dumbbell step (5 lb) and back to the bottom of the range */
  const step = () => 5;
  const prog = (row, label) => {
    const w = num(row && row.w)||0, r = num(row && row.reps)||0, s = num(row && row.sets)||0;
    if (pain!=null && pain>5) return {w:Math.max(0, Math.min(r5(w*0.8), w-step())), why:label+" one step down (pain "+pain+"/10)"};
    if (r>=top && s>=sets && (pain==null || pain<=2)) return {w:w+step(w), why:label+" hit "+s+"×"+r+", +"+step(w)+" lb (one dumbbell step)"};
    return {w, why:label+" same load, build to "+sets+"×"+top};
  };
  const e = prog(last.ext, "extension"), f = prog(last.flex, "flexion");
  p.ext = e.w; p.flex = f.w; p.why = e.why+" · "+f.why;
  const inPhase = H.filter(s=>(s.wb.phase||1)===p.phase);
  const calm = inPhase.slice(0,3).every(s=>{ const v = num(s.wristPain); return v==null || v<=2; });
  if (p.phase<3 && inPhase.length>=6 && calm){
    const ok = p.phase===1 ? (num(last.ext && last.ext.reps)||0)>=12 : (num(last.leans)||0)>=30;
    if (ok) p.advance = p.phase+1;
  }
  if (pain!=null && pain>5) p.painFlag = "Last wrist pain "+pain+"/10: load one step down, skip leans until it settles.";
  return p;
}
export function newWrist(done){
  const n = nextWrist(), ph = n.phase;
  const ws = deloadOn() ? 2 : (ph===1?3:4);
  return {done:!!done, phase:ph, ext:{w:n.ext, reps:ph===1?10:8, sets:ws}, flex:{w:n.flex, reps:ph===1?10:8, sets:ws}, dev:ph===1, iso:true, rocks:ph<3, leans: ph>=2 ? 20 : ""};
}
export function nextHand(){
  const H = handHist();
  if (!H.length) return {level:1, why:"Start at chest-to-wall holds."};
  const L = H[0].hs.level||1, pain = num(H[0].wristPain);
  if (pain!=null && pain>=4) return {level:Math.max(1,L-1), why:"Wrist pain "+pain+"/10 last time: drop a level and halve time on hands."};
  const at = H.filter(s=>(s.hs.level||1)===L).slice(0,3);
  const met = at.filter(s=>HS_LEVELS[L].test(num(s.hs.best)||0) && (num(s.wristPain)==null || num(s.wristPain)<=3)).length;
  if (L<5 && met>=2) return {level:L+1, why:"Met level "+L+" ("+HS_LEVELS[L].crit+") in 2 of the last 3. Move up."};
  return {level:L, why:"Level "+L+": "+met+" of 2 sessions at "+HS_LEVELS[L].crit+"."};
}
export function newHand(done){ return {done:!!done, level:nextHand().level, time:"", best:"", tries:""}; }
