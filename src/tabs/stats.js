/* Stats tab: dashboard, charts, maxes moved, limit stats. (Its body-model panels are frozen/stats-model.js.) */
import { S, daysAgo, isFinger, liftName, sorted } from "../core/state.js";
import { epley, esc, fmtDate, gradeN, num, r5, shortD } from "../core/util.js";
import { LIMIT_PLAN, MAIN, PROGRESS, STACK_ORDER, TYPES } from "../data/types.js";
import { statsModel } from "../frozen/stats-model.js";
import { allProblems, openProjects, projectMap } from "../logic/climb.js";
import { curPlan, planLifts, planStart, planTarget } from "../logic/plan.js";
import { stalled, workMax } from "../logic/progression.js";
import { workSets } from "../logic/sets.js";
import { bwAt, bwSeries, e1Series, planStatus } from "../logic/status.js";
import { handHist, nextHand, nextWrist, wristHist } from "../logic/wrist.js";
import { barChart, chart, deltaTxt, heatmap, kpi, spark, valueBefore, weekBuckets } from "../ui/charts.js";
import { typeTag } from "../ui/render.js";

export function dashKpis(){
  const p = S.profile, focus = planLifts();
  let h = '';
  focus.forEach(k=>{
    const s = e1Series(liftName(k)), g = planTarget(k), ge = Math.round(epley(g.w,g.r));
    const last = s.length ? s[s.length-1].y : null;
    h += kpi({label:TYPES[k].short+" e1RM", c:TYPES[k].c, val:last==null?'—':last, unit:last==null?'':'lb', pct:last==null?null:last/ge,
      delta:last==null?'No sets logged yet':deltaTxt(last, valueBefore(s,28), ' lb', '4 wk')+' · goal '+ge, spark:spark(s.slice(-12).map(x=>x.y), TYPES[k].c),
      tip:"Estimated 1RM from your best set each session (Epley).\nBar = progress to "+g.w+"×"+g.r+" (≈ "+ge+" e1RM)."});
  });
  const fs = sorted().filter(isFinger).reverse().filter(s=>!s.fingers.light).map(s=>{ const bw = num(s.bw)||bwAt(s.date); return {x:s.date, y:Math.round((bw+(num(s.fingers.added)||0))/bw*100)/100}; });
  const fl = fs.length ? fs[fs.length-1].y : null;
  h += kpi({label:"Hang load (heavy)", c:"var(--t-light)", val:fl==null?'—':fl.toFixed(2), unit:fl==null?'':'× BW', delta:fl==null?'No hangs logged yet':deltaTxt(fl, valueBefore(fs,42), '', '6 wk', 2), spark:spark(fs.slice(-12).map(x=>x.y), "var(--t-light)"),
    tip:"(bodyweight + added) ÷ bodyweight on your heavy hang sessions, "+(p.edge||20)+" mm edge."});
  const gs = []; sorted().slice().reverse().forEach(s=>{ const g = s.climb && s.climb.on ? gradeN(s.climb.send) : null; if (g!=null) gs.push({x:s.date, y:g}); });
  const recent = gs.filter(x=>daysAgo(x.x)<=30), best = recent.length ? Math.max.apply(null, recent.map(x=>x.y)) : null;
  h += kpi({label:"Hardest send · 30 days", c:"var(--t-limit)", val:best==null?'—':'V'+best, pct:best==null?null:best/10, delta:best==null?'No sends logged in 30 days':'Goal V10 in 2–3 tries', spark:spark(gs.slice(-12).map(x=>x.y), "var(--t-limit)"),
    tip:"Best graded send in the last 30 days. The bar is progress toward V10."});
  const wk = weekBuckets(10), counts = wk.map(w=>w.list.length), avg = counts.slice(-5,-1).reduce((a,b)=>a+b,0)/4;
  h += kpi({label:"Sessions / week", c:"var(--accent)", val:avg.toFixed(1), unit:'avg', pct:Math.min(1,avg/4.5), delta:'<b>'+counts[counts.length-1]+'</b> this week · target 4–5', spark:spark(counts, "var(--accent)"),
    tip:"Average of the last 4 full weeks. The sparkline shows 10 weeks."});
  const mins = wk.map(w=>w.list.reduce((a,s)=>a+(num(s.duration)||0),0));
  if (mins.some(x=>x>0)) h += kpi({label:"Time trained", c:"var(--t-squat)", val:Math.round(mins[mins.length-1]), unit:'min this wk', delta:'avg '+Math.round(mins.slice(-5,-1).reduce((a,b)=>a+b,0)/4)+' min over 4 wk', spark:spark(mins, "var(--t-squat)"), tip:"From live-tracked or entered session durations."});
  const ps = sorted().slice().reverse().filter(s=>s.wristPain!=="" && s.wristPain!=null).map(s=>({x:s.date, y:+s.wristPain}));
  if (ps.length){ const lp = ps[ps.length-1].y; h += kpi({label:"Wrist pain", c:lp>5?"var(--bad)":lp>2?"var(--warn)":"var(--ok)", val:lp, unit:'/ 10', delta:(lp>5?'<b>Above 5</b>: load is being cut':lp>2?'Watch it: 3–5 is OK if it settles by morning':'Calm')+' · last logged', spark:spark(ps.slice(-12).map(x=>x.y), lp>5?"var(--bad)":lp>2?"var(--warn)":"var(--ok)"), tip:"Worst wrist pain you logged on wrist or handstand days (0–10)."}); }
  return '<div class="kpis">'+h+'</div>';
}
export function weeklyStack(weeks){
  const wk = weekBuckets(weeks), used = new Set();
  const cols = wk.map(w=>{
    const segs = STACK_ORDER.map(t=>{ const v = w.list.filter(s=>(TYPES[s.type]?s.type:"other")===t).length; if (v) used.add(t); return {v, c:TYPES[t].c, tip:'Week of '+w.label+'\n'+TYPES[t].label+': '+v}; });
    return {label:w.label, segs, total:w.list.length};
  });
  const legend = STACK_ORDER.filter(t=>used.has(t)).map(t=>'<span style="--tc:'+TYPES[t].c+'"><i></i>'+esc(TYPES[t].short)+'</span>').join('');
  return (legend?'<div class="legend">'+legend+'</div>':'')+barChart(cols, {totals:true, minMax:5, aria:'Sessions per week by type, last '+weeks+' weeks'});
}
export function setsChart(k, weeks){
  const wk = weekBuckets(weeks), lift = liftName(k), wm = workMax(k).v;
  const cols = wk.map(w=>{ const v = w.list.reduce((t,s)=>t+(s.lifts||[]).filter(l=>l.lift===lift).reduce((u,l)=>u+workSets(l).filter(x=>x.w>=0.8*wm).length,0),0); return {label:w.label, total:v, segs:[{v, c:TYPES[k].c, tip:'Week of '+w.label+'\n'+v+' '+TYPES[k].short.toLowerCase()+' sets ≥ '+r5(0.8*wm)+' lb'}]}; });
  return barChart(cols, {band:[3,6], minMax:7, totals:true, h:170, aria:TYPES[k].short+' sets at 80% or more of working max per week'});
}
export function minutesChart(weeks){
  const wk = weekBuckets(weeks);
  const cols = wk.map(w=>{ const v = Math.round(w.list.reduce((a,s)=>a+(num(s.duration)||0),0)); return {label:w.label, total:v, segs:[{v, c:"var(--t-squat)", tip:'Week of '+w.label+'\n'+v+' min trained'}]}; });
  if (!cols.some(c=>c.total>0)) return '';
  return barChart(cols, {minMax:60, totals:true, h:170, aria:'Minutes trained per week'});
}
export function loadChart(weeks){
  const wk = weekBuckets(weeks);
  const cols = wk.map(w=>{ const v = Math.round(w.list.reduce((a,s)=>a+((num(s.rpe)!=null && num(s.duration)) ? num(s.rpe)*num(s.duration) : 0),0)); return {label:w.label, total:v, segs:[{v, c:"var(--accent)", tip:'Week of '+w.label+'\n'+v+' load units\n'+w.list.filter(s=>num(s.rpe)!=null).length+' rated sessions'}]}; });
  if (!cols.some(c=>c.total>0)) return '';
  return barChart(cols, {minMax:500, totals:true, h:180, aria:'Weekly training load, effort times minutes'});
}
export function vDash(){
  const focus = planLifts();
  let h = '<div class="panel"><div class="spread"><h2>Dashboard</h2><span class="hint">Tap any mark for details</span></div>'+dashKpis()+'</div>';
  h += '<div class="panel"><h2>Training calendar · 16 weeks</h2>'+heatmap(16)+'</div>';
  h += '<div class="panel"><h2>Sessions per week</h2>'+weeklyStack(10)+'</div>';
  h += '<div class="panel"><div class="spread"><h2>Heavy sets per week</h2><span class="hint">sets ≥ 80% of working max</span></div><div class="grid2" style="grid-template-columns:repeat(auto-fit,minmax(240px,1fr))">'+
    focus.map(k=>'<div style="min-width:0"><div class="legend"><span style="--tc:'+TYPES[k].c+'"><i></i>'+TYPES[k].short+'</span></div>'+setsChart(k,8)+'</div>').join('')+'</div></div>';
  const lc = loadChart(10), mc = minutesChart(10);
  if (lc) h += '<div class="panel"><div class="spread"><h2>Training load per week</h2><span class="hint">effort × minutes</span></div>'+lc+'<p class="hint">Weeks well above your recent average are where fatigue builds; weeks well below are where it clears. Only sessions with both effort and duration count.</p></div>';
  else if (mc) h += '<div class="panel"><h2>Minutes trained per week</h2>'+mc+'</div>';
  const prs = sorted().filter(s=>s.prs && s.prs.length).slice(0,8);
  h += '<div class="panel"><h2>Recent PRs</h2>'+(prs.length ? '<div class="gates">'+prs.map(s=>'<div class="gate"><span class="name">'+esc(s.prs.join(" · "))+'</span><span class="since">'+esc(shortD(s.date))+'</span>'+typeTag(s.type)+'</div>').join("")+'</div>' : '<div class="empty">PRs appear here automatically when a clean set, hang, send or hold beats your previous best.</div>')+'</div>';
  return h;
}
export function vProgress(){
  const p = S.profile, P = curPlan(), ps = planStatus();
  const focus = planLifts();
  let h = vDash()+'<div class="panel"><div class="spread"><h2>Current plan</h2><button class="btn small" data-act="openplan">Plan tab</button></div><p class="big">'+esc(P.name)+'</p>'+
    '<p class="hint">Since '+esc(fmtDate(planStart()))+' · week '+ps.week+' of '+P.weeks.min+'–'+P.weeks.cap+' · ends when both targets are hit cleanly twice, on a stall, or after '+P.weeks.cap+' weeks.</p><div class="meters">';
  focus.forEach((k,i)=>{ const g = planTarget(k), n = ps.hits[i];
    h += '<div class="meter"><span class="lab">Clean '+TYPES[k].short.toLowerCase()+' '+g.w+'×'+g.r+'</span><span class="val">'+Math.min(n,2)+' <small>/ 2 sessions</small></span><div class="bar"><i style="width:'+Math.min(100,n/2*100)+'%"></i></div></div>';
  });
  h += '</div>';
  focus.forEach(k=>{ if (stalled(k)) h += '<div class="flag">'+TYPES[k].short+': 3 top sets in a row without a clean triple. That is a stall, one of the plan\'s end conditions.</div>'; });
  h += '</div>';

  // 1RM update
  const recent = ["bench","dead","squat","ohp"].map(k=>{
    const lift = Object.keys(MAIN).find(x=>MAIN[x]===k);
    const s = e1Series(lift).filter(pt=>daysAgo(pt.x)<=42);
    const best = s.reduce((m,pt)=>Math.max(m,pt.y),0);
    return {k, best, cur:p.oneRM[k], unk:!!(p.unknown||{})[k]};
  }).filter(r=>r.best && (r.best>r.cur || r.unk));
  if (recent.length){
    h += '<div class="panel"><h2>Your maxes have moved</h2><p class="hint">Best estimated 1RM from the last 6 weeks beats your saved max. Updating recalculates every percentage.</p>'+
      recent.map(r=>'<div class="spread"><span>'+TYPES[r.k].short+': '+(r.unk ? 'unknown (tested)' : r.cur)+' → <b>'+r.best+'</b></span><button class="btn small" data-act="setorm" data-k="'+r.k+'" data-v="'+r.best+'">Use '+r.best+'</button></div>').join("")+'</div>';
  }

  const keys = focus.concat(["bench","dead","squat","ohp"].filter(k=>!focus.includes(k)));
  keys.forEach(k=>{
    const lift = Object.keys(MAIN).find(x=>MAIN[x]===k), s = e1Series(lift);
    if (!s.length && !focus.includes(k)) return;
    const g = planTarget(k), goal = Math.round(epley(g.w,g.r));
    h += '<div class="panel"><div class="spread"><h2>'+TYPES[k].short+' · estimated 1RM</h2>'+(s.length?'<span class="hint">latest '+s[s.length-1].y+'</span>':'')+'</div>'+
      chart(s,{goal, goalLabel:g.w+'×'+g.r+' ≈ '+goal, color:TYPES[k].c, aria:TYPES[k].short+' estimated one-rep max over time'})+'</div>';
  });
  h += statsModel();
  const fs = sorted().filter(isFinger).reverse().map(s=>{ const bw = num(s.bw)||bwAt(s.date); return {x:s.date, y:Math.round((bw+(num(s.fingers.added)||0))/bw*100)/100}; });
  const fsd = {}; fs.forEach(pt=>{ if(!fsd[pt.x]||pt.y>fsd[pt.x]) fsd[pt.x]=pt.y; });
  h += '<div class="panel"><div class="spread"><h2>Hang load · × bodyweight</h2><span class="hint">'+(p.edge||20)+'mm, 10 s</span></div>'+chart(Object.keys(fsd).sort().map(x=>({x,y:fsd[x]})),{color:"var(--t-light)",fmt:v=>v.toFixed(2)+'×',step:.05,aria:'Max hang load as a multiple of bodyweight over time'})+'</div>';
  h += limitStats();
  const cl = {}; S.sessions.forEach(s=>{ const g = s.climb&&s.climb.on ? gradeN(s.climb.send) : null; if (g!=null && (cl[s.date]==null||g>cl[s.date])) cl[s.date]=g; });
  h += '<div class="panel"><h2>Hardest send</h2>'+chart(Object.keys(cl).sort().map(x=>({x,y:cl[x]})),{goal:10,goalLabel:'V10',color:"var(--t-limit)",fmt:v=>'V'+Math.round(v),step:1,aria:'Hardest boulder grade sent per session over time'})+'</div>';
  const wx = wristHist().slice().reverse().filter(s=>s.wb.ext && num(s.wb.ext.w)).map(s=>({x:s.date, y:num(s.wb.ext.w)}));
  const wxd = {}; wx.forEach(pt=>{ if (!wxd[pt.x]||pt.y>wxd[pt.x]) wxd[pt.x]=pt.y; });
  h += '<div class="panel"><div class="spread"><h2>Wrist extension load</h2><span class="hint">phase '+nextWrist().phase+'</span></div>'+chart(Object.keys(wxd).sort().map(x=>({x,y:wxd[x]})),{color:"var(--t-ohp)",step:2.5,fmt:v=>Math.round(v*10)/10+' lb',aria:'Wrist extension curl load over time'})+'</div>';
  const hb = handHist().slice().reverse().filter(s=>num(s.hs.best)).map(s=>({x:s.date, y:num(s.hs.best), l:s.hs.level||1}));
  const hbd = {}; hb.forEach(pt=>{ if (!hbd[pt.x]||pt.y>hbd[pt.x]) hbd[pt.x]=pt.y; });
  h += '<div class="panel"><div class="spread"><h2>Handstand best hold</h2><span class="hint">level '+nextHand().level+'</span></div>'+chart(Object.keys(hbd).sort().map(x=>({x,y:hbd[x]})),{color:"var(--t-squat)",step:5,fmt:v=>Math.round(v)+' s',aria:'Best handstand hold per session over time'})+'<p class="hint">Holds at different levels aren\'t comparable. Expect the line to drop when you move up a level.</p></div>';
  const bws = bwSeries();
  if (bws.length) h += '<div class="panel"><h2>Bodyweight</h2>'+chart(bws,{color:"var(--t-other)",step:1,aria:'Bodyweight over time'})+'</div>';
  return h;
}
export function limitStats(){
  const PM = projectMap();
  if (!PM.length) return '<div class="panel"><h2>Limit bouldering</h2><div class="empty">Log a limit session problem by problem and this fills in: attempts-to-send by grade, open projects, and session volume.</div></div>';
  const med = a => { if (!a.length) return null; const s = a.slice().sort((x,y)=>x-y), m = Math.floor(s.length/2); return s.length%2 ? s[m] : (s[m-1]+s[m])/2; };
  let h = '<div class="panel"><div class="spread"><h2>Attempts to send, by grade</h2><span class="hint">goal: V10 in 2–3</span></div><div class="tw"><table class="pct"><thead><tr><th>Grade</th><th>Sent</th><th>Median tries</th><th>Sent in ≤3</th><th>Open</th></tr></thead><tbody>';
  for (let g=6; g<=12; g++){
    const G = "V"+g, ps = PM.filter(p=>p.grade===G);
    if (!ps.length) continue;
    const sent = ps.filter(p=>p.sent), tries = sent.map(p=>p.sentAtt||0).filter(x=>x>0), quick = tries.filter(x=>x<=3).length;
    const m = med(tries);
    h += '<tr><td>'+G+'</td><td>'+sent.length+'</td><td>'+(m==null?'—':m)+'</td><td>'+(sent.length?quick+' of '+sent.length:'—')+'</td><td>'+ps.filter(p=>!p.sent).length+'</td></tr>';
  }
  h += '</tbody></table></div><p class="hint">Named problems add up attempts across sessions until you send. A grade is "yours" when most sends there take 3 tries or fewer, which is the cue to spend more time one grade up.</p></div>';
  const open = openProjects();
  if (open.length){
    h += '<div class="panel"><h2>Open projects</h2><div class="gates">'+open.map(p=>'<div class="gate"><span class="name">'+esc(p.grade)+' · '+esc(p.name)+'</span><span class="since">'+p.att+' tries · '+p.sessions+' session'+(p.sessions>1?'s':'')+'</span><span class="pill wait">'+esc((PROGRESS.find(x=>x[0]===p.best)||["","—"])[1])+'</span></div>').join("")+'</div></div>';
  }
  const vol = S.sessions.filter(s=>s.type==="limit" && s.climb && s.climb.list && s.climb.list.length).sort((a,b)=>a.date<b.date?-1:1)
    .map(s=>({x:s.date, y:s.climb.list.reduce((t,p)=>t+(num(p.attempts)||0),0)}));
  const vd = {}; vol.forEach(v=>{ vd[v.x] = (vd[v.x]||0)+v.y; });
  const styles = {}; allProblems().forEach(p=>{ if (!p.style) return; const st = styles[p.style] || (styles[p.style] = {n:0, sent:0}); st.n++; if (p.prog==="sent") st.sent++; });
  h += '<div class="panel"><div class="spread"><h2>Hard attempts per limit session</h2><span class="hint">plan '+LIMIT_PLAN.att+'</span></div>'+chart(Object.keys(vd).sort().map(x=>({x,y:vd[x]})),{color:"var(--t-limit)",step:5,aria:"Hard attempts per limit bouldering session over time"});
  const sk = Object.keys(styles);
  if (sk.length) h += '<p class="hint">Sends by style, all grades:'+sk.sort((a,b)=>styles[b].n-styles[a].n).map(k=>esc(k.toLowerCase())+' '+styles[k].sent+'/'+styles[k].n).join(" · ")+'. A style you rarely send is a weakness to seek out.</p>';
  h += '</div>';
  return h;
}
