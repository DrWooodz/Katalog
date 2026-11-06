/* Today tab. */
import { GAPS } from "../data/rules.js";
import { S, adaptive, daysAgo, deloadOn, liftName } from "../core/state.js";
import { esc, fmtDate, today } from "../core/util.js";
import { COVERAGE, GOAL_NAME, HS_LEVELS, PDAY, WRIST_PHASES } from "../data/plans.js";
import { ACC_PLAN, PULL, TYPES } from "../data/types.js";
import { fingerInfo, limitTargets } from "../logic/climb.js";
import { pullPlan } from "../logic/draft.js";
import { barWeight, curPlan, planDayList, planLifts, planWeek } from "../logic/plan.js";
import { nextAccInfo, nextBackoff, nextTop, stalled, workMax } from "../logic/progression.js";
import { wLabel } from "../logic/sets.js";
import { bwSeries, fatigue, planStatus } from "../logic/status.js";
import { floorCheck, gates, suggestion, week } from "../logic/week.js";
import { nextHand, nextWrist } from "../logic/wrist.js";
import { liveOn } from "../ui/live.js";
import { beltText, loadPlates, plateChips, plateHTML } from "../ui/plates.js";
import { skinText } from "../ui/skins.js";

export function vToday(){
  const sg = suggestion(), T = TYPES[sg.type];
  const G = gates(), W = week(), fi = fingerInfo(), p = S.profile;
  const rd = [["fingers","Fingers / elbows"],["back","Back / legs"],["press","Pressing / shoulders"]];
  const stateWord = {g:"good", y:"so-so", r:"red"};
  let h = '';
  if (liveOn()){ h += '<div class="panel livepanel"><div class="spread"><h2>Live session running</h2><button class="btn primary small" data-act="openlog">Open log</button></div><p class="hint">'+esc((TYPES[S.draft.type]||TYPES.other).label)+' · started '+esc(new Date(S.draft.live.start).toLocaleTimeString([], {hour:"numeric", minute:"2-digit"}))+' · '+S.draft.live.events.length+' events</p></div>'; }
  const fz = fatigue(), ps = planStatus(), P = curPlan();
  if (deloadOn()){
    h += '<div class="panel" style="border-color:var(--warn)"><div class="spread"><h2>Deload week · until '+esc(fmtDate(p.deloadUntil))+'</h2><button class="btn small" data-act="enddeload">End early</button></div><p class="hint">Top sets at ~85%, one back-off, light hangs only, about 60% of your usual limit attempts. Keep the intensity, drop the volume, and come back fresh.</p></div>';
  } else if (fz.recommend){
    h += '<div class="panel" style="border-color:var(--warn)"><h2>Fatigue check: consider a deload</h2><ul class="hint" style="margin:0;padding-left:18px">'+fz.signals.map(x=>'<li>'+esc(x)+'</li>').join("")+'</ul><div class="row"><button class="btn primary small" data-act="startdeload">Start a deload week</button></div></div>';
  }
  if (ps.done && !deloadOn()){
    const cov = COVERAGE.filter(g=>!P.secondary.includes(g) && !P.emphasis.includes(g));
    h += '<div class="panel" style="border-color:var(--ok)"><h2>'+esc(P.name)+': end condition reached</h2><p class="hint">'+esc(ps.why)+'. Time to plan the next one; the usual move is a deload week first.'+(cov.length ? ' The coverage rule recommends bringing in '+cov.map(g=>GOAL_NAME[g]).join(', then ')+'.' : '')+' Nothing changes until you decide.</p><div class="row"><button class="btn small" data-act="openplan">See the plan</button>'+(fz.recommend ? '' : '<button class="btn small" data-act="startdeload">Start a deload week</button>')+'</div></div>';
  }
  const bws = bwSeries(), lastBw = bws.length ? bws[bws.length-1] : null;
  if (!lastBw || daysAgo(lastBw.x) >= 7){
    h += '<div class="panel"><h2>Weekly weigh-in</h2><p class="hint">Hang loads and strength-to-weight ratios use your bodyweight. Last: '+(lastBw?lastBw.y+' lb on '+esc(fmtDate(lastBw.x)):'never logged')+'.</p><div class="row"><input type="number" inputmode="decimal" id="q-bw" placeholder="'+esc(p.bw)+'" style="max-width:140px" aria-label="Bodyweight in pounds"><button class="btn small" data-act="savebw">Save weight</button></div></div>';
  }
  h += '<div class="panel"><div class="spread"><h2>'+esc(fmtDate(today()))+' · after warmup</h2></div>'+
    '<p class="hint">Tap each region to cycle good → so-so → red. Red blocks heavy work there.</p><div class="chips">'+
    rd.map(([k,l])=>'<button class="chip" data-act="ready" data-k="'+k+'" data-s="'+S.ready[k]+'"><span class="dot"></span>'+l+': '+stateWord[S.ready[k]]+'</button>').join("")+'</div></div>';
  const sp = sg.day && PDAY[sg.day];
  h += '<div class="panel" style="border-color:'+T.c+'"><div class="spread"><h2>'+esc(skinText("next"))+'</h2><span class="hint">'+esc(P.name)+' · week '+planWeek()+'</span></div><p class="big">'+esc(sp ? sp.name : (sg.done ? "Plan days done" : "Rest or easy"))+'</p>'+
    '<p class="hint">'+sg.reasons.map(esc).join(" · ")+'</p><div class="row"><button class="btn primary" data-act="start" data-type="'+sg.type+'" data-day="'+(sg.day||'')+'" data-f="'+(sg.fingers?1:0)+'">Log this session</button>'+
    '<button class="btn" data-tab-go="log">Pick another</button></div></div>';
  const FC = floorCheck(), miss = FC.filter(f=>f.left);
  h += '<div class="panel"><div class="spread"><h2>Floor this week</h2><span class="hint">'+(miss.length ? miss.length+' still to do' : 'all met')+'</span></div><div class="gates">'+FC.map(f=>
    '<div class="gate"><span class="name">'+esc(f.label)+'</span><span class="since">'+f.v+' of '+f.min+'</span>'+(f.left ? '<span class="pill wait">'+f.left+' to go</span>' : '<span class="pill ready">Met</span>')+'</div>').join("")+
    '</div><p class="hint">Mon–Sun. The one thing that stays on in every plan. '+(miss.length ? 'Still missing: '+miss.map(f=>f.left+'× '+f.label.toLowerCase()).join(', ')+'. ' : '')+'A reminder only: it never blocks anything.</p></div>';
  h += '<div class="panel"><h2>Ready check</h2><div class="gates">'+G.map(g=>{
    const since = g.since==null ? (g.min ? "not logged yet" : "") : (g.since===0 ? "today" : g.since+"d ago");
    const pill = g.done ? '<span class="pill wait">Done this week</span>' : g.blocked ? '<span class="pill block">Blocked</span>' : (g.ready ? '<span class="pill ready">'+(g.optional ? 'Optional' : 'Ready')+'</span>' : '<span class="pill wait">Wait '+g.wait+'d</span>');
    return '<div class="gate"><span class="name">'+esc(g.name)+'</span><span class="since">'+since+'</span>'+pill+'</div>';
  }).join("")+'</div><p class="hint">'+esc(P.name)+' days this week. Gaps: bench '+GAPS.bench+'d, deadlift '+GAPS.dead+'d, finger days (hangs or limit) '+GAPS.finger+'d apart; hangs A ride on the limit day.</p></div>';
  h += '<div class="panel"><div class="spread"><h2>Next targets</h2><span class="hint">'+(adaptive()?'Adaptive · from your logs':'Max-based · fixed % of saved maxes')+'</span></div><div class="targets">';
  const keys = planLifts().concat(P.maint);
  keys.forEach(k=>{
    const n = nextTop(k), bo = nextBackoff(k), wm = workMax(k);
    const c = TYPES[k].c, tag = n.phase==="reentry" ? ' · re-entry' : n.phase==="maint" ? ' · maintenance' : n.phase==="deload" ? ' · deload' : n.phase==="test" ? ' · test day' : ' top set';
    const boPl = bo.sets && bo.w >= barWeight() ? loadPlates(bo.w, barWeight()) : null;
    h += '<div class="tg" style="--tc:'+c+'"><div class="k">'+TYPES[k].short+tag+'</div><div class="v">'+n.w+' × '+n.reps+(n.sets>1?' × '+n.sets:'')+'</div><div class="s">'+esc(n.why)+'</div>'+plateHTML(liftName(k), n.w, true)+(bo.sets?'<div class="s">Back-off '+bo.sets+'× at '+bo.w+' · '+esc(bo.why)+(boPl && boPl.side.length ? ' · each side '+plateChips(boPl.side) : '')+'</div>':'')+
      (adaptive()?'<div class="s">Working max '+wm.v+' · '+esc(wm.src)+'</div>':'')+(P.lifts[k]?'<div class="s">Target '+P.lifts[k].target.w+'×'+P.lifts[k].target.r+(P.lifts[k].longTerm?' · long-term '+P.lifts[k].longTerm.w+'×'+P.lifts[k].longTerm.r:'')+'</div>':'')+(stalled(k)?'<div class="s" style="color:var(--warn)">3 unclean top sets in a row: a stall</div>':'')+'</div>';
  });
  const accs = []; planDayList().forEach(d=>d.rows.forEach(r=>{ if (r[1]==="acc" && !accs.includes(r[0])) accs.push(r[0]); }));
  accs.forEach(nm=>{
    if (PULL[nm]){ const n = pullPlan(nm), wl = wLabel(nm, n.w);
      h += '<div class="tg" style="--tc:var(--t-other)"><div class="k">'+esc(nm)+'</div><div class="v">'+(wl||n.w)+' × '+n.reps+' × '+n.sets+'</div><div class="s">'+esc(n.why)+'</div>'+(nm==="Bent-over row" ? plateHTML(nm, n.w, true) : '')+'</div>'; }
    else if (ACC_PLAN[nm]){ const A = ACC_PLAN[nm], a = nextAccInfo(nm, A[0], A[1], A[2], A[3], A[4]);
      h += '<div class="tg" style="--tc:'+TYPES[A[0]].c+'"><div class="k">'+esc(nm)+' · accessory</div><div class="v">'+a.w+' × '+a.reps+' × '+(deloadOn()?2:3)+'</div><div class="s">'+esc(a.why)+'</div>'+plateHTML(nm, a.w, true)+'</div>'; }
  });
  const lt = limitTargets();
  h += '<div class="tg" style="--tc:var(--t-limit)"><div class="k">Limit bouldering</div><div class="v">'+lt.lo+'–'+lt.hi+' attempts</div><div class="s">'+esc(lt.why)+(lt.project?' · solid at '+lt.grade+', limit work at '+lt.zoneTxt:'')+'</div>'+(lt.warn?'<div class="s" style="color:var(--warn)">'+esc(lt.warn)+'</div>':'')+'</div>';
  h += '<div class="tg" style="--tc:var(--t-light)"><div class="k">Max hangs A · '+(p.edge||20)+'mm · 10 s</div><div class="v">'+(fi.a>=0?'+':'')+fi.a+' lb × '+fi.ha+'</div><div class="s">'+esc(beltText(fi.a).replace(/^ · /,'').replace(/^./,c=>c.toUpperCase()))+'</div><div class="s">Hangs B '+(fi.b>=0?'+':'')+fi.b+' lb × '+fi.hb+' · '+esc(fi.why)+(fi.ramp?' · ramp-in: 1/week':'')+'</div>'+(fi.testDue?'<div class="s" style="color:var(--warn)">Retest your 10 s max this week</div>':'')+'</div>';
  const nw = nextWrist(), nh = nextHand();
  h += '<div class="tg" style="--tc:var(--t-ohp)"><div class="k">Wrist block · phase '+nw.phase+' '+esc(WRIST_PHASES[nw.phase].name)+'</div><div class="v">Ext '+nw.ext+' · Flex '+nw.flex+' lb</div><div class="s">'+esc(nw.why)+'</div>'+(nw.advance?'<div class="s" style="color:var(--ok)">Ready for phase '+nw.advance+'</div>':'')+(nw.painFlag?'<div class="s" style="color:var(--warn)">'+esc(nw.painFlag)+'</div>':'')+'</div>';
  h += '<div class="tg" style="--tc:var(--t-squat)"><div class="k">Handstands</div><div class="v">L'+nh.level+' '+esc(HS_LEVELS[nh.level].name)+'</div><div class="s">'+esc(HS_LEVELS[nh.level].rx)+'</div><div class="s">'+esc(nh.why)+'</div></div>';
  h += '</div></div>';
  h += '<div class="panel"><h2>Last 7 days</h2><div class="meters">'+W.map(w=>'<div class="meter"><span class="lab">'+w.lab+'</span><span class="val">'+w.v+' <small>/ '+w.t+'</small></span><div class="bar"><i style="width:'+Math.min(100,Math.round(w.v/w.max*100))+'%"></i></div></div>').join("")+'</div></div>';
  return h;
}
