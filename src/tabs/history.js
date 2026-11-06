import { S, sorted } from "../core/state.js";
import { esc, fmtDate, num } from "../core/util.js";
import { HS_LEVELS } from "../data/plans.js";
import { BARBELL_LIFTS, PROGRESS, TYPES } from "../data/types.js";
import { fmtSets } from "../logic/sets.js";
import { plateHTML } from "../ui/plates.js";
import { typeTag } from "../ui/render.js";

/* ----- history ----- */
export function summary(s){
  const out = [];
  if (s.fingers && s.fingers.done) out.push("Hangs: "+(s.fingers.edge||20)+"mm "+((s.fingers.added||0)>=0?"+":"")+(s.fingers.added||0)+" lb, "+(s.fingers.hangs||"?")+"×"+(s.fingers.secs||10)+"s"+(s.fingers.clean?" ✓":""));
  (s.lifts||[]).filter(l=>l.w || (l.sl && l.sl.length)).forEach(l=> out.push(l.lift+(l.role==="top"?" (top)":l.role==="backoff"?" (back-off)":"")+": "+fmtSets(l)));
  const L = (s.climb && s.climb.list) || [];
  if (s.climb && s.climb.on && L.length){
    const att = L.reduce((t,p)=>t+(num(p.attempts)||0),0);
    out.push("Limit: "+L.length+" problems, "+att+" attempts, "+L.filter(p=>p.prog==="sent").length+" sent"+(s.climb.stop?" · stopped: "+({quality:"quality dropped",skin:"skin",fingers:"fingers/elbows",power:"out of power",time:"time",plan:"hit the plan"})[s.climb.stop]:""));
    L.forEach(p=> out.push("  "+p.grade+(p.name?" "+p.name:"")+": "+(p.attempts||0)+" tries · "+((PROGRESS.find(x=>x[0]===p.prog)||["",""])[1]||"no result")+(p.style?" · "+p.style.toLowerCase():"")));
  } else if (s.climb && s.climb.on){
    const p = [];
    if (s.climb.send) p.push("sent "+s.climb.send+(s.climb.attempts?" in "+s.climb.attempts:""));
    if (s.climb.tried) p.push("tried "+s.climb.tried);
    if (s.climb.problems) p.push(s.climb.problems+" problems");
    out.push("Climbing: "+(p.join(", ")||"logged"));
  }
  const ex = []; if (s.wrist) ex.push("wrist block"); if (s.handstand) ex.push("handstands");
  if (s.wb && s.wb.done){
    const w = s.wb, parts = [];
    if (w.ext && w.ext.w) parts.push("ext "+w.ext.w+" lb "+(w.ext.sets||"?")+"×"+(w.ext.reps||"?"));
    if (w.flex && w.flex.w) parts.push("flex "+w.flex.w+" lb "+(w.flex.sets||"?")+"×"+(w.flex.reps||"?"));
    if (w.iso) parts.push("iso"); if (w.dev) parts.push("deviation"); if (w.rocks) parts.push("rocks");
    if (w.leans) parts.push("lean "+w.leans+" s");
    out.push("Wrist P"+(w.phase||1)+": "+parts.join(", "));
  } else if (s.wrist) ex.push("wrist block");
  if (s.hs && s.hs.done){
    out.push("Handstand L"+(s.hs.level||1)+" "+HS_LEVELS[s.hs.level||1].name.toLowerCase()+(s.hs.best?": best "+s.hs.best+" s":"")+(s.hs.time?", "+s.hs.time+" s total":""));
  } else if (s.handstand) ex.push("handstands");
  if (s.wristPain!=="" && s.wristPain!=null) out.push("Wrist pain "+s.wristPain+"/10");
  if (ex.length) out.push("Extras: "+ex.join(", "));
  if (num(s.rpe)!=null) out.push("Effort "+s.rpe+"/10"+(s.duration?" · load "+Math.round(s.rpe*s.duration)+" (effort × min)":""));
  if (s.prs && s.prs.length) out.push("PR: "+s.prs.join(" · "));
  if (s.duration || (s.live && s.live.events && s.live.events.length)){
    const ev = (s.live && s.live.events) || [];
    out.push((s.duration?"Duration "+s.duration+" min":"")+(ev.length?(s.duration?" · ":"")+[["set","set"],["hang","hang"],["attempt","attempt"],["hold","hold"]].map(([k,w])=>{ const n = ev.filter(e=>e.k===k).length; return n ? n+" "+w+(n===1?"":"s") : ""; }).filter(Boolean).join(", ")+" tracked live":""));
  }
  return out;
}
export function vHistory(){
  const f = S.hFilter || "all", all = sorted();
  const present = Object.keys(TYPES).filter(k=>all.some(s=>s.type===k));
  const chips = all.length ? '<div class="typepick">'+[["all","All · "+all.length]].concat(present.map(k=>[k, TYPES[k].short+" · "+all.filter(s=>s.type===k).length])).map(([k,l])=>'<button data-act="hfilter" data-f="'+k+'" aria-pressed="'+(f===k)+'"'+(k!=="all"?' style="--tc:'+TYPES[k].c+'"':' style="--tc:var(--faint)"')+'>'+esc(l)+'</button>').join("")+'</div>' : '';
  const list = f==="all" ? all : all.filter(s=>s.type===f);
  return chips + vHistoryList(list);
}
export function vHistoryList(list){
  if (!list.length) return '<div class="empty">'+(!S.storeDone?"Loading your sessions…":"No sessions yet. Log one from the Today or Log tab and it shows up here.")+'</div>';
  return '<div class="hist">'+list.map(s=>{
    const T = TYPES[s.type]||TYPES.other;
    const conf = S.confirmDel===s.id;
    return '<article class="hitem" style="--tc:'+T.c+'"><div class="spread"><span class="d">'+esc(fmtDate(s.date))+'</span>'+typeTag(s.type)+'</div>'+
      '<ul>'+summary(s).map(x=>'<li>'+esc(x)+'</li>').join("")+'</ul>'+(s.lifts||[]).filter(l=>l.role==="top" && BARBELL_LIFTS[l.lift] && num(l.w)).map(l=>plateHTML(l.lift, l.w, true)).join("")+(s.notes?'<div class="note">'+esc(s.notes)+'</div>':'')+
      '<div class="row"><button class="btn small" data-act="edit" data-id="'+s.id+'">Edit</button><button class="btn small danger" data-act="del" data-id="'+s.id+'">'+(conf?'Tap again to delete':'Delete')+'</button></div></article>';
  }).join("")+'</div>';
}
