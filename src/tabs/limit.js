/* Log tab, limit bouldering: problem tiles, editor sheet, meters, pinned session card. */
import { S } from "../core/state.js";
import { esc, gradeN, mmss, num } from "../core/util.js";
import { GRADES, LIMIT_PLAN, PROGRESS, STYLES } from "../data/types.js";
import { limitTargets, openProjects, projectMap } from "../logic/climb.js";
import { UNDO, liveOn, restFor } from "../ui/live.js";

export function limitMeters(d, lt){
  const P = d.climb.list || [];
  const att = P.reduce((s,p)=>s+(num(p.attempts)||0),0);
  const sends = P.filter(p=>p.prog==="sent").length;
  const thr = lt.zone, hard = P.filter(p=>(gradeN(p.grade)||0)>=thr).length;
  return '<div class="meter"><span class="lab">Attempts</span><span class="val">'+att+' <small>/ '+lt.lo+'–'+lt.hi+'</small></span><div class="bar"><i style="width:'+Math.min(100,att/lt.hi*100)+'%"></i></div></div>'+
    '<div class="meter"><span class="lab">Problems at V'+thr+'+</span><span class="val">'+hard+' <small>/ '+LIMIT_PLAN.probs+'</small></span><div class="bar"><i style="width:'+Math.min(100,hard/LIMIT_PLAN.probsMax*100)+'%"></i></div></div>'+
    '<div class="meter"><span class="lab">Sends</span><span class="val">'+sends+' <small>/ '+P.length+'</small></span><div class="bar"><i style="width:'+(P.length?Math.round(sends/P.length*100):0)+'%"></i></div></div>';
}
export function updateLimitMeters(){ const el = document.getElementById("limmeters"); if (el && S.draft) el.innerHTML = limitMeters(S.draft, limitTargets()); }
/* green (easy) to red to violet (hardest) */
export const gradeCol = g => { const n = gradeN(g); if (n==null) return "var(--faint)"; const stops = ["#3aa55d","#7ab648","#c7b52e","#e0952b","#e0642b","#d63c3c","#b8336a","#8b3fa8"]; return stops[Math.min(stops.length-1, Math.floor(n/1.7))]; };
export const progLabel = v => (PROGRESS.find(x=>x[0]===v) || ["",""])[1];
export function probTile(p, i, PM){
  const known = p.name && PM.find(x=>x.name.toLowerCase()===String(p.name).toLowerCase() && !x.sent && x.att - (num(p.attempts)||0) > 0);
  return '<div class="ptile'+(p.prog==="sent"?' sent':'')+'" style="--gc:'+gradeCol(p.grade)+'">'+
    '<button class="open" data-act="popen" data-i="'+i+'" aria-label="Edit problem '+(i+1)+'"><span class="top"><span class="gr">'+esc(p.grade||"V?")+'</span><span class="no">#'+(i+1)+'</span></span>'+
    '<span class="nm'+(p.name?'':' ph')+'">'+esc(p.name || "Unnamed")+'</span>'+
    '<span class="meta">'+(p.prog ? '<span class="res'+(p.prog==="sent"?' sent':'')+'">'+esc(progLabel(p.prog))+'</span>' : 'No result yet')+(p.style ? ' · '+esc(p.style) : '')+'</span>'+
    (known ? '<span class="meta">Project · '+(known.att - (num(p.attempts)||0))+' earlier tries</span>' : '')+'</button>'+
    '<div class="cnt"><button class="btn" data-act="att" data-i="'+i+'" data-d="-1" aria-label="One fewer attempt">−</button><span style="text-align:center"><b>'+(num(p.attempts)||0)+'</b><br><small>tries</small></span><button class="btn" data-act="att" data-i="'+i+'" data-d="1" aria-label="One more attempt">+</button></div></div>';
}
export function probSheet(d, i){
  const p = (d.climb.list||[])[i]; if (!p) return "";
  return '<div class="psheet" data-act="pclose"><div class="in pedit" data-p="'+i+'" role="dialog" aria-label="Problem '+(i+1)+'">'+
    '<div class="spread"><h3>Problem '+(i+1)+'</h3><button class="btn small primary" data-act="pclose">Done</button></div>'+
    '<label class="f">Name (use the same name to keep counting a project)<input type="text" data-pk="name" value="'+esc(p.name)+'" placeholder="e.g. Yellow tag cave" list="projnames"></label>'+
    '<div class="lab">Grade</div><div class="chiprow grades">'+GRADES.slice(1).map(g=>'<button data-act="pset" data-i="'+i+'" data-k="grade" data-v="'+g+'" aria-pressed="'+(p.grade===g)+'" style="--gc:'+gradeCol(g)+'">'+g+'</button>').join("")+'</div>'+
    '<div class="lab">Attempts</div><div class="big"><button class="btn" data-act="att" data-i="'+i+'" data-d="-1" aria-label="One fewer attempt">−</button><b>'+(num(p.attempts)||0)+'</b><button class="btn" data-act="att" data-i="'+i+'" data-d="1" aria-label="One more attempt">+</button></div>'+
    '<div class="lab">Best result</div><div class="chiprow">'+PROGRESS.slice(1).map(([v,t])=>'<button data-act="pset" data-i="'+i+'" data-k="prog" data-v="'+v+'" aria-pressed="'+(p.prog===v)+'">'+t+'</button>').join("")+'</div>'+
    '<div class="lab">Style</div><div class="chiprow">'+STYLES.slice(1).map(st=>'<button data-act="pset" data-i="'+i+'" data-k="style" data-v="'+esc(st)+'" aria-pressed="'+(p.style===st)+'">'+esc(st)+'</button>').join("")+'</div>'+
    '<div class="spread"><button class="btn small danger" data-act="rmprob" data-i="'+i+'">Delete problem</button><button class="btn primary" data-act="pclose">Done</button></div></div></div>';
}
export function limitPanel(d){
  const P = d.climb.list || [], PM = projectMap();
  const att = P.reduce((s,p)=>s+(num(p.attempts)||0),0), sends = P.filter(p=>p.prog==="sent").length;
  const projects = openProjects(), lt = limitTargets(), thr = lt.zone, hard = P.filter(p=>(gradeN(p.grade)||0)>=thr).length;
  const planTxt = 'Ramp '+lt.ramp+' until you move well, then '+LIMIT_PLAN.probs+' problems at '+lt.zoneTxt+(lt.project?' (solid at '+lt.grade+')':'')+' for '+lt.lo+'–'+lt.hi+' hard attempts ('+lt.why+'). Rest 3–5 min between attempts. Stop when moves get sloppy, not when you feel tired.';
  const pc = (v, m) => Math.min(100, m ? Math.round(v/m*100) : 0)+'%';
  // pinned: stays in view while you scroll through problems
  let h = '<div class="limhud" id="limhud"><div class="mm">'+
    '<div class="mi"><span>Attempts</span><b>'+att+' <small>/ '+lt.lo+'–'+lt.hi+'</small></b><i class="'+(att>=lt.lo?'done':'')+'" style="--p:'+pc(att, lt.hi)+'"></i></div>'+
    '<div class="mi"><span>V'+thr+'+ problems</span><b>'+hard+' <small>/ '+LIMIT_PLAN.probs+'</small></b><i class="'+(hard>=4?'done':'')+'" style="--p:'+pc(hard, LIMIT_PLAN.probsMax)+'"></i></div>'+
    '<div class="mi"><span>Sends</span><b>'+sends+' <small>/ '+P.length+'</small></b><i style="--p:'+pc(sends, P.length)+'"></i></div>'+
    '<div class="clockbox"><span>Rest</span><span class="clock" id="tmr">0:00</span></div></div>'+
    '<div class="pl"><span class="t'+(S.planOpen?'':' clip')+'">'+esc(planTxt)+(lt.warn?' <span style="color:var(--warn)">'+esc(lt.warn)+'</span>':'')+'</span><button data-act="plantoggle">'+(S.planOpen?'Less':'Plan')+'</button></div>'+
    '<div class="rests"><span class="rl">Rest</span><button class="btn small" data-act="rest" data-s="180">3:00</button><button class="btn small" data-act="rest" data-s="240">4:00</button><button class="btn small" data-act="rest" data-s="300">5:00</button><button class="btn small" data-act="rest" data-s="0">Stop</button><button class="btn small" data-act="undo"'+(UNDO.length?'':' disabled')+' style="margin-left:auto" title="Undo the last change">↶ Undo</button>'+(liveOn()?'<span class="hint" style="align-self:center">Each + starts a '+mmss(restFor("limit"))+' rest</span>':'')+'</div></div>';
  if (projects.length) h += '<p class="hint" style="margin:10px 0 0">Open projects: '+projects.slice(0,4).map(p=>esc(p.name)+' ('+esc(p.grade)+', '+p.att+' tries)').join(" · ")+'. Give a problem the same name to keep counting.</p>';
  h += '<div class="ptiles" style="margin-top:10px">'+P.map((p,i)=>probTile(p, i, PM)).join("")+'<button class="ptile add" data-act="addprob">+ Add problem</button></div>';
  h += '<datalist id="projnames">'+projects.map(p=>'<option value="'+esc(p.name)+'">').join("")+'</datalist>';
  h += '<label class="f" style="margin-top:10px">Why you stopped<select id="f-stop">'+[["","—"],["quality","Move quality dropped"],["skin","Skin"],["fingers","Fingers or elbows talking"],["power","Out of power"],["time","Ran out of time"],["plan","Hit the plan"]].map(([v,t])=>'<option value="'+v+'"'+(d.climb.stop===v?' selected':'')+'>'+t+'</option>').join("")+'</select></label>';
  if (S.probEdit!=null) h += probSheet(d, S.probEdit);
  return h;
}
