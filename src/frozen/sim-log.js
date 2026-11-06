/* FROZEN. The model in the log: setup cues, missed-set notes, so-so readiness setup tweaks (filled in after the log paints). */
import { S } from "../core/state.js";
import { esc, num, today } from "../core/util.js";
import { SIM_LIFTS } from "../data/types.js";
import { SIM_BRIDGE, bodyCache, simReady } from "./sim-bridge.js";
import { altNote } from "./stats-model.js";
import { r1, setClean } from "../logic/sets.js";
import { bwAt } from "../logic/status.js";

export const SIMX = {cue:{}, miss:{}, ease:{}, busy:false, again:false, bodyTried:false};
export const simBodyKey = () => bodyCache ? String(bodyCache.updated || "") : "none";
export const simUnits = () => bodyCache && bodyCache.units==="cm" ? "cm" : "in";
export const fmtSpeed = v => v==null ? "–" : simUnits()==="in" ? (v/0.3048).toFixed(1) : v.toFixed(2);
export const speedUnit = () => simUnits()==="in" ? "ft/s" : "m/s";
export function simCueHTML(lift){ const c = SIMX.cue[lift+"|"+simBodyKey()]; return c == null ? null : c; }
export function vidLine(v){
  const n = r1(v.n), d = num(v.d);
  return '<b>Filmed</b> '+n+' rep'+(n===1?'':'s')+(num(v.loss)!=null ? ' · speed −'+Math.round(v.loss*100)+'%' : '')+(num(v.rir)!=null ? ' · ≈'+v.rir+' in reserve' : '')+
    (d!=null ? ' · depth '+(d >= 0 ? d+'° below parallel' : (-d)+'° above parallel') : '');
}
/* the heaviest set that was missed, or marked done but short of its target */
export function missTarget(l){ let t = null; (l.sl||[]).forEach(x=>{ if (x.st==="miss" || (x.st==="ok" && !setClean(x))){ if (!t || r1(x.w) >= r1(t.w)) t = x; } }); return t; }
export function missKey(l, x){ return [l.lift, r1(x.w), r1(x.reps), r1(x.tgt), x.st, simBodyKey(), JSON.stringify(S.profile.oneRM||{})].join("|"); }
export function missHTML(l){
  if (!SIM_LIFTS[l.lift]) return ''; const x = missTarget(l); if (!x) return '';
  const k = missKey(l, x), c = SIMX.miss[k];
  return '<div class="lmiss" data-miss="'+esc(k)+'" data-lift="'+esc(l.lift)+'" data-w="'+r1(x.w)+'" data-reps="'+r1(x.reps)+'" data-tgt="'+r1(x.tgt)+'" data-st="'+esc(x.st)+'">'+(c||'')+'</div>';
}
export function cueText(c, lift){
  return '<b>Your setup'+(c.variant ? ' ('+({bench:"bench press", dead:"deadlift", pull:"pull-up"})[c.mv]+(c.vtxt ? ', '+esc(c.vtxt) : '')+')' : '')+':</b> '+c.lines.map(esc).join(' · ');
}
export function missText(x, d){
  const w = num(d.w), tgt = num(d.tgt), pull = /pull-up/i.test(d.lift), wl = pull ? (w ? "+"+w+" lb" : "bodyweight") : w+" lb";
  let done = num(d.reps); if (d.st==="miss" && done != null && tgt && done >= tgt) done = tgt - 1;   // a missed set left at its target: the last rep failed
  if (!x) return '';
  if (x.fail) return '<b>Where it likely stalled:</b> the model can\'t solve this lift for your body (see Build), so there\'s no estimate.';
  let h = '<b>Where it likely stalled:</b> at '+esc(wl)+' the model\'s hardest point is '+esc(x.where)+', where your '+esc(x.joint)+' are closest to their limit'+(x.muscle ? ' ('+esc(x.muscle.toLowerCase())+' working hardest)' : '')+'. ';
  if (x.rtf != null){
    if (x.rtf <= 1) h += 'This weight is at or above your max for this lift ('+x.M+' lb'+(pull ? ' including bodyweight' : '')+'). ';
    else { h += 'It expects about '+x.rtf+' reps to failure at this weight'; 
      if (done != null && tgt && done < x.rtf - 1) h += '; you got '+done+' of '+tgt+', so today you were probably below the '+x.M+' lb max in your log (sleep, fatigue and readiness all move it). ';
      else if (done != null && tgt) h += '; you got '+done+' of '+tgt+', about what that predicts. ';
      else h += '. '; }
  }
  if (x.acc) h += 'To build that spot: '+esc(x.acc)+'. ';
  if (x.variant){ const base = ({bench:"bench press", dead:"deadlift", pull:"pull-up"})[x.mv] || "regular lift", v = x.vinfo;
    h += 'Modelled as the '+base+(v && v.txt ? ' ('+esc(v.txt)+')' : '')+(v && v.src==="own" ? ', with the max from your best logged set of this variant' : v ? ', with its max estimated from your '+base+' max' : '')+'. '; }
  if (x.alt) h += altNote(d.lift, x)+' ';
  if (!x.mine) h += 'Modelled with a standard setup: mark yours on the Build tab (\u201cThis is how I lift\u201d) to use it here. ';
  if (!bodyCache || !bodyCache.meas || !Object.keys(bodyCache.meas).length) h += 'This uses standard proportions; add your measurements on the Build tab for yours. ';
  return h + '<span style="color:var(--faint)">A model estimate; film a set to see where your bar actually slows.</span>';
}
/* a so-so (or red) readiness region: whether a small change to your marked setup takes load off it at today's weight */
export const EASE_REGION = {Squat:"back", Deadlift:"back", "Tempo deadlift":"back", RDL:"back", "Bent-over row":"back", Bench:"press", "Tempo bench":"press", "Legs-up bench":"press", OHP:"press"};
export const EASE_WORD = {back:"Back / legs", press:"Pressing / shoulders"};
export function easeHTML(l, plan){
  const reg = EASE_REGION[l.lift]; if (!reg) return '';
  const rdy = (S.draft && S.draft.readiness) || S.ready, st = rdy && rdy[reg]; if (st!=="y" && st!=="r") return '';
  const w = plan && plan.w ? r1(plan.w) : Math.max(0, ...(l.sl||[]).map(x=>r1(x.w))); if (!(w > 0)) return '';
  const k = [l.lift, w, reg, st, simBodyKey()].join("|");
  return '<div class="lcue lease" data-ease="'+esc(k)+'" data-lift="'+esc(l.lift)+'" data-w="'+w+'" data-reg="'+reg+'" data-st="'+st+'">'+(SIMX.ease && SIMX.ease[k] || '')+'</div>';
}
export function easeText(x, d){
  if (!x || !x.mine) return '';
  const head = '<b>'+EASE_WORD[d.reg]+' '+(d.st==="r" ? 'flagged' : 'so-so')+' today:</b> ', pc = v => Math.round(v*100)+'%';
  if (!x.best) return head+'no small change to your setup takes much off your '+x.joint+' in this lift at '+d.w+' lb; the lighter planned weight is the lever.';
  return head+esc(x.best.label)+' takes about '+pc(x.best.cut)+' off the load on your '+x.joint+' at '+d.w+' lb'+(x.best.up ? ', with a bit more on your '+esc(x.best.up.j)+' (+'+pc(x.best.up.d)+')' : '')+'. <span style="color:var(--faint)">Model estimate from your marked setup.</span>';
}
/* fill cues and notes after the log has painted, one lift at a time so typing stays smooth */
export function simFill(){
  const pend = [...document.querySelectorAll(".lcue[data-cue], .lmiss[data-miss], .lease[data-ease]")].filter(n=>!n.textContent && !(n.dataset.ease && SIMX.ease[n.dataset.ease] === ''));
  if (!pend.length) return;
  if (SIMX.busy){ SIMX.again = true; return; }
  SIMX.busy = true;
  simReady().then(api=>{
    const jobs = pend.map(n=>()=>{
      if (n.dataset.ease){
        const k = n.dataset.ease, d = n.dataset;
        if (SIMX.ease[k]==null){ let x = null; try{ x = bodyCache ? api.ease(bodyCache, bwAt(today()), d.lift, num(d.w), d.reg) : null; }catch(e){} SIMX.ease[k] = easeText(x, {reg:d.reg, st:d.st, w:num(d.w)}); }
        document.querySelectorAll('.lease[data-ease="'+CSS.escape(k)+'"]').forEach(m=>{ m.innerHTML = SIMX.ease[k]; });
      } else if (n.classList.contains("lcue")){
        const lift = n.dataset.cue, k = lift+"|"+simBodyKey();
        if (SIMX.cue[k]==null){ let c = null; try{ c = bodyCache ? api.cue(bodyCache, bwAt(today()), lift) : null; }catch(e){} SIMX.cue[k] = c && c.lines.length ? cueText(c, lift) : ""; }
        document.querySelectorAll('.lcue[data-cue="'+CSS.escape(lift)+'"]').forEach(m=>{ m.innerHTML = SIMX.cue[k]; });
      } else {
        const k = n.dataset.miss, d = n.dataset;
        if (SIMX.miss[k]==null){ let x = null; try{ x = api.explain({rec: bodyCache || {}, bw: bwAt(S.draft ? S.draft.date : today()), lift: d.lift, w: num(d.w), oneRM: S.profile.oneRM, best: SIM_BRIDGE.liftBest}); }catch(e){}
          SIMX.miss[k] = missText(x, d); }
        document.querySelectorAll('.lmiss[data-miss="'+CSS.escape(k)+'"]').forEach(m=>{ m.innerHTML = SIMX.miss[k]; });
      }
    });
    const step = ()=>{ const j = jobs.shift(); if (!j){ SIMX.busy = false; if (SIMX.again){ SIMX.again = false; simFill(); } return; } try{ j(); }catch(e){} setTimeout(step, 30); };
    setTimeout(step, 60);
  }).catch(()=>{ SIMX.busy = false; pend.forEach(n=>{ if (n.classList.contains("lcue")) n.remove(); }); });
}
