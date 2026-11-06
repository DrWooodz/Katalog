/* Set-by-set rows: ensureSL, deriveRow, setClean, cleanSets/workSets, progView (what a row means for progression), fmtSets. */
import { sorted } from "../core/state.js";
import { num } from "../core/util.js";
import { PULL } from "../data/types.js";

/* ---------- set-by-set lift records ----------
   Each lift row keeps sl: [{w, reps, tgt, st, t}]. st: "" planned, "ok" clean, "grind" done but ground out, "miss" failed.
   A set is clean when it is marked ok AND reached its target reps. Row fields w/reps/sets/clean are derived from the sets,
   so the progression logic reads the heaviest weight attempted, the reps made there, and whether every set was clean. */
export const r1 = v => { const n = num(v); return n==null ? 0 : n; };
export function mkSets(w, reps, n, pl){ const out = []; for (let i=0;i<Math.max(1, Math.round(n||1));i++){ const x = {w:r1(w), reps:r1(reps), tgt:r1(reps), st:""}; if (pl) x.pl = 1; out.push(x); } return out; }
/* an old live-tap log only wins over the row fields when they agree; if you corrected the row afterwards, the row is the truth */
export function logAgrees(l){ const L = l.log; return L.length===(num(l.sets)||1) && Math.max.apply(null, L.map(x=>r1(x.w)))===r1(l.w) && L.every(x=>x.ok)===!!l.clean; }
export function ensureSL(l, performed){
  if (Array.isArray(l.sl)) return l;
  if (l.log && l.log.length && (!performed || !r1(l.w) || logAgrees(l))) l.sl = l.log.map(x=>({w:r1(x.w), reps:r1(x.reps), tgt:r1(x.reps), st:x.ok ? "ok" : "miss", t:x.t}));
  else { l.sl = mkSets(l.w, l.reps, num(l.sets) || 1); if (performed && (r1(l.w) || r1(l.reps))) l.sl.forEach(x=>{ x.st = l.clean ? "ok" : "grind"; }); }
  delete l.log; return l;
}
export const setClean = x => x.st==="ok" && r1(x.reps) >= r1(x.tgt);
export function deriveRow(l){
  if (!Array.isArray(l.sl)) return l;
  const P = l.sl.filter(x=>x.st);
  if (!P.length){ const f = l.sl[0] || {}; l.w = r1(f.w); l.reps = r1(f.reps); l.sets = l.sl.length; l.clean = false; l.done = false; return l; }
  const topW = Math.max.apply(null, P.map(x=>r1(x.w))), at = P.filter(x=>r1(x.w)===topW);
  l.w = topW; l.reps = Math.max.apply(null, at.map(x=>r1(x.reps))); l.sets = P.filter(x=>x.st!=="miss").length; l.clean = P.every(setClean); l.done = true; return l;
}
/* what estimated maxes, charts and PRs are built from: every clean set (legacy rows: the row if it was clean) */
export function cleanSets(l){ if (Array.isArray(l.sl)) return l.sl.filter(x=>setClean(x) && (r1(x.w) || PULL[l.lift]) && r1(x.reps)).map(x=>({w:r1(x.w), reps:r1(x.reps)})); return l.clean && l.w && l.reps ? [{w:l.w, reps:l.reps}] : []; }
/* every set actually performed (misses included: a heavy attempt is still heavy work) */
export function workSets(l){ if (Array.isArray(l.sl)) return l.sl.filter(x=>x.st).map(x=>({w:r1(x.w), reps:r1(x.reps)})); return l.w ? Array.from({length:num(l.sets)||1}, ()=>({w:l.w, reps:l.reps})) : []; }
/* ---------- what a row means for progression ----------
   Planned rows carry their prescription: ps sets at pw lb. A row is clean for progression when that many sets were done clean
   at (or above) the planned weight. Extra sets beyond the plan (one more back-off, a heavier single) neither rescue nor spoil it;
   they still feed e1RM and volume through cleanSets/workSets. A row that never reached the planned weight is "under": it is
   kept for the record but doesn't move the plan. Older rows without a stamp use the usual set count for their role and are
   judged at the heaviest weight attempted, as before. */
