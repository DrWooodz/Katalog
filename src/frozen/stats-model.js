/* FROZEN. Stats panels through the body model: hard sets per muscle, strength balance, setup changes, filmed sets. */
import { S, liftName, sorted } from "../core/state.js";
import { clampN, dayNum, epley, esc, lsGet, lsSet, num, shortD, today } from "../core/util.js";
import { REFS } from "../data/refs.js";
import { MAIN, PULL, SIM_LIFTS } from "../data/types.js";
import { SIM_BRIDGE, bodyCache, simReady } from "./sim-bridge.js";
import { fmtSpeed, speedUnit } from "./sim-log.js";
import { workMax } from "../logic/progression.js";
import { cleanSets, r1, workSets } from "../logic/sets.js";
import { bwAt } from "../logic/status.js";
import { weekBuckets } from "../ui/charts.js";

/* ---------- Stats: your log read through the body model ----------
   Four panels. Hard sets per muscle and strength balance need the model (loaded on demand, results kept in memory); setup
   changes and filmed sets read only what your log already holds. Nothing here writes to your log. */
export const MX = {credit:{}, bal:{}, busy:false};
export const MX_WEEKS = 7;
export const srcLine = ids => '<p class="srcs">Sources: '+ids.map(([id, lab])=>'<a href="'+esc(REFS[id].u)+'" target="_blank" rel="noopener" title="'+esc(REFS[id].t)+'">'+esc(lab)+'</a>').join(" · ")+'</p>';
export const HS_SKIP = {"Fast pull-up":1};
export const mxBodyKey = () => bodyCache ? String(bodyCache.updated || "") + "|" + JSON.stringify(bodyCache.setups || {}) + "|" + JSON.stringify(bodyCache.goals || {}) : "none";
export const pullAdds = lift => !!(PULL[lift] && PULL[lift].mode !== "row");
/* every performed set, with its status and any filmed numbers (legacy rows: their set count at the row's weight) */
export function liftSets(l){
  if (Array.isArray(l.sl)) return l.sl.filter(x=>x.st).map(x=>({w:r1(x.w), reps:r1(x.reps), st:x.st, vid:x.vid || null}));
  return workSets(l).map(x=>({w:x.w, reps:x.reps, st:"ok", vid:null}));
}
/* your best estimated max for a lift over the 6 weeks up to a date (clean sets of 10 or fewer); main lifts fall back to the saved max */
export function e1Ref(lift, date, memo){
  const k = lift+"|"+date; if (memo && memo[k] != null) return memo[k];
  let best = 0;
  S.sessions.forEach(s=>{ if (s.date > date || dayNum(date) - dayNum(s.date) > 42) return;
    (s.lifts||[]).forEach(l=>{ if (l.lift!==lift) return; cleanSets(l).forEach(x=>{ if (x.reps > 10) return; const w = pullAdds(lift) ? x.w + bwAt(s.date) : x.w; if (w) best = Math.max(best, epley(w, x.reps)); }); }); });
  if (!best && MAIN[lift]) best = num(S.profile.oneRM[MAIN[lift]]) || 0;
  if (memo) memo[k] = best; return best;
}
/* how much of a hard set a set is: full within about 4 reps of failure, tapering to nothing at 8 or more in reserve */
export function hardFrac(lift, x, ref, date){
  if (x.st==="miss" || x.st==="grind") return 1;
  let rir = x.vid && num(x.vid.rir) != null ? num(x.vid.rir) : null;
  if (rir == null && ref > 0 && x.reps > 0){ const load = pullAdds(lift) ? x.w + bwAt(date) : x.w, rel = load/ref; if (rel > 0) rir = rel >= 1 ? 0 : Math.max(0, 30*(1/rel - 1) - x.reps); }
  if (rir == null) return x.reps > 0 ? 1 : 0;
  return rir <= 4 ? 1 : rir >= 8 ? 0 : (8 - rir)/4;
}
export function hardSetWeeks(credit){
  const B = weekBuckets(MX_WEEKS), rows = {}, by = {}, other = {}, memo = {};
  B.forEach((wk, i)=>wk.list.forEach(s=>(s.lifts||[]).forEach(l=>{
    const sets = liftSets(l); if (!sets.length) return;
    const c = credit[l.lift];
    if (!c){ if (!HS_SKIP[l.lift]) other[l.lift] = (other[l.lift]||0) + sets.length; return; }
    const ref = e1Ref(l.lift, s.date, memo);
    sets.forEach(x=>{ const f = hardFrac(l.lift, x, ref, s.date); if (!f) return;
      Object.keys(c).forEach(m=>{ (rows[m] = rows[m] || Array(MX_WEEKS).fill(0))[i] += f*c[m];
        const k = m+"|"+i; (by[k] = by[k] || {})[l.lift] = ((by[k]||{})[l.lift]||0) + f*c[m]; }); });
  })));
  return {B, rows, by, other};
}
export const fmtHS = v => v < 0.25 ? "·" : v < 9.75 ? (Math.round(v*2)/2).toString().replace(".5","½").replace(/^0½$/,"½") : String(Math.round(v));
export function setsPanel(api){
  const lifts = new Set(); weekBuckets(MX_WEEKS).forEach(w=>w.list.forEach(s=>(s.lifts||[]).forEach(l=>{ if (SIM_LIFTS[l.lift] && !HS_SKIP[l.lift]) lifts.add(l.lift); })));
  const head = '<div class="spread"><h2>Hard sets per muscle · weekly</h2><span class="hint">aim 10–20</span></div>';
  if (!lifts.size) return head+'<div class="empty">Log a lifting session and this counts your hard sets for each muscle, week by week.</div>';
  const bk = mxBodyKey(), credit = {};
  for (const lift of lifts){ const k = lift+"|"+bk;
    if (!(k in MX.credit)){ if (!api) return null; let c = null; try{ c = api.credit(bodyCache || {}, bwAt(today()), lift); }catch(e){} MX.credit[k] = c ? c.credit : null; }
    if (MX.credit[k]) credit[lift] = MX.credit[k]; }
  const {B, rows, by, other} = hardSetWeeks(credit), order = (api ? api.MGROUPS : Object.keys(rows)).filter(m=>rows[m] && rows[m].some(v=>v >= 0.25));
  const name = m => (api && api.MG_NAME[m]) || m;
  const lv = v => v < 0.25 ? 0 : v < 10 ? 1 : v <= 20 ? 2 : 3;
  const now = B.length - 1;
  let h = head+'<div class="tw"><table class="vgrid"><thead><tr><th scope="col"><span class="sr">Muscle</span></th>'+B.map((w,i)=>'<th scope="col"'+(i===now?' class="now"':'')+'>'+(i===now ? 'This<br>wk' : esc(w.label).replace(/^(\S+) /,"$1<br>"))+'</th>').join("")+'</tr></thead><tbody>';
  order.forEach(m=>{
    h += '<tr><th scope="row">'+esc(name(m))+'</th>'+rows[m].map((v,i)=>{
      const b = by[m+"|"+i] || {}, parts = Object.keys(b).sort((x,y)=>b[y]-b[x]).map(l=>l+" "+fmtHS(b[l])).join(" · ");
      const tip = name(m)+" · week of "+B[i].label+(i===now?" (so far)":"")+"\n"+(v < 0.25 ? "No hard sets" : fmtHS(v)+" hard sets"+(parts ? "\n"+parts : ""));
      return '<td class="lv'+lv(v)+(i===now?' now':'')+'" data-tip="'+esc(tip)+'">'+fmtHS(v)+'</td>'; }).join("")+'</tr>';
  });
  h += '</tbody></table></div><div class="legend vleg"><span><i class="lv1"></i>under 10</span><span><i class="lv2"></i>10–20</span><span><i class="lv3"></i>over 20</span></div>';
  const ot = Object.keys(other);
  h += '<p class="hint">Around 10–20 hard sets a week per muscle is where most growth studies land; past about 20, extra sets add little for most lifters. Tap a cell for the lifts behind it.</p>'+
    '<details class="mxd"><summary>How sets are counted</summary><p class="hint">A set counts in full when it ends within about 4 reps of failure, judged from its weight against your best for that lift over the previous 6 weeks (a filmed set uses its measured reps in reserve). Lighter sets count partly, and from 8 or more reps in reserve not at all. Missed and ground-out sets always count.</p>'+
    '<p class="hint">Each lift credits the muscles that work near their own limit in it. Lower-body lifts use the muscle model at your saved setup; upper-body lifts use the usual 1 for the prime mover and ½ for helpers, because the model\'s split between chest, delts and triceps isn\'t validated yet.</p>'+
    '<p class="hint">Not counted: climbing, which trains your lats, biceps and forearms hard but isn\'t modelled; fast pull-ups (speed work, far from failure)'+(ot.length ? '; '+ot.map(esc).join(", ") : '')+'.</p></details>'+srcLine([["vol","Schoenfeld et al. 2017"],["bazv","Baz-Valle et al. 2022"]]);
  return h;
}
/* ---------- strength balance ---------- */
export const BAL_NAME = {squat:"Squat", dead:"Deadlift", bench:"Bench", ohp:"OHP"};
export function balMax(mv){
  const set = bodyCache && bodyCache.maxes && num(bodyCache.maxes[mv]);
  if (set > 0) return {lb:set, src:"set on the Build tab", saved:false};
  const wm = workMax(mv); if (!(wm && wm.v > 0)) return null;
  return {lb:wm.v, src:wm.src, saved:/^saved max/.test(wm.src)};
}
/* when the model can't solve a saved setup it uses the nearest one that solves; say which */
export function altNote(name, f){
  if (!f || !f.alt) return '';
  if (f.alt==="depth") return 'Your '+name.toLowerCase()+' setup\'s depth ('+f.want+'° below parallel) is past the hip bend the model allows you, so it uses '+(f.depth > 0 ? f.depth+'° below parallel' : 'parallel')+', the deepest that solves; measuring your hip flexion on the Build tab may change that.';
  return 'Your marked '+name.toLowerCase()+' setup doesn\'t solve for your body, so a standard one stands in.';
}
/* the normal spread around the typical ratio (±10%), leaned up to 5% the way your proportions push it */
export function balRange(p){ const lo = p.typical*0.9*Math.min(1, p.lean), hi = p.typical*1.1*Math.max(1, p.lean); return {lo, hi}; }
export function leanTxt(p, A, B){
  if (!p.model || Math.abs(p.raw - 1) < 0.02) return '';
  return '; your proportions favour the '+(p.raw > 1 ? A : B).toLowerCase()+', so the range leans '+(p.raw > 1 ? 'higher' : 'lower');
}
export function balBar(p, r){
  const {lo, hi} = balRange(p), mn = p.typical*0.55, mx = p.typical*1.45, X = v => 6 + clampN((v - mn)/(mx - mn), 0, 1)*288;
  return '<svg class="balbar" viewBox="0 0 300 30" role="img" aria-label="Your ratio '+r.toFixed(2)+' against an expected range of '+lo.toFixed(2)+' to '+hi.toFixed(2)+'">'+
    '<line x1="6" y1="15" x2="294" y2="15" stroke="var(--line)" stroke-width="4" stroke-linecap="round"/>'+
    '<rect x="'+X(lo)+'" y="9" width="'+Math.max(2, X(hi)-X(lo))+'" height="12" rx="4" fill="var(--accent)" fill-opacity=".22"/>'+
    '<line x1="'+X(p.typical)+'" y1="5" x2="'+X(p.typical)+'" y2="25" stroke="var(--muted)" stroke-width="1.5" stroke-dasharray="2 2"/>'+
    '<circle cx="'+X(r)+'" cy="15" r="6.5" fill="var(--ink)" stroke="var(--surface)" stroke-width="2"/></svg>';
}
export function limbLine(L){
  if (!L) return '';
  const bits = [], pc = v => Math.round(Math.abs(v)*100)+"% "+(v > 0 ? "longer" : "shorter");
  if (L.thigh != null && Math.abs(L.thigh) >= 0.03) bits.push("thighs "+pc(L.thigh));
  if (L.torso != null && Math.abs(L.torso) >= 0.03) bits.push("torso "+pc(L.torso));
  if (L.arm != null && Math.abs(L.arm) >= 0.03) bits.push("arms "+pc(L.arm));
  if (L.thigh == null && L.arm == null) return '<p class="hint">Each shaded range is the usual spread around the typical ratio. Add your measurements on the Build tab and it leans the way your proportions shift the leverage.</p>';
  if (!bits.length) return '<p class="hint">Your measured proportions are close to typical for your height, so each shaded range is the usual spread around the typical ratio.</p>';
  return '<p class="hint">Your measurements: '+bits.join(", ")+' than typical for your height. Each shaded range is the usual spread around the typical ratio, leaned a little the way those proportions shift the leverage.</p>';
}
export function balPanel(api){
  const head = '<h2>Strength balance</h2>';
  const M = {}; ["squat","dead","bench","ohp"].forEach(mv=>{ M[mv] = balMax(mv); });
  const have = Object.keys(M).filter(k=>M[k]);
  if (have.length < 2) return head+'<div class="empty">Add maxes for at least two of squat, deadlift, bench and OHP (Setup tab) and this compares them.</div>';
  const k = "m30|"+mxBodyKey()+"|"+bwAt(today());   // m30: model version, so a physics update recomputes
  if (!MX.bal[k]){ const c = lsGet("sl.mxbal", null); if (c && c.k === k) MX.bal[k] = {v:c.v}; }
  if (!MX.bal[k]){ if (!api) return null; let v = null; try{ v = api.balance(bodyCache || {}, bwAt(today())); }catch(e){} MX.bal[k] = {v}; if (v) lsSet("sl.mxbal", {k, v}); }
  const B = MX.bal[k].v; if (!B) return head+'<div class="empty">The model couldn\'t solve these lifts for your body. Check your measurements on the Build tab.</div>';
  let h = head+limbLine(B.limbs);
  const lag = [];
  B.pairs.forEach(p=>{
    const A = M[p.a], Bm = M[p.b]; if (!A || !Bm) return;
    const r = A.lb/Bm.lb, {lo, hi} = balRange(p), saved = [A, Bm].some(x=>x.saved);
    let v;
    const g = r < lo ? 1 - r/lo : r > hi ? 1 - hi/r : 0;
    if (g >= 0.03){ const w = r < lo ? p.a : p.b, o = r < lo ? p.b : p.a; lag.push({mv:w, g, vs:o, saved}); v = '<b>'+BAL_NAME[w]+' is about '+Math.round(g*100)+'% below</b> what your '+BAL_NAME[o].toLowerCase()+' predicts.'; }
    else v = '<b>In line</b>'+(g > 0 || r < lo*1.03 || r > hi/1.03 ? ', at the '+(r < (lo+hi)/2 ? 'low' : 'high')+' end of the range.' : ' for your build.');
    h += '<div class="balrow"><div class="spread"><span class="bl-n">'+BAL_NAME[p.a]+' ÷ '+BAL_NAME[p.b].toLowerCase()+'</span><span class="bl-v">'+A.lb+' ÷ '+Bm.lb+' = <b>'+r.toFixed(2)+'</b></span></div>'+balBar(p, r)+
      '<p class="hint">'+v+' Expected '+lo.toFixed(2)+'–'+hi.toFixed(2)+' (typical '+p.typical.toFixed(2)+leanTxt(p, BAL_NAME[p.a], BAL_NAME[p.b])+').'+
      (saved ? ' <span class="warnt">Uses a saved max ('+[A, Bm].filter(x=>x.saved).map(x=>x.lb).join(", ")+' lb) rather than a recent set, so it may be out of date.</span>' : '')+'</p></div>';
  });
  if (lag.length){
    const w = lag.slice().sort((a,b)=>b.g - a.g)[0], wl = liftName(w.mv) || BAL_NAME[w.mv];
    const ek = "bal|"+w.mv+"|"+k+"|"+M[w.mv].lb;
    if (MX[ek] === undefined){ if (!api) MX[ek] = null; else { let x = null; try{ x = api.explain({rec: bodyCache || {}, bw: bwAt(today()), lift: wl, w: M[w.mv].lb, oneRM: S.profile.oneRM, best: SIM_BRIDGE.liftBest}); }catch(e){} MX[ek] = x; } }
    const x = MX[ek];
    h += '<div class="weak"><span class="lab">Weak link'+(w.saved ? ' (if your saved max is current)' : '')+'</span><p class="big">'+esc(BAL_NAME[w.mv])+'</p><p>'+
      'It has the most room relative to your other lifts. '+(x && !x.fail ? 'At '+M[w.mv].lb+' lb the model\'s hardest point is '+esc(x.where)+', where your '+esc(x.joint)+' are closest to their limit'+(x.muscle ? ' ('+esc(x.muscle.toLowerCase())+' working hardest)' : '')+'. '+(x.acc ? 'To build that spot: '+esc(x.acc)+'. ' : '') : '')+
      'The quickest gains usually come from giving it priority: train it first in its session, or add a second weekly session for a block.</p></div>';
  }
  h += '<p class="hint">Typical ratios are medians: squat ÷ deadlift and bench ÷ squat from about 30,000–80,000 raw men per weight class in OpenPowerlifting; OHP ÷ bench is a community benchmark (0.60–0.67). Lifters spread about ±10% around them. The lean for your build uses only bone lengths, not muscle size, which is what training changes; the model\'s estimate of that lean is larger than published limb-length data supports, so at most 5% of it is used.</p>'+srcLine([["oplr","OpenPowerlifting ratios (Fitness Volt)"],["ohpr","OHP ÷ bench benchmark"]]);
  return h;
}
/* ---------- setup changes: sessions before and after you changed a lift's setup ---------- */
export function sessE1(lift, s){
  let b = 0; (s.lifts||[]).forEach(l=>{ if (l.lift!==lift) return; cleanSets(l).forEach(x=>{ if (x.reps > 10) return; const w = pullAdds(lift) ? x.w + bwAt(s.date) : x.w; if (w) b = Math.max(b, epley(w, x.reps)); }); });
  return b || null;
}
export function setupPanel(){
  const head = '<h2>Setup changes</h2>', L = {};
  sorted().slice().reverse().forEach(s=>(s.lifts||[]).forEach(l=>{ if (!l.su) return; const e = sessE1(l.lift, s); (L[l.lift] = L[l.lift] || []).push({date:s.date, su:l.su, e}); }));
  const lifts = Object.keys(L);
  if (!lifts.length) return head+'<div class="empty">On the Build tab, press \u201cThis is how I lift\u201d for a lift and each session you save from then on keeps that setup. When you later mark a different one, this compares your sessions before and after. Experiments in Build don\'t count.</div>';
  let h = head;
  lifts.forEach(lift=>{
    const R = []; L[lift].forEach(x=>{ const last = R[R.length-1]; if (last && last.su === x.su) last.list.push(x); else R.push({su:x.su, list:[x]}); });
    const cur = R[R.length-1];
    if (R.length < 2){ h += '<div class="surow"><div class="spread"><b>'+esc(lift)+'</b><span class="hint">'+cur.list.length+' session'+(cur.list.length===1?'':'s')+' since '+esc(shortD(cur.list[0].date))+'</span></div><p class="hint">'+esc(cur.su)+'</p></div>'; return; }
    const prev = R[R.length-2], A = prev.su.split(" · "), Bx = cur.su.split(" · ");
    const was = A.filter(t=>!Bx.includes(t)), now = Bx.filter(t=>!A.includes(t));
    const before = prev.list.filter(x=>x.e).slice(-3), after = cur.list.filter(x=>x.e).slice(0, 3);
    let v;
    if (before.length < 2 || after.length < 3) v = 'Logging: '+after.length+' of 3 sessions with the new setup'+(before.length < 2 ? ', and only '+before.length+' with the old one to compare' : '')+'.';
    else {
      const mean = a => a.reduce((t,x)=>t + x.e, 0)/a.length, mA = mean(before), mB = mean(after);
      const ss = [...before.map(x=>(x.e - mA)**2), ...after.map(x=>(x.e - mB)**2)].reduce((t,x)=>t+x, 0), dof = before.length + after.length - 2;
      const sd = Math.max(0.025*mA, Math.sqrt(ss/Math.max(1, dof))), band = 2*sd*Math.sqrt(1/before.length + 1/after.length)/mA, d = mB/mA - 1;
      v = 'Estimated max '+Math.round(mA)+' → '+Math.round(mB)+' lb (<b>'+(d >= 0 ? '+' : '−')+Math.abs(d*100).toFixed(1)+'%</b>; noise ±'+(band*100).toFixed(1)+'%). '+
        (Math.abs(d) <= band ? 'No clear difference yet.' : d > 0 ? 'Better than your usual session-to-session wobble, though some of it may be training progress.' : 'Worse than your usual session-to-session wobble. Give it a few more sessions, or switch back.');
    }
    h += '<div class="surow"><div class="spread"><b>'+esc(lift)+'</b><span class="hint">changed '+esc(shortD(cur.list[0].date))+'</span></div><p class="hint">'+esc(was.join(" · ") || "—")+' → <b>'+esc(now.join(" · ") || "—")+'</b></p><p class="hint">'+v+'</p></div>';
  });
  h += '<p class="hint">Compares up to 3 sessions on each side of your latest change, by the best estimated max in each. The noise band is twice the usual spread between your sessions (at least 2.5%).</p>';
  return h;
}
/* ---------- filmed sets ---------- */
export function filmPanel(api){
  const head = '<h2>Filmed sets</h2>', F = [];
  sorted().slice().reverse().forEach(s=>(s.lifts||[]).forEach(l=>{ if (!Array.isArray(l.sl)) return; l.sl.forEach(x=>{ if (!x.vid || !Array.isArray(x.vid.v) || !x.vid.v.length) return;
    const v1 = Math.max(...x.vid.v.slice(0, 2)), load = pullAdds(l.lift) ? r1(x.w) + bwAt(s.date) : r1(x.w);
    F.push({date:s.date, lift:l.lift, w:r1(x.w), load, reps:r1(x.reps), v1, loss:num(x.vid.loss), rir:num(x.vid.rir), ref:e1Ref(l.lift, s.date)}); }); }));
  if (F.length && !api) return null;
  if (!F.length) return head+'<div class="empty">Film a set from the log (Film a set, under a lift) and its rep speeds land here. Film the same weight again later and this shows whether it moved faster; with a few weights filmed it estimates your max from speed.</div>';
  const mv = lift => api ? api.moveOf(lift) : null;
  let h = head+'<div class="tw"><table class="pct film"><thead><tr><th>Set</th><th>First rep</th><th>Slowdown</th><th>In reserve</th></tr></thead><tbody>'+
    F.slice(-8).reverse().map(f=>'<tr><td><span class="fl">'+esc(f.lift)+' '+(pullAdds(f.lift) ? (f.w ? '+'+f.w : 'BW') : f.w)+'×'+f.reps+'</span><small>'+esc(shortD(f.date))+'</small></td><td>'+fmtSpeed(f.v1)+'</td><td>'+(f.loss!=null ? '−'+Math.round(f.loss*100)+'%' : '–')+'</td><td>'+(f.rir!=null ? '≈'+f.rir : '–')+'</td></tr>').join("")+
    '</tbody></table></div><p class="hint">Speeds in '+speedUnit()+', the faster of the first two reps.</p>';
  const lines = [];
  [...new Set(F.map(f=>f.lift))].forEach(lift=>{
    const G = F.filter(f=>f.lift===lift), byW = {};
    G.forEach(f=>{ const k = Math.round(f.load/5)*5; (byW[k] = byW[k] || []).push(f); });
    Object.keys(byW).forEach(k=>{ const a = byW[k]; if (a.length < 2) return; const f0 = a[0], f1 = a[a.length-1], d = f1.v1/f0.v1 - 1;
      lines.push('<b>'+esc(lift)+' at '+(pullAdds(lift) ? (f1.w ? '+'+f1.w+' lb' : 'bodyweight') : f1.w+' lb')+':</b> '+fmtSpeed(f0.v1)+' → '+fmtSpeed(f1.v1)+' '+speedUnit()+' ('+esc(shortD(f0.date))+' → '+esc(shortD(f1.date))+'). '+
        (Math.abs(d) < 0.08 ? 'About the same: within what filming alone can tell apart.' : d > 0 ? 'Faster by '+Math.round(d*100)+'%: a sign this weight is getting easier.' : 'Slower by '+Math.round(-d*100)+'%: a tired day, or check the camera was in the same spot.')); });
    const m = mv(lift); if (!m || !api) return;
    const loads = G.map(f=>f.load), lo = Math.min(...loads), hi = Math.max(...loads);
    if (G.length >= 4 && (hi - lo)/hi >= 0.15){
      const n = G.length, mx = loads.reduce((t,x)=>t+x, 0)/n, my = G.reduce((t,f)=>t+f.v1, 0)/n;
      const sxy = G.reduce((t,f)=>t + (f.load - mx)*(f.v1 - my), 0), sxx = G.reduce((t,f)=>t + (f.load - mx)**2, 0), slope = sxy/sxx;
      if (slope < 0){ const est = mx + (api.v1rm(m) - my)/slope, ref = G[G.length-1].ref, sh = est - (pullAdds(lift) ? bwAt(today()) : 0);
        if (est > hi && est < hi*1.6) lines.push('<b>'+esc(lift)+' max from speed:</b> about '+Math.round(sh/5)*5+' lb'+(pullAdds(lift) ? ' added' : '')+' (from '+n+' filmed sets, where your speed would fall to the published 1RM speed of '+fmtSpeed(api.v1rm(m))+' '+speedUnit()+')'+
          (ref ? '; your log says about '+Math.round((ref - (pullAdds(lift) ? bwAt(today()) : 0))/5)*5+'.' : '.')+' Phone speeds can be off by 10–20%, so watch the trend rather than the number.'); }
    }
  });
  if (lines.length) h += lines.map(x=>'<p class="hint">'+x+'</p>').join("");
  else h += '<p class="hint">Film a weight you\'ve filmed before to compare speeds, and 4 or more sets across a 15% spread of weights for a speed-based max.</p>';
  return h;
}
/* panels are drawn from memory when the model has already run; otherwise a placeholder, then statsFill() computes and swaps */
export function mxPanel(id, fn, api){ let h = null; try{ h = fn(api || null); }catch(e){ h = ''; }
  return '<div class="panel" id="'+id+'"'+(h == null ? ' data-mx="1"' : '')+'>'+(h == null ? '<h2>'+({"mx-sets":"Hard sets per muscle · weekly", "mx-bal":"Strength balance", "mx-film":"Filmed sets"})[id]+'</h2><p class="hint">Working this out from your body model…</p>' : h)+'</div>'; }
