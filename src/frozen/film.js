/* FROZEN. Film a set sheet. Loaded only when opened. */
import { S } from "../core/state.js";
import { esc, toast } from "../core/util.js";
import { SIM_BRIDGE, bodyCache, simReady } from "./sim-bridge.js";
import { fmtSpeed, speedUnit } from "./sim-log.js";
import { ensureSL, r1, wLabel } from "../logic/sets.js";
import { bwAt } from "../logic/status.js";
import { saveDraft, undoPush } from "../ui/live.js";
import { render } from "../ui/render.js";

/* ---------- film a set: a sheet over the log, outside the parts that re-render ---------- */
export const FILM = {el:null, url:null, i:null, lift:"", res:null, busy:false, alive:false};
export function closeFilm(){
  FILM.alive = false;
  if (FILM.url){ try{ URL.revokeObjectURL(FILM.url); }catch(e){} FILM.url = null; }
  if (FILM.el){ const v = FILM.el.querySelector("video"); if (v){ try{ v.pause(); v.removeAttribute("src"); v.load(); }catch(e){} } FILM.el.remove(); FILM.el = null; }
  FILM.res = null; FILM.busy = false;
}
export function openFilm(i){
  closeFilm();
  const l = S.draft && S.draft.lifts[i]; if (!l) return; ensureSL(l);
  const marked = l.sl.map((x,j)=>j).filter(j=>l.sl[j].st), pick = marked.length ? marked[marked.length-1] : Math.max(0, l.sl.findIndex(x=>!x.st));
  const el = document.createElement("div"); el.className = "fsheet"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", "Film a set");
  el.innerHTML = '<div class="panel"><div class="spread"><h2>Film a set · '+esc(l.lift)+'</h2><button class="btn small" data-fs="close">Close</button></div>'+
    '<p class="hint" style="margin:0">Film from the side, phone level at hip height and 3–5 m away, with your whole body and the bar in view. The video stays on this device and is not kept; only the numbers are saved to the set, and only if you press Save.</p>'+
    '<div class="row" style="gap:8px;flex-wrap:wrap;align-items:end"><label class="f" style="min-width:170px">Which set<select id="fs-set">'+
      l.sl.map((x,j)=>'<option value="'+j+'"'+(j===pick?' selected':'')+'>Set '+(j+1)+' · '+esc(String(wLabel(l.lift, r1(x.w)) || (r1(x.w)+' lb')))+' × '+(r1(x.reps) || r1(x.tgt) || '?')+'</option>').join('')+'</select></label>'+
      '<button class="btn small primary" data-fs="pick">Record or choose a video</button><input type="file" id="fs-file" accept="video/*" hidden></div>'+
    '<video id="fs-video" playsinline muted controls preload="auto" hidden></video>'+
    '<div class="fprog" id="fs-progw" hidden><i id="fs-prog"></i></div><p class="hint" id="fs-status" aria-live="polite" style="margin:0"></p>'+
    '<div id="fs-res"></div></div>';
  document.body.appendChild(el); FILM.el = el; FILM.i = i; FILM.lift = l.lift;
  el.addEventListener("click", filmClick);
  el.querySelector("#fs-set").addEventListener("change", ()=>{ if (FILM.res && !FILM.res.err) renderFilmRes(); });
  el.querySelector("#fs-file").addEventListener("change", e=>{ const f = e.target.files && e.target.files[0]; if (!f) return;
    if (FILM.url) URL.revokeObjectURL(FILM.url); FILM.url = URL.createObjectURL(f); FILM.res = null; el.querySelector("#fs-res").innerHTML = "";
    const v = el.querySelector("#fs-video"); v.hidden = false; v.src = FILM.url; filmSay("Loading the video…");
    v.addEventListener("loadeddata", ()=>{ filmTrack(); }, {once:true});
    v.addEventListener("error", ()=>{ filmSay("This video couldn't be played here. Try an MP4 (H.264) file."); }, {once:true}); });
  simReady().catch(()=>{});   // start fetching the model while you film
}
export const filmSay = t=>{ const s = FILM.el && FILM.el.querySelector("#fs-status"); if (s) s.textContent = t; };
export async function filmTrack(){
  if (FILM.busy || !FILM.el) return; FILM.busy = true; FILM.alive = true;
  const el = FILM.el, v = el.querySelector("#fs-video"), pw = el.querySelector("#fs-progw"), pb = el.querySelector("#fs-prog"); pw.hidden = false;
  try{
    filmSay("Loading the model…"); const api = await simReady();
    const l = S.draft && S.draft.lifts[FILM.i], x = l && l.sl[+el.querySelector("#fs-set").value];
    const res = await api.film({video:v, rec: bodyCache || {}, bw: bwAt(S.draft.date), lift: FILM.lift, w: r1(x && x.w), oneRM: S.profile.oneRM, best: SIM_BRIDGE.liftBest,
      say: filmSay, prog: f=>{ pb.style.width = Math.round(f*100)+"%"; }, alive: ()=>FILM.alive && !!FILM.el});
    if (!FILM.alive || !FILM.el || !res) return;
    FILM.res = res; filmSay(res.err ? "" : "Tracked "+res.n+" rep"+(res.n===1?"":"s")+"."); renderFilmRes();
  }catch(e){ filmSay("Tracking couldn't run in this view ("+(e && e.message ? e.message : "blocked")+"). On the Build tab you can mark the joints by hand instead."); }
  finally{ FILM.busy = false; if (pw) pw.hidden = true; }
}
export function filmEst(){
  const R = FILM.res, el = FILM.el; if (!R || R.err || !el || !window.SLSim) return null;
  const l = S.draft && S.draft.lifts[FILM.i], x = l && l.sl[+el.querySelector("#fs-set").value]; if (!x) return null;
  if (R.conf < 0.4 || R.n < 2 || R.loss == null) return null;
  return window.SLSim.log.rir({rec: bodyCache || {}, bw: bwAt(S.draft.date), lift: FILM.lift, w: r1(x.w), oneRM: S.profile.oneRM, best: SIM_BRIDGE.liftBest, n: R.n, loss: R.loss});
}
export function renderFilmRes(){
  const el = FILM.el && FILM.el.querySelector("#fs-res"), R = FILM.res; if (!el || !R) return;
  if (R.err){ el.innerHTML = '<p class="fnote w">'+esc(R.err)+'</p><div class="row"><button class="btn small" data-fs="close">Close</button></div>'; return; }
  const j = +FILM.el.querySelector("#fs-set").value, est = filmEst(), L = [];
  let h = '<div class="fchips">'+R.vel.map((v,k)=>'<span><b>'+(k+1)+'</b> '+fmtSpeed(v)+'</span>').join('')+'<span style="background:none;color:var(--faint)">'+speedUnit()+', average on the way up</span></div>';
  if (R.conf < 0.4) L.push(['w', 'The pose tracker wasn\'t confident on this video (often dark or cluttered, loose clothing, or not side-on), so there\'s no reps-in-reserve estimate. The Build tab can mark the joints by hand.']);
  if (R.loss != null) L.push(['', 'Speed dropped '+Math.round(R.loss*100)+'% from the faster of the first two reps to the last.']);
  if (est){ const pct = Math.round(R.loss*100);
    L.push(['', '<b>About '+est.rir+' rep'+(est.rir===1?'':'s')+' left in reserve</b> (model): at this weight the model reaches '+pct+'% speed loss around rep '+est.kModel+' of a set to failure of about '+est.rtf+' reps.']);
    if (est.expLoss != null){ const ex = Math.round(est.expLoss*100);
      if (R.loss > est.expLoss + 0.08) L.push(['w', 'By rep '+R.n+' the model expected about '+ex+'% loss. You slowed faster, so today you were closer to failure than your logged max suggests.']);
      else if (R.loss < est.expLoss - 0.08) L.push(['', 'By rep '+R.n+' the model expected about '+ex+'% loss. You slowed less, so you had more in the tank than your logged max suggests.']); } }
  const sure = R.conf >= 0.4;
  if (sure) (R.find || []).filter(f=>f[1]!=="Speed").forEach(f=>L.push([f[0]==="w" ? 'w' : '', '<b>'+esc(f[1])+':</b> '+esc(f[2])]));
  h += L.map(([c,t])=>'<p class="fnote '+c+'">'+t+'</p>').join('');
  h += '<p class="hint" style="margin:0">Speeds are measured at the '+(/squat/i.test(FILM.lift) ? 'shoulders (where the bar sits)' : /pull-up/i.test(FILM.lift) ? 'shoulders' : 'hands')+', scaled from your leg measurements, so the percentage drop is more reliable than the speeds themselves. Reps in reserve: ±2 reps.</p>';
  h += sure ? '<div class="row"><button class="btn small primary" data-fs="save">Save to set '+(j+1)+'</button><button class="btn small" data-fs="close">Discard</button></div>'
    : '<div class="row"><button class="btn small" data-fs="pick">Try another video</button><button class="btn small" data-fs="close">Close</button></div>';
  el.innerHTML = h;
}
export function filmClick(e){
  const t = e.target.closest("[data-fs]"); if (!t) return;
  if (t.dataset.fs==="close"){ closeFilm(); return; }
  if (t.dataset.fs==="pick"){ const f = FILM.el && FILM.el.querySelector("#fs-file"); if (f && !FILM.busy){ f.value = ""; f.click(); } return; }
  if (t.dataset.fs==="save"){
    const R = FILM.res, l = S.draft && S.draft.lifts[FILM.i]; if (!R || R.err || R.conf < 0.4) return;
    if (!l || l.lift !== FILM.lift){ toast("The lifts changed while filming. Open Film a set again."); return; }
    const j = +FILM.el.querySelector("#fs-set").value, x = l.sl[j]; if (!x) return;
    const est = filmEst(), rd = v => v==null || !isFinite(v) ? null : Math.round(v*100)/100;
    undoPush();
    const vid = {n:R.n, v:R.vel.map(rd), loss:rd(R.loss), rir: est ? est.rir : null, at:Date.now()};
    if (R.depth != null && /squat/i.test(l.lift)) vid.d = Math.round(R.depth);
    if (R.hipsFirst != null && /squat|deadlift/i.test(l.lift)) vid.hf = Math.round(R.hipsFirst);
    x.vid = vid; saveDraft(); closeFilm(); if (S.tab==="log") render(); toast("Saved to set "+(j+1));
  }
}
