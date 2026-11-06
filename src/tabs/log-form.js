/* readForm(): copies the Log form's inputs into the draft; hangDone(). */
import { S } from "../core/state.js";
import { num, today } from "../core/util.js";
import { deriveRow, ensureSL, r1 } from "../logic/sets.js";
import { hangStatus } from "./log.js";
import { logEvent, saveDraft } from "../ui/live.js";

export function hangDone(cut, last){
  const f = S.draft && S.draft.fingers; if (!f) return;
  f.hangLog = (f.hangLog||[]).concat({t:Date.now(), ok:!cut});
  f.clean = f.hangLog.every(x=>x.ok);
  if (last) f.hangs = f.hangLog.length;
  logEvent("hang", {ok:!cut}); saveDraft();
  const st = document.getElementById("hang-status"); if (st) st.textContent = hangStatus(S.draft);
  const cb = document.getElementById("f-fclean"); if (cb) cb.checked = f.clean;
  const hn = document.getElementById("f-hangs"); if (hn && last) hn.value = f.hangs;
}
export function readForm(){
  const d = S.draft; if (!d) return;
  const v = id => { const el = document.getElementById(id); return el ? (el.type==="checkbox" ? el.checked : el.value) : undefined; };
  if (v("f-date")!==undefined) d.date = v("f-date") || today();
  if (v("f-bw")!==undefined) d.bw = v("f-bw");
  if (v("f-fdone")!==undefined) d.fingers.done = v("f-fdone");
  if (v("f-edge")!==undefined){ d.fingers.edge = num(v("f-edge")); d.fingers.added = num(v("f-add")); d.fingers.secs = num(v("f-secs")); d.fingers.hangs = num(v("f-hangs")); d.fingers.clean = v("f-fclean"); }
  if (v("f-con")!==undefined) d.climb.on = v("f-con");
  if (v("f-send")!==undefined){ d.climb.send = v("f-send"); d.climb.tried = v("f-tried"); d.climb.attempts = num(v("f-att")); d.climb.problems = num(v("f-probs")); }
  if (v("f-stop")!==undefined) d.climb.stop = v("f-stop");
  document.querySelectorAll(".prob,.pedit").forEach(r=>{
    const p = (d.climb.list||[])[+r.dataset.p]; if (!p) return;
    r.querySelectorAll("[data-pk]").forEach(el=>{ const k = el.dataset.pk; p[k] = k==="attempts" ? (num(el.value)||0) : el.value; });
  });
  saveDraft();
  if (v("f-ftest")!==undefined){ d.fingers.test = v("f-ftest"); d.fingers.light = v("f-flight"); }
  if (v("f-wbdone")!==undefined) d.wb.done = v("f-wbdone");
  if (v("f-wbphase")!==undefined){
    d.wb.phase = +v("f-wbphase");
    d.wb.ext = {w:num(v("f-ew")), reps:num(v("f-er")), sets:num(v("f-es"))};
    d.wb.flex = {w:num(v("f-fw")), reps:num(v("f-fr")), sets:num(v("f-fs"))};
    d.wb.iso = v("f-iso"); d.wb.dev = v("f-dev"); d.wb.rocks = v("f-rocks");
    if (v("f-leans")!==undefined) d.wb.leans = num(v("f-leans"));
  }
  if (v("f-hsdone")!==undefined) d.hs.done = v("f-hsdone");
  if (v("f-hslevel")!==undefined){ d.hs.level = +v("f-hslevel"); d.hs.best = num(v("f-hsb")); d.hs.time = num(v("f-hst")); d.hs.tries = num(v("f-hsa")); }
  if (v("f-wpain")!==undefined){ const p = num(v("f-wpain")); d.wristPain = p==null ? "" : Math.max(0, Math.min(10, p)); }
  if (v("f-notes")!==undefined) d.notes = v("f-notes");
  if (v("f-dur")!==undefined) d.duration = num(v("f-dur"));
  if (v("f-rpe")!==undefined){ const r = num(v("f-rpe")); d.rpe = r==null ? null : Math.max(0, Math.min(10, r)); }
  document.querySelectorAll(".liftrow").forEach(r=>{
    const l = d.lifts[+r.dataset.i]; if (!l) return; ensureSL(l);
    r.querySelectorAll("[data-k]").forEach(el=>{
      const k = el.dataset.k;
      l[k] = el.type==="checkbox" ? el.checked : (k==="lift"||k==="role" ? el.value : num(el.value));
    });
    r.querySelectorAll(".setrow").forEach(sr=>{ const x = l.sl[+sr.dataset.s]; if (!x) return;
      sr.querySelectorAll("[data-sk]").forEach(el=>{ x[el.dataset.sk] = r1(el.value); }); });
    deriveRow(l);
  });
  saveDraft();
}