export function statsModel(){
  return '<h2 class="sect">Through your body model</h2>'+mxPanel("mx-sets", setsPanel)+mxPanel("mx-bal", balPanel)+'<div class="panel" id="mx-setup">'+setupPanel()+'</div>'+mxPanel("mx-film", filmPanel, window.SLSim && window.SLSim.log);
}
export function statsFill(){
  const pend = [...document.querySelectorAll('[data-mx="1"]')]; if (!pend.length) return;
  if (MX.busy) return; MX.busy = true;
  simReady().then(api=>{
    const jobs = pend.map(n=>()=>{ if (!document.body.contains(n)) return; const fn = {"mx-sets":setsPanel, "mx-bal":balPanel, "mx-film":filmPanel}[n.id]; let h = '';
      try{ h = fn(api); }catch(e){ h = '<h2>'+esc(n.id)+'</h2><p class="hint">Couldn\'t compute this right now.</p>'; }
      n.innerHTML = h == null ? '' : h; n.removeAttribute("data-mx"); });
    const step = ()=>{ const j = jobs.shift(); if (!j){ MX.busy = false; return; } try{ j(); }catch(e){} setTimeout(step, 30); };
    setTimeout(step, 60);
  }).catch(()=>{ MX.busy = false; pend.forEach(n=>{ if (document.body.contains(n)) n.innerHTML = n.innerHTML.replace(/Working this out from your body model…/, "The body model didn't load. Check your connection and open Stats again."); }); });
}
