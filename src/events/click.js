/* All button actions (data-act) and tab clicks. */
import { S } from "../core/state.js";
import { $, gradeN, lsSet, num, toast, today } from "../core/util.js";
import { bodyCache } from "../frozen/sim-bridge.js";
import { newProb } from "../logic/climb.js";
import { newDraft, planFor } from "../logic/draft.js";
import { deriveRow, ensureSL, mkSets, r1, stampPlan } from "../logic/sets.js";
import { findPRs } from "../logic/status.js";
import { newHand, newWrist } from "../logic/wrist.js";
import { deleteSession, saveProfile, saveSession } from "../store/store.js";
import { copyBackup, restoreText, saveBackup } from "./backup.js";
import { hangDone, readForm } from "../tabs/log-form.js";
import { hangStatus, holdsText } from "../tabs/log.js";
import { TM, UNDO, audio, liveBar, liveOn, logEvent, restFor, restTimer, runTimer, saveDraft, startSW, stopSW, stopTimer, tick, timerActive, undoPush, undoReset, wake } from "../ui/live.js";
import { render, setTab } from "../ui/render.js";
import { SKINS, setSkin, skinKey, skinText } from "../ui/skins.js";

/* Film a set (frozen feature) loads its code the first time it is opened */
let film = null;
const filmMod = () => import("../frozen/film.js").then(m=>(film = m));

