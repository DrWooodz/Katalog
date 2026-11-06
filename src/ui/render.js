/* render(): draws the current tab into #main; setTab(). */
import { S } from "../core/state.js";
import { $, esc, lsSet } from "../core/util.js";
import { TYPES } from "../data/types.js";
import { mountSim, unmountSim } from "../frozen/sim-bridge.js";
import { simFill } from "../frozen/sim-log.js";
import { statsFill } from "../frozen/stats-model.js";
import { vHistory } from "../tabs/history.js";
import { readForm } from "../tabs/log-form.js";
import { vLog } from "../tabs/log.js";
import { vMethod } from "../tabs/method.js";
import { vPlan } from "../tabs/plan.js";
import { vSetup } from "../tabs/setup.js";
import { vProgress } from "../tabs/stats.js";
import { vToday } from "../tabs/today.js";
import { saveDraft } from "./live.js";

/* ---------- views ---------- */
export function renderData(){ if (S.tab==="log" && $("#main").dataset.v==="log") return; render(); }
export function setTab(t){ S.tab = t; lsSet("sl.tab", t); render(); window.scrollTo(0,0); }
export function render(){
  document.querySelectorAll("#tabs button").forEach(b=> b.setAttribute("aria-selected", b.dataset.tab===S.tab ? "true":"false"));
  const m = $("#main");
  if (S.tab==="build"){
    if (m.dataset.v==="build" && m.querySelector("#sim-host")) return;
    m.dataset.v = "build"; m.innerHTML = '<section class="view"><div id="sim-host"></div></section>';
    mountSim(m.querySelector("#sim-host")); return;
  }
  unmountSim();
  const v = {today:vToday, plan:vPlan, log:vLog, history:vHistory, progress:vProgress, method:vMethod, setup:vSetup}[S.tab] || vToday;
  // keep focus/inputs in log form stable: only re-render log when asked
  if (S.tab==="log" && m.dataset.v==="log" && S.keepLog) { S.keepLog=false; return; }
  m.dataset.v = S.tab;
  m.innerHTML = '<section class="view">'+v()+'</section>';
  if (S.tab==="log") simFill();
  if (S.tab==="progress") statsFill();
  const hd = document.querySelector("header.top"); if (hd) document.documentElement.style.setProperty("--hdrH", hd.offsetHeight+"px");
}
document.addEventListener("keydown", e=>{ if (e.key==="Escape" && S.probEdit!=null && S.tab==="log"){ readForm(); S.probEdit = null; saveDraft(); render(); } });
export function typeTag(t){ const T = TYPES[t]||TYPES.other; return '<span class="type" style="--tc:'+T.c+'">'+esc(T.short)+'</span>'; }
