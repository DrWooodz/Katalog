import { S } from "../core/state.js";
import { esc, lsSet, mmss, toast } from "../core/util.js";

/* ---------- live session engine: phase timers, stopwatch, sounds, screen wake ---------- */
export const TM = {phases:[], i:-1, endAt:0, label:"", cut:false, lastTick:null, sw:null};
export let AC = null, WL = null;
export function audio(){ try{ AC = AC || new (window.AudioContext||window.webkitAudioContext)(); if (AC.state==="suspended") AC.resume(); }catch(e){} }
export function tone(f, dur, at){ try{ if (!AC) return; const t0 = AC.currentTime+(at||0), o = AC.createOscillator(), g = AC.createGain(); o.frequency.value = f; g.gain.setValueAtTime(0.25, t0); g.gain.exponentialRampToValueAtTime(0.001, t0+dur); o.connect(g); g.connect(AC.destination); o.start(t0); o.stop(t0+dur+0.02); }catch(e){} }
export const SND = {tick:()=>tone(660,.1), go:()=>tone(990,.28), stop:()=>tone(440,.32), done:()=>{ tone(880,.18); tone(880,.18,.28); tone(1175,.35,.56); }};
export function buzz(p){ try{ if (navigator.vibrate) navigator.vibrate(p); }catch(e){} }
export const liveOn = () => !!(S.draft && S.draft.live && S.draft.live.start && !S.draft.live.end);
export const timerActive = () => TM.i>=0 && !!TM.phases[TM.i];
export async function wake(on){
  try{
    if (on && !WL && navigator.wakeLock && document.visibilityState==="visible"){ WL = await navigator.wakeLock.request("screen"); WL.addEventListener("release", ()=>{ WL = null; }); }
    else if (!on && WL){ await WL.release(); WL = null; }
  }catch(e){}
}
document.addEventListener("visibilitychange", ()=>{ if (document.visibilityState==="visible"){ if (liveOn()) wake(true); tick(); } });
export function logEvent(k, data){ if (liveOn()){ S.draft.live.events.push(Object.assign({t:Date.now(), k}, data||{})); saveDraft(); } }
/* phases: {name, s, kind:'work'|'rest'|'ready', count (3-2-1 ticks), cut (can be cut short), onEnd(cut)} */
export function runTimer(label, phases){ audio(); TM.sw = null; TM.label = label; TM.phases = phases; TM.i = -1; nextPhase(); }
export function nextPhase(){
  TM.i++; TM.cut = false; TM.lastTick = null;
  const p = TM.phases[TM.i];
  if (!p){ const was = TM.label; TM.phases = []; TM.i = -1; TM.label = ""; SND.done(); buzz([200,100,200]); if (was) toast(was+" done"); liveBar(); return; }
  TM.endAt = Date.now()+p.s*1000;
  if (p.kind==="work") { SND.go(); buzz(150); } else if (p.kind==="rest" && TM.i>0) { SND.stop(); buzz(80); }
  liveBar();
}
export function stopTimer(){ TM.phases = []; TM.i = -1; TM.label = ""; liveBar(); }
export function startSW(label, onStop){ audio(); stopTimer(); TM.sw = {start:Date.now(), label, onStop}; SND.go(); liveBar(); }
export function stopSW(){ const sw = TM.sw; if (!sw) return; TM.sw = null; SND.stop(); sw.onStop((Date.now()-sw.start)/1000); liveBar(); }
export function tick(){
  const now = Date.now();
  let guard = 0;
  while (timerActive() && now >= TM.endAt && guard++ < 300){ const p = TM.phases[TM.i]; if (p.onEnd) p.onEnd(TM.cut); nextPhase(); }
  if (timerActive()){
    const p = TM.phases[TM.i], rem = Math.ceil((TM.endAt-now)/1000);
    if (p.count && rem>=1 && rem<=3 && TM.lastTick!==rem){ TM.lastTick = rem; SND.tick(); }
  }
  const lb = document.getElementById("livebar"); if (!lb || lb.hidden) return;
  const ck = document.getElementById("lb-clock"); if (ck && liveOn()) ck.textContent = mmss((now-S.draft.live.start)/1000);
  const tt = document.getElementById("lb-time");
  if (tt) tt.textContent = TM.sw ? mmss((now-TM.sw.start)/1000) : (timerActive() ? mmss((TM.endAt-now)/1000) : "");
  const st = document.getElementById("tmr"); if (st) st.textContent = timerActive() ? mmss((TM.endAt-now)/1000) : "0:00";
}
setInterval(()=>{ if (liveOn() || timerActive() || TM.sw) tick(); }, 200);
/* the bar is rebuilt only when its state changes; tick() just updates the numbers, so taps on its buttons always land */
export function liveBar(){
  const lb = document.getElementById("livebar"); if (!lb) return;
  const show = liveOn() || timerActive() || !!TM.sw;
  lb.hidden = !show; document.body.classList.toggle("haslive", show);
  if (!show) return;
  const p = timerActive() ? TM.phases[TM.i] : null;
  let label = "", btns = "";
  if (TM.sw){ label = TM.sw.label; btns = '<button class="btn primary small" data-act="swstop">Stop hold</button>'; }
  else if (p){
    label = p.name;
    if (p.cut) btns += '<button class="btn small" data-act="tcut">Cut short</button>';
    if (p.kind==="rest") btns += '<button class="btn small" data-act="tadd">+30 s</button>';
    btns += '<button class="btn small" data-act="tskip">Skip</button><button class="btn small" data-act="tstop" aria-label="Stop timer">✕</button>';
  } else {
    label = "Rest timer";
    btns = [60,120,180,240].map(s=>'<button class="btn small" data-act="rest" data-s="'+s+'">'+mmss(s)+'</button>').join("");
  }
  lb.innerHTML = '<div class="lb-in">'+(liveOn()?'<div class="lb-sess"><span class="lb-dot"></span><span id="lb-clock">0:00</span></div>':'')+
    '<div class="lb-main"><span class="lb-label">'+esc(label)+'</span><span class="lb-time" id="lb-time"></span></div><div class="lb-btns">'+btns+'</div></div>';
  if (p) lb.dataset.kind = p.kind; else delete lb.dataset.kind;
  tick();
}
export function restTimer(name, s){ runTimer("Rest", [{name:name, s:s, kind:"rest", count:true}]); }
export function restFor(k){ const r = Object.assign({top:240, backoff:180, acc:120, hang:180, limit:180, wrist:60}, S.profile.rest||{}); return r[k]||120; }
export function saveDraft(){ lsSet("sl.draft", S.draft); }
/* undo: snapshots of the draft taken before every change to it (session-long, last 40) */
export const UNDO = [];
export function undoPush(){ if (!S.draft) return; const js = JSON.stringify(S.draft); if (UNDO[UNDO.length-1] !== js) UNDO.push(js); if (UNDO.length > 40) UNDO.shift(); }
export function undoReset(){ UNDO.length = 0; }