export function defaultPS(l){
  if (l.role==="backoff") return 2;
  if (l.role==="top") return Array.isArray(l.sl) && l.sl.filter(x=>x.st).length>=3 && l.sl.every(x=>r1(x.tgt||x.reps)>=5) ? 3 : 1;
  return 3;
}
export function progView(l){
  if (!Array.isArray(l.sl)) return {w:r1(l.w), reps:r1(l.reps), clean:!!l.clean, under:false, extra:0};
  const P = l.sl.filter(x=>x.st), need = Math.max(1, num(l.ps) || defaultPS(l)), pw = num(l.pw) || 0;
  if (!P.length) return {w:r1(l.w), reps:r1(l.reps), clean:false, under:true, extra:0};
  const extra = Math.max(0, P.length - need), C = P.filter(setClean), top = Math.max.apply(null, P.map(x=>r1(x.w)));
  const floor = (pw || top) - 2.5;
  const ws = [...new Set(C.map(x=>r1(x.w)))].filter(w=>w>=floor).sort((a,b)=>b-a);
  for (const w of ws){ const at = C.filter(x=>r1(x.w)>=w); if (at.length>=need) return {w, reps:Math.max.apply(null, C.filter(x=>r1(x.w)===w).map(x=>r1(x.reps))), clean:true, under:false, extra}; }
  if (pw && top < floor) return {w:top, reps:0, clean:false, under:true, extra};
  const W = pw || top, at = P.filter(x=>Math.abs(r1(x.w)-W)<=2.5);
  return {w:W, reps:at.length ? Math.max.apply(null, at.map(x=>r1(x.reps))) : 0, clean:false, under:false, extra};
}
/* stamp the prescription onto a row so the engine can judge it later without guessing */
export function stampPlan(l, p){ if (p && p.sets){ l.ps = p.sets; l.pw = p.w; } else { delete l.ps; delete l.pw; } return l; }
/* "200×5 ×2 ✓, 200×4 ✗" */
export function fmtSets(l){
  const W = w => wLabel(l.lift, w) || r1(w);
  if (!Array.isArray(l.sl)) return W(l.w)+"×"+(l.reps||"?")+(l.sets>1?" ×"+l.sets+" sets":"")+(l.clean?" ✓":"");
  const mark = x => x.st==="ok" ? (setClean(x) ? "✓" : "short") : x.st==="grind" ? "ground out" : x.st==="miss" ? "✗" : "not done";
  const g = []; l.sl.forEach(x=>{ const k = r1(x.w)+"×"+r1(x.reps)+"|"+mark(x), last = g[g.length-1]; if (last && last.k===k) last.n++; else g.push({k, n:1, x}); });
  return g.map(o=>W(o.x.w)+"×"+r1(o.x.reps)+(o.x.st && r1(o.x.tgt) > r1(o.x.reps) ? " of "+r1(o.x.tgt) : "")+(o.n>1?" ×"+o.n:"")+" "+mark(o.x)).join(", ");
}
export function sumCls(l){ if (!l.done) return ""; const v = progView(l); return v.under && num(l.pw) ? "" : v.clean ? "ok" : "no"; }
export function rowSum(l){ deriveRow(l); const n = l.sl.filter(x=>x.st).length, left = l.sl.length - n;
  if (!n) return l.sl.length+" set"+(l.sl.length===1?"":"s")+" to do";
  const pv = progView(l), tail = left ? " · "+left+" to do" : "";
  if (pv.under && num(l.pw)) return "Lighter than the planned "+(wLabel(l.lift, l.pw)||l.pw)+": kept in your log, doesn't move the plan"+tail;
  if (pv.clean && !l.clean) return "Planned sets clean: counts toward progression · the extra set doesn't count against you"+tail;
  return (l.clean ? "Clean: counts toward progression" : "Not clean: "+(l.sl.filter(x=>x.st==="miss").length ? "a set was missed" : l.sl.some(x=>x.st==="ok" && !setClean(x)) ? "a set fell short of its target" : "a set was ground out"))+(left ? " · "+left+" to do" : "");
}
export function topRows(lift){
  const out = [];
  sorted().forEach(s => (s.lifts||[]).forEach(l => { if (l.lift===lift && l.role==="top" && l.w) out.push(Object.assign({date:s.date}, l, progView(l))); }));
  return out;
}
export function rowsOf(lift, pred){
  const out = [];
  sorted().forEach(s => (s.lifts||[]).forEach(l => { if (l.lift===lift && (l.w || (PULL[lift] && l.done)) && pred(l)) out.push(Object.assign({date:s.date}, l, progView(l))); }));
  return out;
}
export const wLabel = (lift, w) => PULL[lift] && lift!=="Bent-over row" ? (r1(w) ? "+"+r1(w)+" lb" : "BW") : null;
