import { S, isFinger, liftName } from "../core/state.js";
import { addDays, epley, esc, fmtDate } from "../core/util.js";
import { COVERAGE, GOAL_NAME, GOAL_TIER, GOAL_TIERS, PDAY, PLANS } from "../data/plans.js";
import { TYPES } from "../data/types.js";
import { limitTargets } from "../logic/climb.js";
import { curPlan, planLifts, planStart } from "../logic/plan.js";
import { topRows } from "../logic/sets.js";
import { e1Series, planStatus } from "../logic/status.js";
import { floorCheck } from "../logic/week.js";
import { typeTag } from "../ui/render.js";

/* ----- plan (read-only) ----- */
export function goalTag(g){ const pri = GOAL_TIER[g]==="Primary"; return '<span class="gtag'+(pri?' trial':GOAL_TIER[g]==="Secondary"?' mech':'')+'">'+esc(GOAL_NAME[g]||g)+'</span>'; }
export function vPlan(){
  const P = curPlan(), ps = planStatus(), wk = ps.week, cap = P.weeks.cap, start = planStart();
  const left = Math.max(0, cap - wk), endD = addDays(start, cap*7 - 1);
  let h = '<div class="panel"><div class="spread"><h2>Current plan</h2><span class="hint">read-only</span></div><p class="big">'+esc(P.name)+'</p><p class="hint">'+esc(P.summary)+'</p>'+
    '<div class="meters"><div class="meter"><span class="lab">Week</span><span class="val">'+wk+' <small>of '+P.weeks.min+'–'+cap+'</small></span><div class="bar"><i style="width:'+Math.min(100, wk/cap*100)+'%"></i></div></div>'+
    '<div class="meter"><span class="lab">Weeks left</span><span class="val">'+left+' <small>to the '+cap+'-week cap</small></span><div class="bar"><i style="width:'+Math.min(100, left/cap*100)+'%"></i></div></div></div>'+
    '<p class="hint">Started '+esc(fmtDate(start))+' · the cap is '+esc(fmtDate(endD))+'. Tendon change needs about 12+ weeks of heavy loading, which is why the plan runs '+P.weeks.min+'–'+cap+' weeks.</p></div>';
  // emphasis and targets
  h += '<div class="panel"><h2>Emphasis and targets</h2><div class="targets">';
  planLifts().forEach((k,i)=>{ const L = P.lifts[k], g = L.target, ge = epley(g.w, g.r), ser = e1Series(liftName(k)), cur = ser.length ? ser[ser.length-1].y : null;
    const best = topRows(liftName(k)).filter(t=>t.clean && t.date>=start).reduce((m,t)=>!m || t.w>m.w ? t : m, null);
    h += '<div class="tg" style="--tc:'+TYPES[k].c+'"><div class="k">'+esc(GOAL_NAME[k])+' · target</div><div class="v">'+g.w+' × '+g.r+'</div>'+
      '<div class="s">≈ '+Math.round(ge)+' e1RM · latest e1RM '+(cur==null?'—':cur)+(cur!=null?' ('+Math.round(cur/ge*100)+'%)':'')+'</div>'+
      '<div class="bar" style="margin:4px 0"><i style="width:'+(cur==null?0:Math.min(100, cur/ge*100))+'%;background:'+TYPES[k].c+'"></i></div>'+
      '<div class="s">Hit cleanly '+ps.hits[i]+' of 2 times'+(best ? ' · best clean top set this plan '+best.w+'×'+best.reps : ' · no top set yet this plan')+'</div>'+
      (L.longTerm ? '<div class="s">Long-term '+L.longTerm.w+'×'+L.longTerm.r+'</div>' : '')+'</div>'; });
  const since = S.sessions.filter(s=>s.date>=start), wks = Math.max(1, wk);
  const hangN = since.filter(isFinger).length, wrN = since.filter(s=>s.wrist || (s.wb && s.wb.done)).length;
  h += '<div class="tg" style="--tc:var(--t-light)"><div class="k">Tendon capacity · no single number</div><div class="v">'+hangN+' hangs · '+wrN+' wrist</div><div class="s">Sessions this plan, against 2 + 2 a week ('+(2*wks)+' each by now). Heavy, consistent loading over 12+ weeks is what remodels tendon.</div></div>';
  const lt = limitTargets();
  h += '<div class="tg" style="--tc:var(--t-limit)"><div class="k">'+esc(GOAL_NAME.boulder)+' · always on</div><div class="v">'+(lt.project ? 'Solid '+lt.grade : 'Limit '+lt.zoneTxt)+'</div><div class="s">Limit work at solid +'+P.limitZone[0]+' to +'+P.limitZone[1]+(lt.project ? ' ('+lt.zoneTxt+')' : '')+', once a week, with hangs A first.</div></div>';
  h += '</div></div>';
  // end conditions
  const E = P.end;
  h += '<div class="panel"><h2>Ends when</h2><div class="gates">'+
    '<div class="gate"><span class="name">Both targets hit cleanly '+E.hits+' times</span><span class="since">'+planLifts().map((k,i)=>TYPES[k].short+' '+ps.hits[i]+'/'+E.hits).join(' · ')+'</span>'+(ps.hits.every(n=>n>=E.hits)?'<span class="pill ready">Met</span>':'<span class="pill wait">Not yet</span>')+'</div>'+
    '<div class="gate"><span class="name">A stall (3 unclean top sets in a row)</span><span class="since">'+(ps.stalls.length ? ps.stalls.map(k=>TYPES[k].short).join(', ') : 'none')+'</span>'+(ps.stalls.length?'<span class="pill block">Stalled</span>':'<span class="pill wait">No</span>')+'</div>'+
    '<div class="gate"><span class="name">'+E.weeks+' weeks</span><span class="since">week '+wk+'</span>'+(wk>E.weeks?'<span class="pill ready">Reached</span>':'<span class="pill wait">'+left+' left</span>')+'</div></div>'+
    '<p class="hint">The app only tells you; it never ends a plan by itself.</p></div>';
  // template week
  const n = [3,4,5].includes(+S.profile.planDays) ? +S.profile.planDays : 4;
  const dayHTML = ids => ids.map((id,k)=>{ const d = PDAY[id]; return '<div class="surow"><div class="spread"><b>Day '+(k+1)+' · '+esc(d.name)+'</b>'+typeTag(d.type)+'</div>'+
    d.items.map(it=>'<div class="hint" style="display:flex;flex-wrap:wrap;gap:4px 8px;align-items:center"><span style="color:var(--ink)">'+esc(it.what)+'</span><span>'+it.goals.map(goalTag).join('')+'</span></div>').join('')+(d.optional?'<p class="hint">Optional.</p>':'')+'</div>'; }).join('');
  h += '<div class="panel"><div class="spread"><h2>Template week · '+n+' days</h2><span class="hint">change in Setup</span></div>'+dayHTML(P.days[n] || P.days[4])+
    '<p class="hint">Which goal each part serves: '+goalTag("bench")+' primary · '+goalTag("hand")+' secondary · '+goalTag("cardio")+' tertiary. Today suggests the next day that is ready; the order within a week is flexible.</p>'+
    [3,4,5].filter(x=>x!==n && P.days[x]).map(x=>'<details class="mxd"><summary>'+x+'-day layout</summary>'+dayHTML(P.days[x])+'</details>').join('')+'</div>';
  // rules
  h += '<div class="panel"><h2>Rules of this plan</h2><ul class="hint" style="margin:0;padding-left:18px">'+P.rules.map(r=>'<li>'+esc(r)+'</li>').join('')+'</ul></div>';
  // goal tiers
  const role = g => P.emphasis.includes(g) ? 'Emphasis' : P.alwaysOn.includes(g) ? 'Always on' : P.secondary.includes(g) ? 'In this plan' : COVERAGE.includes(g) ? 'Next plan (coverage rule)' : 'Not in this plan';
  h += '<div class="panel"><h2>Your goals</h2>'+GOAL_TIERS.map(t=>'<div class="surow"><b>'+t.tier+'</b>'+(t.note?'<span class="hint">'+esc(t.note)+'</span>':'')+'<div class="gates">'+t.goals.map(g=>'<div class="gate"><span class="name">'+esc(g.name)+(g.note?'<br><span class="hint">'+esc(g.note)+'</span>':'')+'</span><span class="since"></span><span class="pill '+(/Emphasis|Always|In this/.test(role(g.id))?'ready':'wait')+'">'+role(g.id)+'</span></div>').join('')+'</div></div>').join('')+
    '<p class="hint">Coverage rule: when a plan ends, any secondary goal it left out is recommended for the next one, in tier order. A recommendation only.</p></div>';
  // floor
  const FC = floorCheck();
  h += '<div class="panel"><h2>The floor · every plan</h2><div class="gates">'+FC.map(f=>'<div class="gate"><span class="name">'+esc(f.label)+'</span><span class="since">≥'+f.min+' a week · '+f.v+' this week</span>'+(f.left?'<span class="pill wait">'+f.left+' to go</span>':'<span class="pill ready">Met</span>')+'</div>').join('')+
    '</div><p class="hint">Nothing else is mandatory. The floor reminds on Today and never blocks anything.</p></div>';
  // saved plans
  h += '<div class="panel"><h2>Saved plans</h2><div class="gates">'+Object.keys(PLANS).map(id=>{ const X = PLANS[id];
    return '<div class="gate"><span class="name">'+esc(X.name)+'<br><span class="hint">'+esc(X.summary)+'</span></span><span class="since"></span>'+(X===P?'<span class="pill ready">Current</span>':'<span class="pill wait">Example · inactive</span>')+'</div>'; }).join('')+'</div>'+
    '<p class="hint">Creating, copying and editing plans comes with the plan editor later; the plans are already stored as data for it.</p></div>';
  return h;
}