document.addEventListener("click", async e=>{
  const tab = e.target.closest("[data-tab]");
  if (tab && tab.closest("#tabs")){ if (S.tab==="log") readForm(); setTab(tab.dataset.tab); return; }
  const go = e.target.closest("[data-tab-go]");
  if (go){ if (!liveOn()) S.draft = null; saveDraft(); setTab(go.dataset.tabGo); return; }
  const a = e.target.closest("[data-act]"); if (!a) return;
  const act = a.dataset.act;
  if (act==="ready"){ const k = a.dataset.k; S.ready[k] = {g:"y",y:"r",r:"g"}[S.ready[k]]; S.ready.d = today(); lsSet("sl.ready", S.ready); render(); }
  else if (act==="start"){ if (liveOn()){ toast("A live session is running. Pick its type on the Log tab."); setTab("log"); return; } S.draft = newDraft(a.dataset.type, a.dataset.f==="1", null, a.dataset.day || null); saveDraft(); setTab("log"); }
  else if (act==="type"){ readForm(); undoPush(); const keep = S.draft; const nd = newDraft(a.dataset.type, undefined, keep); nd.bw = keep.bw; nd.notes = keep.notes; nd.live = keep.live; nd.duration = keep.duration; S.draft = nd; saveDraft(); render(); }
  else if (act==="addrow"){ readForm(); undoPush(); S.draft.lifts.push({lift:"Other",role:"acc",sl:mkSets(0,8,3),w:0,reps:8,sets:3,clean:false}); render(); }
  else if (act==="rmrow"){ readForm(); undoPush(); const l = S.draft.lifts.splice(+a.dataset.i,1)[0]; render(); if (l) toast("Removed "+l.lift+". Undo brings it back."); }
  else if (act==="undo"){ if (!UNDO.length) return; S.draft = JSON.parse(UNDO.pop()); S.saveCheck = null; saveDraft(); render(); toast("Undone"); }
  else if (act==="sst"){ readForm(); const l = S.draft.lifts[+a.dataset.i]; if (!l) return; ensureSL(l); const x = l.sl[+a.dataset.s]; if (!x) return; undoPush();
    const v = a.dataset.v; if (x.st===v){ x.st = ""; delete x.t; } else { const was = x.st; x.st = v; x.t = Date.now();
      if (!was && liveOn()){ logEvent("set", {lift:l.lift, w:x.w, reps:x.reps, st:v}); if (l.sl.some(y=>!y.st) || S.draft.lifts.some(r=>r!==l && (r.sl||[]).some(y=>!y.st))) restTimer("Rest · "+l.lift, restFor(l.role||"acc")); } }
    deriveRow(l); saveDraft(); render(); }
  else if (act==="addset"){ readForm(); const l = S.draft.lifts[+a.dataset.i]; if (!l) return; ensureSL(l); undoPush(); const last = l.sl[l.sl.length-1] || {w:0, reps:5, tgt:5};
    const ns = {w:r1(last.w), reps:r1(last.tgt || last.reps), tgt:r1(last.tgt || last.reps), st:""}; if (last.pl) ns.pl = 1; l.sl.push(ns); deriveRow(l); saveDraft(); render(); }
  else if (act==="rmset"){ readForm(); const l = S.draft.lifts[+a.dataset.i]; if (!l) return; ensureSL(l); undoPush(); const j = +a.dataset.s; l.sl.splice(j, 1); if (!l.sl.length) l.sl.push({w:0, reps:0, tgt:0, st:""}); deriveRow(l); saveDraft(); render(); toast("Set "+(j+1)+" deleted. Undo brings it back."); }
  else if (act==="film"){ readForm(); saveDraft(); const i = +a.dataset.i; filmMod().then(m=>m.openFilm(i)).catch(()=>toast("Film a set didn't load. Check your connection.")); }
  else if (act==="alldone"){ readForm(); const l = S.draft.lifts[+a.dataset.i]; if (!l) return; ensureSL(l); undoPush(); const t = Date.now(); l.sl.forEach(x=>{ if (!x.st){ x.st = "ok"; x.t = t; } }); deriveRow(l); saveDraft(); render(); }
  else if (act==="useplan"){ readForm(); const l = S.draft.lifts[+a.dataset.i]; if (!l) return; const p = planFor(l, S.draft); if (!p) return; undoPush(); ensureSL(l);
    const done = l.sl.filter(x=>x.st), left = p.sets - done.length; l.sl = left > 0 ? done.concat(mkSets(p.w, p.reps, left, true)) : done; if (!l.sl.length) l.sl = mkSets(p.w, p.reps, p.sets, true); stampPlan(l, p); deriveRow(l); saveDraft(); render(); }
  else if (act==="savecheck"){ readForm(); const m = a.dataset.m; if (m==="back"){ S.saveCheck = null; render(); return; } undoPush();
    S.draft.lifts.forEach(l=>{ if (!Array.isArray(l.sl)) return; if (m==="done") l.sl.forEach(x=>{ if (!x.st && (r1(x.w) || r1(x.reps))){ x.st = "ok"; x.t = x.t || Date.now(); } }); else l.sl = l.sl.filter(x=>x.st); deriveRow(l); });
    S.draft.lifts = S.draft.lifts.filter(l=>!Array.isArray(l.sl) || l.sl.length); S.saveCheck = "ok"; saveDraft(); const b = document.querySelector('[data-act="save"]'); if (b) b.click(); else render(); }
  else if (act==="reset"){ if (film) film.closeFilm(); undoReset(); S.saveCheck = null; S.probEdit = null; S.draft = null; saveDraft(); stopTimer(); TM.sw = null; wake(false); render(); liveBar(); }
  else if (act==="addprob"){ readForm(); undoPush(); const L = S.draft.climb.list || (S.draft.climb.list = []); const prev = L[L.length-1]; const np = newProb(); if (prev) np.grade = prev.grade; L.push(np); S.probEdit = L.length - 1; saveDraft(); render(); }
  else if (act==="rmprob"){ readForm(); undoPush(); const p = S.draft.climb.list.splice(+a.dataset.i,1)[0]; S.probEdit = null; saveDraft(); render(); if (p) toast("Deleted "+(p.name || p.grade)+". Undo brings it back."); }
  else if (act==="popen"){ readForm(); S.probEdit = +a.dataset.i; render(); const n = document.querySelector('.psheet [data-pk="name"]'); if (n && !n.value && matchMedia("(hover:hover)").matches) n.focus(); }
  else if (act==="pclose"){ if (a.classList.contains("psheet") && e.target !== a) return; readForm(); S.probEdit = null; saveDraft(); render(); }
  else if (act==="pset"){ readForm(); const p = (S.draft.climb.list||[])[+a.dataset.i]; if (!p) return; undoPush(); const k = a.dataset.k, v = a.dataset.v; p[k] = p[k]===v && k!=="grade" ? "" : v; saveDraft(); render(); }
  else if (act==="plantoggle"){ readForm(); S.planOpen = !S.planOpen; render(); }
  else if (act==="att"){ readForm(); const p = S.draft.climb.list[+a.dataset.i]; if (p){ undoPush(); p.attempts = Math.max(0,(num(p.attempts)||0)+(+a.dataset.d)); if (+a.dataset.d>0 && liveOn()){ logEvent("attempt", {p:p.name||p.grade, g:p.grade}); restTimer("Rest · "+(p.name||p.grade), restFor("limit")); } } saveDraft(); render(); }
  else if (act==="rest"){ const s = +a.dataset.s; if (s) restTimer("Rest", s); else stopTimer(); }
  else if (act==="tcut"){ if (timerActive()){ TM.cut = true; TM.endAt = Date.now(); tick(); } }
  else if (act==="tadd"){ if (timerActive()){ TM.endAt += 30000; tick(); } }
  else if (act==="tskip"){ if (timerActive()){ TM.endAt = Date.now(); tick(); } }
  else if (act==="tstop"){ stopTimer(); }
  else if (act==="swstop"){ stopSW(); }
  else if (act==="livestart"){ audio(); readForm(); S.draft.live = {start:Date.now(), events:[]}; wake(true); saveDraft(); render(); liveBar(); toast("Live session started"); }
  else if (act==="livediscard"){
    if (S.confirmDiscard){ S.confirmDiscard = false; readForm(); S.draft.live = null; stopTimer(); TM.sw = null; wake(false); saveDraft(); render(); liveBar(); toast("Live tracking discarded. Your entries are kept."); }
    else { S.confirmDiscard = true; render(); setTimeout(()=>{ if (S.confirmDiscard){ S.confirmDiscard = false; if (S.tab==="log") render(); } }, 4000); }
  }
  else if (act==="setok" || act==="setmiss"){
    readForm(); const l = S.draft.lifts[+a.dataset.i]; if (!l) return;
    const ok = act==="setok";
    l.log = (l.log||[]).concat({t:Date.now(), w:l.w, reps:l.reps, ok});
    l.sets = l.log.length; l.clean = l.log.every(x=>x.ok);
    logEvent("set", {lift:l.lift, w:l.w, reps:l.reps, ok});
    restTimer("Rest · "+l.lift, restFor(l.role||"acc")); saveDraft(); render();
  }
  else if (act==="hangtimer"){
    readForm(); audio();
    const f = S.draft.fingers, n = Math.max(1, num(f.hangs)||5), secs = Math.max(3, num(f.secs)||10);
    f.hangLog = []; f.planned = n;
    const ph = [{name:"Get ready", s:5, kind:"ready", count:true}];
    for (let k=1; k<=n; k++){
      ph.push({name:"Hang "+k+"/"+n, s:secs, kind:"work", cut:true, onEnd:(cut)=>hangDone(cut, k===n)});
      if (k<n) ph.push({name:"Rest before hang "+(k+1), s:restFor("hang"), kind:"rest", count:true});
    }
    runTimer("Hangs", ph);
    const st = document.getElementById("hang-status"); if (st) st.textContent = hangStatus(S.draft);
  }
  else if (act==="wset"){
    readForm(); const k = a.dataset.k, wb = S.draft.wb;
    if (!wb[k+"Log"]) wb[k+"Log"] = [];
    wb[k+"Log"].push({t:Date.now(), w:wb[k].w, reps:wb[k].reps}); wb[k].sets = wb[k+"Log"].length;
    logEvent("wrist", {k, w:wb[k].w, reps:wb[k].reps});
    restTimer("Rest · wrist", restFor("wrist")); saveDraft(); render();
  }
  else if (act==="isotimer"){
    readForm();
    const ph = [{name:"Get ready", s:3, kind:"ready", count:true}];
    for (let k=1; k<=30; k++){
      ph.push({name:"Iso push "+k+"/30", s:2, kind:"work", onEnd: k===30 ? ()=>{ if (S.draft){ S.draft.wb.iso = true; const c = document.getElementById("f-iso"); if (c) c.checked = true; logEvent("iso", {}); saveDraft(); } } : null});
      if (k<30) ph.push({name:"Relax", s:2, kind:"rest"});
    }
    runTimer("Iso pulses", ph);
  }
  else if (act==="hshold"){
    readForm();
    startSW("Handstand hold", sec=>{
      if (!S.draft) return;
      const hs = S.draft.hs, s = Math.round(sec);
      hs.holds = (hs.holds||[]).concat(s);
      hs.best = Math.max.apply(null, hs.holds); hs.time = hs.holds.reduce((a,b)=>a+b,0); hs.tries = hs.holds.length;
      logEvent("hold", {s}); saveDraft();
      [["f-hsb",hs.best],["f-hst",hs.time],["f-hsa",hs.tries]].forEach(([id,v])=>{ const el = document.getElementById(id); if (el) el.value = v; });
      const el = document.getElementById("hs-holds"); if (el) el.textContent = holdsText(hs);
    });
  }
  else if (act==="openlog"){ setTab("log"); }
  else if (act==="openplan"){ setTab("plan"); }
  else if (act==="days"){ const v = +a.dataset.v; if ([3,4,5].includes(v) && v!==+S.profile.planDays){ S.profile.planDays = v; saveProfile(); toast("Plan laid out for "+v+" days a week"); render(); } }
  else if (act==="cycleskin"){ const ks = Object.keys(SKINS); setSkin(ks[(ks.indexOf(skinKey())+1)%ks.length]); }
  else if (act==="skin"){ setSkin(a.dataset.k); }

  else if (act==="startdeload"){ const d = new Date(); d.setDate(d.getDate()+6); S.profile.deloadUntil = d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); S.profile.lastDeload = today(); saveProfile(); toast("Deload week started"); render(); }
  else if (act==="enddeload"){ S.profile.deloadUntil = ""; saveProfile(); toast("Deload ended"); render(); }
  else if (act==="savebw"){ const v = num($("#q-bw").value); if (!v || v<60 || v>500){ toast("Enter your weight in pounds"); return; } const P = S.profile; P.bw = v; P.bwLog = (P.bwLog||[]).filter(x=>x.d!==today()).concat({d:today(), w:v}).slice(-200); saveProfile(); toast("Weight saved"); render(); }
  else if (act==="hfilter"){ S.hFilter = a.dataset.f; render(); }
  else if (act==="save"){
    readForm();
    S.draft.lifts.forEach(l=>{ ensureSL(l); stampPlan(l, planFor(l, S.draft)); deriveRow(l); });
    const pending = S.draft.lifts.reduce((t,l)=>t + l.sl.filter(x=>!x.st && (r1(x.w) || r1(x.reps))).length, 0);
    if (pending && S.saveCheck!=="ok"){ S.saveCheck = pending; render(); const el = document.getElementById("savecheck"); if (el) el.scrollIntoView({block:"center", behavior:"smooth"}); return; }
    S.saveCheck = null;
    const d = JSON.parse(JSON.stringify(S.draft));
    d.lifts = d.lifts.map(l=>{ l.sl = l.sl.filter(x=>x.st); return deriveRow(l); }).filter(l=>l.sl.length);
    d.wrist = !!(d.wb && d.wb.done); d.handstand = !!(d.hs && d.hs.done);
    if (!d.climb.on) d.climb = {on:false};
    else if (d.type==="limit"){
      const L = (d.climb.list||[]).filter(p=>p.grade && ((num(p.attempts)||0)>0 || p.prog));
      d.climb.list = L;
      const sent = L.filter(p=>p.prog==="sent").sort((a,b)=>gradeN(b.grade)-gradeN(a.grade));
      const tried = L.slice().sort((a,b)=>gradeN(b.grade)-gradeN(a.grade));
      d.climb.send = sent.length ? sent[0].grade : "";
      d.climb.attempts = sent.length ? (num(sent[0].attempts)||null) : null;
      d.climb.tried = tried.length ? tried[0].grade : "";
      d.climb.problems = L.length;
    }
    a.disabled = true;
    d.prs = findPRs(d);
    /* the setup you marked as how you lift (Build), for before/after comparisons on Stats: only on sessions dated today (an
       older session's setup isn't known) and never replacing a tag a row already has. Build experiments are never recorded. */
    if (d.date === today() && bodyCache && window.SLSim && window.SLSim.log && window.SLSim.log.sig)
      d.lifts.forEach(l=>{ if (l.su == null){ try{ const g = window.SLSim.log.sig(bodyCache, l.lift); if (g) l.su = g; }catch(e){} } });
    if (d.live && d.live.start){ if (!d.live.end) d.live.end = Date.now(); if (!d.duration) d.duration = Math.max(1, Math.round((d.live.end-d.live.start)/60000)); }
    try{ await saveSession(d); toast(d.prs.length ? "PR! "+d.prs.join(" · ") : skinText("saved")+(d.duration?" · "+d.duration+" min":"")); S.draft = null; undoReset(); saveDraft(); stopTimer(); TM.sw = null; wake(false); liveBar(); setTab("history"); }
    catch(err){ a.disabled = false; }
  }
  else if (act==="edit"){ const s = S.sessions.find(x=>x.id===a.dataset.id); if (s){ undoReset(); S.saveCheck = null; S.draft = JSON.parse(JSON.stringify(s)); (S.draft.lifts||[]).forEach(l=>{ ensureSL(l, true); deriveRow(l); }); if(!S.draft.climb) S.draft.climb={on:false}; S.draft.climb = Object.assign({on:false,send:"",tried:"",attempts:"",problems:"",list:[],stop:""}, S.draft.climb); if (S.draft.type==="limit" && S.draft.climb.on && !S.draft.climb.list.length) S.draft.climb.list.push(newProb()); S.draft.fingers = Object.assign({done:false,edge:S.profile.edge||20,added:0,secs:10,hangs:5,clean:false}, S.draft.fingers||{}); S.draft.lifts = S.draft.lifts||[];
    S.draft.wb = Object.assign(newWrist(!!s.wrist), s.wb||{}); S.draft.hs = Object.assign(newHand(!!s.handstand), s.hs||{}); if (S.draft.wristPain==null) S.draft.wristPain = "";
    setTab("log"); } }
  else if (act==="del"){
    const id = a.dataset.id;
    if (S.confirmDel===id){ S.confirmDel=null; await deleteSession(id); toast("Deleted"); render(); }
    else { S.confirmDel = id; render(); setTimeout(()=>{ if (S.confirmDel===id){ S.confirmDel=null; if (S.tab==="history") render(); } }, 4000); }
  }
  else if (act==="setorm"){ S.profile.oneRM[a.dataset.k] = +a.dataset.v; if ((S.profile.unknown||{})[a.dataset.k]){ S.profile.unknown = Object.assign({}, S.profile.unknown); S.profile.unknown[a.dataset.k] = false; } saveProfile(); toast("Max updated"); render(); }
  else if (act==="copy"){ await copyBackup(); }
  else if (act==="export"){ await saveBackup(false); }
  else if (act==="share"){ await saveBackup(true); }
  else if (act==="import"){ await restoreText($("#imp").value); }
});
