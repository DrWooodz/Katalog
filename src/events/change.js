import { S } from "../core/state.js";
import { num } from "../core/util.js";
import { fingerInfo } from "../logic/climb.js";
import { pctText, planFor } from "../logic/draft.js";
import { platesAvail } from "../logic/plan.js";
import { deriveRow, ensureSL, mkSets, r1, rowSum, setClean, stampPlan, sumCls } from "../logic/sets.js";
import { saveProfile } from "../store/store.js";
import { restoreFile } from "./backup.js";
import { updateLimitMeters } from "../tabs/limit.js";
import { readForm } from "../tabs/log-form.js";
import { saveDraft, undoPush } from "../ui/live.js";
import { plateHTML, ratioText } from "../ui/plates.js";
import { render } from "../ui/render.js";

document.addEventListener("change", e=>{
  const t = e.target;
  if (S.tab==="log"){
    // Selects and checkboxes can redraw the form. Typed numbers update in place, so a tap on Save right after typing still lands.
    if (t.id==="f-flight"){ readForm(); const fi = fingerInfo(); S.draft.fingers.added = t.checked ? fi.b : fi.a; render(); }
    else if (t.dataset && (t.dataset.k==="lift"||t.dataset.k==="role")){ undoPush(); readForm(); render(); }
    else if (t.id==="f-date"){ undoPush(); readForm(); const d = S.draft;
      /* a new date means a new plan: re-plan the sets you haven't done yet */
      d.lifts.forEach(l=>{ ensureSL(l); const p = planFor(l, d); if (!p) return; const done = l.sl.filter(x=>x.st); stampPlan(l, p); if (done.length) return; l.sl = mkSets(p.w, p.reps, p.sets, true); deriveRow(l); });
      saveDraft(); render(); }
    else if (["f-fdone","f-con","f-wbdone","f-hsdone","f-wbphase","f-hslevel"].includes(t.id) || (t.dataset && (t.dataset.pk==="grade"||t.dataset.pk==="prog"))){ readForm(); render(); }
    else if (t.dataset && t.dataset.sk){ undoPush(); const r = t.closest(".liftrow"), sr = t.closest(".setrow"), l = r && S.draft.lifts[+r.dataset.i];
      if (l && sr){ ensureSL(l); const j = +sr.dataset.s, x = l.sl[j], old = x ? r1(x[t.dataset.sk]) : 0;
        readForm();
        /* changing a planned set carries the change to the planned sets after it that still matched */
        if (x && !x.st) for (let k=j+1;k<l.sl.length;k++){ const y = l.sl[k]; if (y.st || r1(y[t.dataset.sk])!==old) break; y[t.dataset.sk] = x[t.dataset.sk]; if (t.dataset.sk==="reps" && !y.pl) y.tgt = y.reps;
          const inp = r.querySelector('.setrow[data-s="'+k+'"] [data-sk="'+t.dataset.sk+'"]'); if (inp) inp.value = y[t.dataset.sk] || ""; }
        if (x && !x.st && !x.pl && t.dataset.sk==="reps") x.tgt = x.reps;
        deriveRow(l); saveDraft();
        const sum = document.getElementById("lsum-"+r.dataset.i); if (sum){ sum.textContent = rowSum(l); sum.className = "lsum "+sumCls(l); }
        const nx = l.sl.find(y=>!y.st) || l.sl.reduce((m,y)=>r1(y.w)>r1(m.w)?y:m, l.sl[0]), pc = r.querySelector(".pct"), pw = r.querySelector(".plates-w");
        if (pc) pc.textContent = pctText(Object.assign({}, l, {w:r1(nx.w), reps:r1(nx.reps)})); if (pw) pw.innerHTML = plateHTML(l.lift, r1(nx.w), true);
        sr.querySelector(".tgt") && (sr.querySelector(".tgt").textContent = x && x.tgt ? (x.st==="ok" && !setClean(x) ? "short of "+x.tgt : "target "+x.tgt) : ""); sr.classList.toggle("short", !!(x && x.st==="ok" && !setClean(x))); } }
    else if (t.dataset && t.dataset.pk==="attempts"){ readForm(); updateLimitMeters(); }
    else if (t.id==="f-rd"){ readForm(); const v = t.value; S.draft.readiness = {fingers:v,back:v,press:v}; }
    else if (t.id==="f-add"||t.id==="f-bw"){ readForm(); const el = document.getElementById("f-ratio"); if (el) el.textContent = ratioText(S.draft); }
    return;
  }
  if (S.tab==="setup"){
    if (t.id==="imp-file"){ restoreFile(t); return; }
    const p = S.profile;
    if (t.dataset.detr){ p.detrained = Object.assign({}, p.detrained||{}); p.detrained[t.dataset.detr] = t.checked; }
    else if (t.dataset.rest){ const v = num(t.value); if (v){ p.rest = Object.assign({}, p.rest||{}); p.rest[t.dataset.rest] = Math.max(10, Math.round(v)); } }
    else if (t.dataset.orm){ const v = num(t.value); if (v) p.oneRM[t.dataset.orm] = v; }
    else if (t.dataset.gw){ const v = num(t.value); if (v) p.goals[t.dataset.gw].w = v; }
    else if (t.dataset.gr){ const v = num(t.value); if (v) p.goals[t.dataset.gr].r = v; }
    else if (t.id==="p-bw"){ const v = num(t.value); if (v) p.bw = v; }
    else if (t.id==="p-edge"){ const v = num(t.value); if (v) p.edge = v; }
    else if (t.dataset.unk){ p.unknown = Object.assign({}, p.unknown||{}); p.unknown[t.dataset.unk] = t.checked; }
    else if (t.id==="p-mode"){ p.mode = t.value; }
    else if (t.id==="p-bar"){ p.bar = num(t.value) || 45; }
    else if (t.dataset.plate){ const v = +t.dataset.plate, cur = platesAvail(); p.plates = (t.checked ? cur.concat([v]) : cur.filter(x=>x !== v)).filter((x,i,a)=>a.indexOf(x) === i).sort((a,b)=>b-a); if (!p.plates.length) p.plates = [45]; }
    else return;
    saveProfile(); render();
  }
});
