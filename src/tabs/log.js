import { S } from "../core/state.js";
import { clock, esc, mmss, num } from "../core/util.js";
import { HS_LEVELS, WRIST_PHASES } from "../data/plans.js";
import { GRADES, LIFTS, MAIN, SIM_LIFTS, TYPES } from "../data/types.js";
import { easeHTML, missHTML, simCueHTML, vidLine } from "../frozen/sim-log.js";
import { newDraft, pctText, planFor } from "../logic/draft.js";
import { deriveRow, ensureSL, r1, rowSum, setClean, stampPlan, sumCls, wLabel } from "../logic/sets.js";
import { bwAt } from "../logic/status.js";
import { suggestion } from "../logic/week.js";
import { newHand, newWrist, nextHand, nextWrist } from "../logic/wrist.js";
import { limitPanel } from "./limit.js";
import { UNDO, liveOn, restFor } from "../ui/live.js";
import { plateHTML, ratioText } from "../ui/plates.js";

export function liveHTML(d){
  if (d.live && d.live.end) return "";
  if (!liveOn()) return '<div class="panel"><div class="spread"><h2>Live tracking</h2><button class="btn primary small" data-act="livestart">Start live session</button></div>'+
    '<p class="hint">Use this when your phone is with you. Every set, hang, attempt and handstand hold is timestamped. Rests start on their own, hangs run on an interval timer, and the screen stays awake while the page is open. Cues are beeps, so keep your phone off silent.</p></div>';
  const n = d.live.events.length;
  return '<div class="panel livepanel"><div class="spread"><h2>Live · started '+esc(new Date(d.live.start).toLocaleTimeString([], {hour:"numeric", minute:"2-digit"}))+'</h2><span class="hint">'+n+' event'+(n===1?'':'s')+' logged</span></div>'+
    '<p class="hint">Mark each set ✓, ≈ or ✗ as you finish it and the rest timer starts. The highlighted set is next. Save the session when you finish and its duration is recorded. If the page reloads, the session picks up where it left off.</p>'+
    '<div class="row"><button class="btn small danger" data-act="livediscard">'+(S.confirmDiscard?'Tap again to discard':'Discard live session')+'</button></div></div>';
}
export function hangStatus(d){
  const f = d.fingers, L = f.hangLog || [];
  if (!L.length) return "5 s ready → "+(f.secs||10)+" s hang → "+mmss(restFor("hang"))+" rest, × "+(f.hangs||5)+". Tap Cut short if you come off early.";
  return L.map(x=>x.ok?"✓":"✗").join(" ")+"  "+L.length+"/"+(f.planned||f.hangs||L.length)+" hangs";
}
export function holdsText(hs){ const H = hs.holds || []; return H.length ? "Holds: "+H.map(x=>x+" s").join(", ") : "Start the stopwatch as you kick up and stop it when you come down."; }
export function vLog(){
  if (!S.draft) S.draft = newDraft(suggestion().type, suggestion().fingers);
  const d = S.draft, editing = S.sessions.some(s=>s.id===d.id);
  if (!d.wb) d.wb = newWrist(false); if (!d.hs) d.hs = newHand(false); if (!d.climb) d.climb = {on:false}; if (!d.lifts) d.lifts = []; if (!d.fingers) d.fingers = {done:false, edge:20, added:0, secs:10, hangs:5};
  const o = S.profile.oneRM;
  let h = liveHTML(d)+'<div class="panel"><h2>'+(editing?'Edit session':'New session')+'</h2><div class="typepick">'+
    Object.keys(TYPES).map(k=>'<button data-act="type" data-type="'+k+'" style="--tc:'+TYPES[k].c+'" aria-pressed="'+(d.type===k)+'">'+esc(TYPES[k].label)+'</button>').join("")+'</div>'+
    '<div class="grid4" style="grid-template-columns:repeat(auto-fit,minmax(130px,1fr))"><label class="f">Date<input type="date" id="f-date" value="'+esc(d.date)+'"></label>'+
    '<label class="f">Duration (min)<input type="number" inputmode="numeric" id="f-dur" value="'+esc(d.duration||"")+'" placeholder="'+(liveOn()?'live':'')+'"></label>'+
    '<label class="f">Session effort 0–10<input type="number" min="0" max="10" inputmode="numeric" id="f-rpe" value="'+esc(d.rpe==null?"":d.rpe)+'" placeholder="after"></label>'+
    '<label class="f">Bodyweight (lb)<input type="number" inputmode="decimal" id="f-bw" value="'+esc(d.bw)+'" placeholder="'+esc(bwAt(d.date))+'"></label>'+
    '<label class="f">Readiness<select id="f-rd">'+["g","y","r"].map(v=>'<option value="'+v+'"'+(worstReady(d)===v?' selected':'')+'>'+({g:"All good",y:"Something so-so",r:"Something red"})[v]+'</option>').join("")+'</select></label></div></div>';

  // fingers
  h += '<div class="panel"><div class="spread"><h2>Max hangs</h2><label class="check"><input type="checkbox" id="f-fdone"'+(d.fingers.done?' checked':'')+'> Did hangs</label></div>';
  if (!d.fingers.done) h += '<p class="hint" style="margin:0">'+(d.fingers.plan ? 'Planned today: '+(num(d.fingers.added)>=0?'+':'')+(num(d.fingers.added)||0)+' lb on '+(d.fingers.edge||20)+' mm, '+(d.fingers.hangs||5)+' × '+(d.fingers.secs||10)+' s. ' : '')+'Tick when you\'ve done them; nothing counts until then.</p>';
  if (d.fingers.done){
    h +='<div class="grid4"><label class="f">Edge (mm)<input type="number" id="f-edge" value="'+esc(d.fingers.edge)+'"></label>'+
      '<label class="f">Added (lb, − = assist)<input type="number" step="0.5" inputmode="decimal" id="f-add" value="'+esc(d.fingers.added)+'"></label>'+
      '<label class="f">Hold (s)<input type="number" id="f-secs" value="'+esc(d.fingers.secs)+'"></label>'+
      '<label class="f">Hangs<input type="number" id="f-hangs" value="'+esc(d.fingers.hangs)+'"></label></div>'+
      '<div class="spread"><label class="check"><input type="checkbox" id="f-fclean"'+(d.fingers.clean?' checked':'')+'> Every hang held the full time</label><span class="hint" id="f-ratio">'+ratioText(d)+'</span></div>'+
      '<div class="row"><label class="check"><input type="checkbox" id="f-flight"'+(d.fingers.light?' checked':'')+'> Light session (B, ~80%)</label><label class="check"><input type="checkbox" id="f-ftest"'+(d.fingers.test?' checked':'')+'> This was a 10 s max test</label></div>'+
      '<div class="row"><button class="btn small primary" data-act="hangtimer">Start hang timer</button><span class="hint" id="hang-status">'+esc(hangStatus(d))+'</span></div>';
  }
  h += '</div>';

  // lifts: one card per exercise, one line per set
  if (d.lifts.length || ["bench","dead","squat","ohp","other"].includes(d.type)){
    const live = liveOn(); let nextFound = false;
    h += '<div class="panel" id="liftpanel"><div class="spread"><h2>Lifts</h2><button class="btn small" data-act="undo"'+(UNDO.length?'':' disabled')+' title="Undo the last change">↶ Undo</button></div>'+
      '<p class="hint">Mark each set: <b>✓</b> clean, <b>≈</b> done but ground out, <b>✗</b> missed. Tap a mark again to clear it. Only clean sets that reach their target reps count toward your working max, PRs and progression. Fix any number at any time, here or later from History.</p>';
    d.lifts.forEach((l,i)=>{
      ensureSL(l); deriveRow(l); const plan = planFor(l, d); stampPlan(l, plan); const key = MAIN[l.lift] || (l.lift==="RDL"||l.lift==="Tempo deadlift" ? "dead" : (l.lift==="Legs-up bench"||l.lift==="Tempo bench" ? "bench" : null));
      const nxt = l.sl.findIndex(x=>!x.st), shown = nxt >= 0 ? l.sl[nxt] : l.sl.reduce((m,x)=>r1(x.w)>r1(m.w)?x:m, l.sl[0] || {w:0});
      const offPlan = plan && l.sl.some(x=>!x.st) && (l.sl.length!==plan.sets || l.sl.some(x=>!x.st && (r1(x.w)!==plan.w || r1(x.tgt)!==plan.reps)));
      h += '<div class="lcard liftrow" data-i="'+i+'" style="--tc:'+(key ? TYPES[key].c : 'var(--t-other)')+'">'+
        '<div class="lhead"><label class="f">Lift<select data-k="lift">'+(LIFTS.includes(l.lift) ? LIFTS : LIFTS.slice(0,-1).concat([l.lift, "Other"])).map(x=>'<option'+(x===l.lift?' selected':'')+'>'+x+'</option>').join("")+'</select></label>'+
        '<label class="f">Role<select data-k="role">'+[["top","Top"],["backoff","Back-off"],["acc","Accessory"]].map(([v,t])=>'<option value="'+v+'"'+(l.role===v?' selected':'')+'>'+t+'</option>').join("")+'</select></label>'+
        '<button class="btn small" data-act="rmrow" data-i="'+i+'" aria-label="Remove '+esc(l.lift)+'" title="Remove this lift">✕</button></div>'+
        (plan ? '<div class="lplan">Plan <b>'+(wLabel(l.lift,plan.w)||plan.w)+' × '+plan.reps+(plan.sets>1?' × '+plan.sets:'')+'</b><span>'+esc(plan.why)+'</span>'+(offPlan?'<button class="btn small" data-act="useplan" data-i="'+i+'">Use plan</button>':'')+'</div>' : '')+
        (SIM_LIFTS[l.lift] ? '<div class="lcue" data-cue="'+esc(l.lift)+'">'+(simCueHTML(l.lift) || '')+'</div>' : '')+easeHTML(l, plan)+
        '<div class="sets">'+l.sl.map((x,j)=>{ const isNext = live && !nextFound && !x.st; if (isNext) nextFound = true; const short = x.st==="ok" && !setClean(x);
          return '<div class="setrow'+(isNext?' next':'')+(short?' short':'')+'" data-s="'+j+'" data-st="'+(x.st||'')+'"><span class="sn">'+(j+1)+'</span>'+
            '<input type="number" inputmode="decimal" step="any" data-sk="w" value="'+esc(x.w||'')+'" aria-label="Set '+(j+1)+' weight" placeholder="'+(wLabel(l.lift,0)?'+lb':'lb')+'"><span class="x">×</span>'+
            '<input type="number" inputmode="numeric" data-sk="reps" value="'+esc(x.reps||'')+'" aria-label="Set '+(j+1)+' reps" placeholder="reps">'+
            '<span class="tgt">'+(x.tgt ? (short ? 'short of '+x.tgt : 'target '+x.tgt) : '')+(x.t && live ? ' · '+esc(clock(x.t)) : '')+'</span>'+
            '<span class="seg" role="group" aria-label="Set '+(j+1)+' result">'+[["ok","✓","Clean"],["grind","≈","Done, ground out"],["miss","✗","Missed"]].map(([v,c,t])=>'<button data-act="sst" data-i="'+i+'" data-s="'+j+'" data-v="'+v+'" aria-pressed="'+(x.st===v)+'" title="'+t+'">'+c+'</button>').join("")+'</span>'+
            '<button class="rm" data-act="rmset" data-i="'+i+'" data-s="'+j+'" aria-label="Delete set '+(j+1)+'" title="Delete set">✕</button></div>'+(x.vid ? '<div class="svid">'+vidLine(x.vid)+'</div>' : ''); }).join("")+'</div>'+
        missHTML(l)+
        '<div class="lfoot"><button class="btn small" data-act="addset" data-i="'+i+'">+ Set</button>'+(l.sl.some(x=>!x.st) ? '<button class="btn small" data-act="alldone" data-i="'+i+'">Mark the rest ✓</button>' : '')+
          (SIM_LIFTS[l.lift] ? '<button class="btn small" data-act="film" data-i="'+i+'">Film a set</button>' : '')+
          '<span class="lsum '+sumCls(l)+'" id="lsum-'+i+'">'+esc(rowSum(l))+'</span></div>'+
        '<div class="pct">'+esc(pctText(Object.assign({}, l, {w:r1(shown.w), reps:r1(shown.reps)})))+'</div><div class="plates-w">'+plateHTML(l.lift, r1(shown.w), true)+'</div>'+
      '</div>';
    });
    h += '<div class="row" style="margin-top:10px"><button class="btn small" data-act="addrow">Add lift</button></div></div>';
  }

  // climbing
  h += '<div class="panel"><div class="spread"><h2>Climbing</h2><label class="check"><input type="checkbox" id="f-con"'+(d.climb.on?' checked':'')+'> Climbed</label></div>';
  if (d.climb.on && d.type==="limit"){
    h += limitPanel(d);
  } else if (d.climb.on){
    const gsel = (id,v) => '<select id="'+id+'">'+GRADES.map(g=>'<option value="'+g+'"'+(g===v?' selected':'')+'>'+(g||"—")+'</option>').join("")+'</select>';
    h += '<div class="grid4"><label class="f">Hardest send'+gsel("f-send",d.climb.send)+'</label><label class="f">Tries to send it<input type="number" id="f-att" value="'+esc(d.climb.attempts)+'"></label>'+
      '<label class="f">Hardest tried'+gsel("f-tried",d.climb.tried)+'</label><label class="f">Problems worked<input type="number" id="f-probs" value="'+esc(d.climb.problems)+'"></label></div>';
  }
  h += '</div>';

  // wrist block
  const wb = d.wb, nw = nextWrist();
  h += '<div class="panel"><div class="spread"><h2>Wrist block</h2><label class="check"><input type="checkbox" id="f-wbdone"'+(wb.done?' checked':'')+'> Did wrist block</label></div>';
  if (!wb.done && wb.plan) h += '<p class="hint" style="margin:0">Planned today: phase '+(wb.phase||1)+', extension '+wb.ext.w+' lb and flexion '+wb.flex.w+' lb, '+wb.ext.sets+'×'+wb.ext.reps+'. Tick when done.</p>';
  if (wb.done){
    const ph = wb.phase||1, P = WRIST_PHASES[ph], top = ph===1 ? "3×8–12" : "4×6–10";
    h += '<label class="f">Phase<select id="f-wbphase">'+[1,2,3].map(k=>'<option value="'+k+'"'+(k===ph?' selected':'')+'>'+k+' · '+WRIST_PHASES[k].name+'</option>').join("")+'</select></label>'+
      '<p class="hint"><b>Phase '+ph+':</b> '+esc(P.items)+'</p>'+
      '<p class="hint">'+esc(nw.why)+(nw.advance?' <b>Ready for phase '+nw.advance+'.</b>':'')+(nw.painFlag?' <span style="color:var(--warn)">'+esc(nw.painFlag)+'</span>':'')+'</p>'+
      '<div class="grid3"><label class="f">Extension lb<input type="number" step="0.5" inputmode="decimal" id="f-ew" value="'+esc(wb.ext.w)+'"></label><label class="f">Reps<input type="number" id="f-er" value="'+esc(wb.ext.reps)+'"></label><label class="f">Sets ('+top+')<input type="number" id="f-es" value="'+esc(wb.ext.sets)+'"></label></div>'+
      '<div class="grid3"><label class="f">Flexion lb<input type="number" step="0.5" inputmode="decimal" id="f-fw" value="'+esc(wb.flex.w)+'"></label><label class="f">Reps<input type="number" id="f-fr" value="'+esc(wb.flex.reps)+'"></label><label class="f">Sets<input type="number" id="f-fs" value="'+esc(wb.flex.sets)+'"></label></div>'+
      '<div class="row"><label class="check"><input type="checkbox" id="f-iso"'+(wb.iso?' checked':'')+'> Iso pulses 30×2 s</label><label class="check"><input type="checkbox" id="f-dev"'+(wb.dev?' checked':'')+'> Deviation</label><label class="check"><input type="checkbox" id="f-rocks"'+(wb.rocks?' checked':'')+'> Wrist rocks</label></div>'+
      (ph>=2?'<label class="f">Longest planche lean / weight-shift hold (s)<input type="number" id="f-leans" value="'+esc(wb.leans)+'"></label>':'')+
      '<div class="row"><button class="btn small" data-act="wset" data-k="ext">+ Extension set</button><button class="btn small" data-act="wset" data-k="flex">+ Flexion set</button><button class="btn small primary" data-act="isotimer">Iso pulse timer</button></div>';
  }
  h += '</div>';
  // handstands
  const hs = d.hs, nh = nextHand();
  h += '<div class="panel"><div class="spread"><h2>Handstands</h2><label class="check"><input type="checkbox" id="f-hsdone"'+(hs.done?' checked':'')+'> Practised</label></div>';
  if (!hs.done && hs.plan) h += '<p class="hint" style="margin:0">Planned today: level '+(hs.level||1)+', '+esc(HS_LEVELS[hs.level||1].name.toLowerCase())+'. Tick when done.</p>';
  if (hs.done){
    const L = hs.level||1;
    h += '<label class="f">Level<select id="f-hslevel">'+Object.keys(HS_LEVELS).map(k=>'<option value="'+k+'"'+(+k===L?' selected':'')+'>'+k+' · '+HS_LEVELS[k].name+'</option>').join("")+'</select></label>'+
      '<p class="hint"><b>Do:</b> '+esc(HS_LEVELS[L].rx)+'. <b>Move up at:</b> '+esc(HS_LEVELS[L].crit)+'. '+esc(nh.why)+'</p>'+
      '<div class="grid3"><label class="f">Best hold (s)<input type="number" id="f-hsb" value="'+esc(hs.best)+'"></label><label class="f">Total on hands (s)<input type="number" id="f-hst" value="'+esc(hs.time)+'"></label><label class="f">Attempts<input type="number" id="f-hsa" value="'+esc(hs.tries)+'"></label></div>'+
      '<div class="row"><button class="btn small primary" data-act="hshold">Start hold stopwatch</button><span class="hint" id="hs-holds">'+esc(holdsText(hs))+'</span></div>';
  }
  h += '</div>';
  if (wb.done || hs.done){
    h += '<div class="panel"><h2>Wrist pain</h2><label class="f">Worst wrist pain today, 0–10 (0 = none)<input type="number" min="0" max="10" inputmode="numeric" id="f-wpain" value="'+esc(d.wristPain)+'"></label><p class="hint">Up to 3–5 that settles by the next morning is acceptable. Above 5, or sore the next day, and the app cuts load next time.</p></div>';
  }
  h += '<div class="panel"><h2>Notes</h2><label class="f">Notes<textarea id="f-notes" placeholder="How it felt, form cues, what to change">'+esc(d.notes)+'</textarea></label></div>';
  if (S.saveCheck && S.saveCheck!=="ok") h += '<div class="savecheck" id="savecheck"><b>'+S.saveCheck+' set'+(S.saveCheck===1?' isn\'t':'s aren\'t')+' marked yet.</b><span class="hint">Unmarked sets don\'t count. Mark them clean if you did them as written, or leave them out.</span><div class="row"><button class="btn primary small" data-act="savecheck" data-m="done">Mark them clean and save</button><button class="btn small" data-act="savecheck" data-m="drop">Save without them</button><button class="btn small" data-act="savecheck" data-m="back">Keep editing</button></div></div>';
  h += '<div class="row"><button class="btn primary" data-act="save">'+(editing?'Save changes':'Save session')+'</button><button class="btn" data-act="reset">Start over</button></div>';
  return h;
}
export function worstReady(d){ const v = Object.values(d.readiness||{}); return v.includes("r")?"r":(v.includes("y")?"y":"g"); }
