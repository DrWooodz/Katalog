/* FROZEN. Loads sim.js on demand, mounts the Build tab, gives the simulator read-only copies of your data. */
import { S } from "../core/state.js";
import { epley, toast, today } from "../core/util.js";
import { SIMX } from "./sim-log.js";
import { cleanSets } from "../logic/sets.js";
import { bwAt } from "../logic/status.js";
import { storeReady, loadBodyRec, saveBodyRec } from "../store/store.js";

/* ---------- body simulator (Build tab) ----------
   Lives in sim.js (frozen, unchanged from the Claude artifact v32), loaded only when the tab opens. It gets read-only copies
   of the profile and bodyweight, and keeps its own record ("body" in IndexedDB). It never writes the profile or any session. */
let simInst = null, simLoading = null, bodyFn = null;
export let bodyCache = null;
export const SIM_BRIDGE = {
  bw: ()=> bwAt(today()),
  profile: ()=> JSON.parse(JSON.stringify(S.profile)),
  /* best clean logged set for a lift, as an estimated 1RM (Epley; sets of 12 or fewer). Pull-ups count bodyweight + added. Read-only. */
  liftBest: name=>{ let best = null; const pull = /pull-up/i.test(name);
    S.sessions.forEach(s=>(s.lifts||[]).forEach(l=>{ if (!l || l.lift!==name) return;
      cleanSets(l).forEach(x=>{ if (!x.reps || x.reps > 12) return; const w = pull ? x.w + bwAt(s.date) : x.w; if (!w) return; const e = epley(w, x.reps);
        if (!best || e > best.e) best = {e, w:x.w, reps:x.reps, date:s.date}; }); }));
    return best; },
  toast,
  loadBody: async ()=>{ await storeReady; const b = await loadBodyRec(); bodyCache = b; return b; },
  saveBody: async b=>{ await storeReady; await saveBodyRec(b); bodyCache = b; },
  /* the artifact pushed changes made on another device here; on one device there is nothing to push */
  onBody: fn=>{ bodyFn = fn; }
};
/* sim.js is a classic script that sets window.SLSim; its path is relative to index.html */
const SIM_URL = "src/frozen/sim.js";
export function loadSimScript(){
  if (window.SLSim) return Promise.resolve();
  if (simLoading) return simLoading;
  simLoading = new Promise((res, rej)=>{
    const viaFetch = ()=> fetch(SIM_URL).then(r=>{ if (!r.ok) throw new Error("load"); return r.text(); })
      .then(t=>{ const s2 = document.createElement("script"); s2.textContent = t; document.head.appendChild(s2); if (window.SLSim) res(); else rej(new Error("load")); }).catch(rej);
    const sc = document.createElement("script"); sc.src = SIM_URL; sc.async = true;
    sc.onload = ()=>{ if (window.SLSim) res(); else viaFetch(); };
    sc.onerror = viaFetch;
    document.head.appendChild(sc);
  });
  simLoading.catch(()=>{ simLoading = null; });
  return simLoading;
}
export function mountSim(el){
  el.innerHTML = '<div class="panel"><h2>Build</h2><p class="hint">Loading the simulator…</p></div>';
  loadSimScript().then(()=>{
    if (S.tab!=="build" || !document.body.contains(el)) return;
    try{ simInst = window.SLSim.mount(el, SIM_BRIDGE); }
    catch(e){ el.innerHTML = '<div class="panel"><h2>Build</h2><p class="hint">The simulator hit an error. Your training log is unaffected. Reload to try again.</p></div>'; }
  }).catch(()=>{ if (document.body.contains(el)) el.innerHTML = '<div class="panel"><h2>Build</h2><p class="hint">The simulator didn\'t load. Check your connection and open this tab again. Your training log is unaffected.</p></div>'; });
}
export function unmountSim(){ if (simInst){ try{ simInst.unmount(); }catch(e){} simInst = null; } }
export async function simReady(){
  await loadSimScript(); if (!window.SLSim || !window.SLSim.log) throw new Error("model not loaded");
  if (!bodyCache && !SIMX.bodyTried){ SIMX.bodyTried = true; try{ await SIM_BRIDGE.loadBody(); }catch(e){} }
  return window.SLSim.log;
}
