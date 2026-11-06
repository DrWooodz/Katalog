/* SVG charts: line chart, sparkline, KPI tiles, calendar heatmap, stacked bars, weekly buckets. */
import { S } from "../core/state.js";
import { dayNum, dnStr, esc, fmtDate, mondayN, shortD, today } from "../core/util.js";
import { PRIORITY, STACK_ORDER, TYPES } from "../data/types.js";

/* ----- progress ----- */
export function chart(points, opt){
  if (points.length<2) return '<div class="empty">'+(points.length?'One entry so far. The line starts at two.':'Nothing logged yet.')+'</div>';
  const W=420,H=210,L=44,R=12,T=14,B=26;
  const xs = points.map(p=>dayNum(p.x)), ys = points.map(p=>p.y).concat(opt.goal!=null?[opt.goal]:[]);
  let y0 = Math.min.apply(null,ys), y1 = Math.max.apply(null,ys);
  const pad = (y1-y0)*0.12 || (opt.step||5);
  y0 -= pad; y1 += pad;
  const step = niceStep((y1-y0)/4);
  y0 = Math.floor(y0/step)*step; y1 = Math.ceil(y1/step)*step;
  const x0 = Math.min.apply(null,xs), x1 = Math.max.apply(null,xs);
  const sx = x => L + (x1===x0 ? (W-L-R)/2 : (x-x0)/(x1-x0)*(W-L-R));
  const sy = y => T + (1-(y-y0)/(y1-y0))*(H-T-B);
  let g = '';
  for (let v=y0; v<=y1+1e-9; v+=step){ g += '<line class="grid" x1="'+L+'" x2="'+(W-R)+'" y1="'+sy(v)+'" y2="'+sy(v)+'"/><text class="ax" x="'+(L-6)+'" y="'+(sy(v)+4)+'" text-anchor="end">'+(opt.fmt?opt.fmt(v):Math.round(v*100)/100)+'</text>'; }
  const fd = s => { const [y,m,d] = s.split("-").map(Number); return new Date(y,m-1,d).toLocaleDateString(undefined,{month:"short",day:"numeric"}); };
  g += '<text class="ax" x="'+L+'" y="'+(H-8)+'">'+fd(points[0].x)+'</text><text class="ax" x="'+(W-R)+'" y="'+(H-8)+'" text-anchor="end">'+fd(points[points.length-1].x)+'</text>';
  if (opt.goal!=null) g += '<line class="goal" x1="'+L+'" x2="'+(W-R)+'" y1="'+sy(opt.goal)+'" y2="'+sy(opt.goal)+'"/><text class="goaltx" x="'+(W-R)+'" y="'+(sy(opt.goal)-5)+'" text-anchor="end">'+esc(opt.goalLabel)+'</text>';
  const pts = points.map(p=>[sx(dayNum(p.x)), sy(p.y)]);
  const line = pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');
  const area = line+' L'+pts[pts.length-1][0].toFixed(1)+' '+(H-B)+' L'+pts[0][0].toFixed(1)+' '+(H-B)+' Z';
  const c = opt.color;
  g += '<path d="'+area+'" fill="'+c+'" fill-opacity=".1" stroke="none"/><path d="'+line+'" fill="none" stroke="'+c+'" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>';
  pts.forEach((p,i)=>{ const last = i===pts.length-1; g += '<circle cx="'+p[0]+'" cy="'+p[1]+'" r="'+(last?5:2.6)+'" fill="'+c+'"'+(last?' stroke="var(--surface)" stroke-width="2"':'')+'/>'; });
  pts.forEach((p,i)=>{ g += '<circle cx="'+p[0]+'" cy="'+p[1]+'" r="12" fill="transparent" data-tip="'+esc(fmtDate(points[i].x)+'\n'+(opt.fmt?opt.fmt(points[i].y):points[i].y)+(points[i].note?'\n'+points[i].note:''))+'"/>'; });
  return '<div class="chart"><svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+esc(opt.aria)+'">'+g+'</svg></div>';
}
export function niceStep(raw){ const p = Math.pow(10, Math.floor(Math.log10(raw||1))); const n = raw/p; return (n<=1?1:n<=2?2:n<=2.5?2.5:n<=5?5:10)*p; }
export function spark(vals, color){
  if (vals.length<2) return '<svg viewBox="0 0 160 30" aria-hidden="true"></svg>';
  const mn = Math.min.apply(null,vals), mx = Math.max.apply(null,vals), r = (mx-mn)||1;
  const pts = vals.map((v,i)=>[i/(vals.length-1)*152+4, 26-((v-mn)/r)*21]);
  const d = pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' '), E = pts[pts.length-1];
  return '<svg viewBox="0 0 160 30" aria-hidden="true"><path d="'+d+' L156 30 L4 30 Z" fill="'+color+'" fill-opacity=".1"/><path d="'+d+'" fill="none" stroke="'+color+'" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/><circle cx="'+E[0]+'" cy="'+E[1]+'" r="3.5" fill="'+color+'" stroke="var(--surface)" stroke-width="2"/></svg>';
}
export function valueBefore(series, days){ const cut = dnStr(dayNum(today())-days); let v = null; series.forEach(p=>{ if (p.x<=cut) v = p.y; }); return v; }
export function deltaTxt(now, then, unit, span, dec){
  if (then==null || now==null) return "No earlier data to compare";
  const d = now-then, f = dec ? Math.abs(d).toFixed(dec) : Math.round(Math.abs(d));
  return '<b>'+(d>0?'▲ ':d<0?'▼ ':'')+f+(unit||'')+'</b> vs '+span+' ago';
}
export function kpi(o){
  return '<div class="kpi" style="--tc:'+o.c+'"'+(o.tip?' data-tip="'+esc(o.tip)+'"':'')+'><span class="lab">'+esc(o.label)+'</span><span class="val">'+o.val+(o.unit?' <small>'+esc(o.unit)+'</small>':'')+'</span>'+
    (o.pct!=null?'<div class="bar"><i style="width:'+Math.max(0,Math.min(100,o.pct*100)).toFixed(0)+'%;background:'+o.c+'"></i></div>':'')+
    '<span class="dl">'+o.delta+'</span>'+(o.spark||'')+'</div>';
}
export function weekBuckets(weeks){
  const start = mondayN(today()) - (weeks-1)*7, out = [];
  for (let w=0; w<weeks; w++) out.push({from:start+w*7, label:shortD(dnStr(start+w*7)), list:[]});
  S.sessions.forEach(s=>{ const w = Math.floor((dayNum(s.date)-start)/7); if (w>=0 && w<weeks) out[w].list.push(s); });
  return out;
}
export function heatmap(weeks){
  const tN = dayNum(today()), start = mondayN(today()) - (weeks-1)*7;
  const byDay = {}; S.sessions.forEach(s=>{ (byDay[s.date] = byDay[s.date] || []).push(s); });
  const cs = 16, gp = 3, L = 28, T = 16, W = L+weeks*(cs+gp), H = T+7*(cs+gp);
  let g = '', lastM = -1, used = new Set(), active = 0, total = 0;
  ["Mon","","Wed","","Fri","","Sun"].forEach((t,r)=>{ if (t) g += '<text class="ax" x="'+(L-5)+'" y="'+(T+r*(cs+gp)+cs-4)+'" text-anchor="end">'+t+'</text>'; });
  for (let w=0; w<weeks; w++){
    const mN = start+w*7, md = new Date(mN*864e5);
    if (md.getUTCMonth()!==lastM){ lastM = md.getUTCMonth(); if (w < weeks-1) g += '<text class="ax" x="'+(L+w*(cs+gp))+'" y="11">'+md.toLocaleDateString(undefined,{month:"short", timeZone:"UTC"})+'</text>'; }
    for (let r=0; r<7; r++){
      const n = mN+r; if (n>tN) continue;
      const ds = dnStr(n), list = byDay[ds] || [], x = L+w*(cs+gp), y = T+r*(cs+gp);
      if (!list.length){ g += '<rect x="'+x+'" y="'+y+'" width="'+cs+'" height="'+cs+'" rx="3" fill="var(--sunk)" stroke="var(--line)" data-tip="'+esc(fmtDate(ds)+'\nRest day')+'"/>'; }
      else {
        active++; total += list.length;
        const types = [...new Set(list.map(s=>s.type))].sort((a,b)=>PRIORITY.indexOf(a)-PRIORITY.indexOf(b)).slice(0,2);
        types.forEach(t=>used.add(t));
        const tip = fmtDate(ds)+'\n'+list.map(s=>(TYPES[s.type]||TYPES.other).label+(s.duration?' · '+s.duration+' min':'')).join('\n');
        if (types.length===1) g += '<rect x="'+x+'" y="'+y+'" width="'+cs+'" height="'+cs+'" rx="3" fill="'+(TYPES[types[0]]||TYPES.other).c+'" data-tip="'+esc(tip)+'"/>';
        else { const hw = (cs-2)/2; g += '<rect x="'+x+'" y="'+y+'" width="'+hw+'" height="'+cs+'" rx="2" fill="'+TYPES[types[0]].c+'" data-tip="'+esc(tip)+'"/><rect x="'+(x+hw+2)+'" y="'+y+'" width="'+hw+'" height="'+cs+'" rx="2" fill="'+TYPES[types[1]].c+'" data-tip="'+esc(tip)+'"/>'; }
      }
      if (n===tN) g += '<rect x="'+(x-1.5)+'" y="'+(y-1.5)+'" width="'+(cs+3)+'" height="'+(cs+3)+'" rx="4" fill="none" stroke="var(--ink)" stroke-width="1.5" pointer-events="none"/>';
    }
  }
  // longest break between training days in the window
  const days = Object.keys(byDay).filter(d=>dayNum(d)>=start).map(dayNum).sort((a,b)=>a-b);
  let gap = 0; for (let i=1; i<days.length; i++) gap = Math.max(gap, days[i]-days[i-1]-1);
  const legend = STACK_ORDER.filter(t=>used.has(t)).map(t=>'<span style="--tc:'+TYPES[t].c+'"><i></i>'+esc(TYPES[t].short)+'</span>').join('');
  return '<div class="chart" style="max-width:'+(W*1.6)+'px"><svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Training calendar, last '+weeks+' weeks, colored by session type">'+g+'</svg></div>'+
    (legend?'<div class="legend">'+legend+'<span style="--tc:var(--sunk)"><i style="border:1px solid var(--line)"></i>Rest</span></div>':'')+
    '<p class="hint">'+total+' sessions on '+active+' days in '+weeks+' weeks · longest break '+gap+' day'+(gap===1?'':'s')+'. Split squares are days with two session types.</p>';
}
export function topRounded(x,y,w,h,r){ r = Math.min(r, h, w/2); return 'M'+x+' '+(y+h)+' V'+(y+r)+' Q'+x+' '+y+' '+(x+r)+' '+y+' H'+(x+w-r)+' Q'+(x+w)+' '+y+' '+(x+w)+' '+(y+r)+' V'+(y+h)+' Z'; }
export function barChart(cols, opt){
  /* cols: [{label, segs:[{v, c, tip}], total}] ; one y-scale, 2px surface gap between stacked segments */
  const W = 400, H = opt.h||200, L = 28, R = 6, T = 18, B = 24;
  const max = Math.max(opt.minMax||4, ...cols.map(c=>c.total), opt.band?opt.band[1]+1:0);
  const step = niceStep(max/4), yMax = Math.ceil(max/step)*step;
  const sy = v => T + (1 - v/yMax)*(H-T-B), band = (W-L-R)/cols.length, bw = Math.min(24, band*0.62);
  let g = '';
  if (opt.band) g += '<rect x="'+L+'" y="'+sy(opt.band[1])+'" width="'+(W-L-R)+'" height="'+(sy(opt.band[0])-sy(opt.band[1]))+'" fill="var(--ok)" fill-opacity=".08"/><text class="goaltx" x="'+(W-R)+'" y="'+(sy(opt.band[1])-4)+'" text-anchor="end">target '+opt.band[0]+'–'+opt.band[1]+'</text>';
  for (let v=0; v<=yMax+1e-9; v+=step) g += '<line class="grid" x1="'+L+'" x2="'+(W-R)+'" y1="'+sy(v)+'" y2="'+sy(v)+'"/><text class="ax" x="'+(L-6)+'" y="'+(sy(v)+4)+'" text-anchor="end">'+(Math.round(v*10)/10)+'</text>';
  cols.forEach((c,i)=>{
    const x = L + i*band + (band-bw)/2;
    let base = 0; const segs = c.segs.filter(s=>s.v>0);
    segs.forEach((s,j)=>{
      const y0 = sy(base), y1 = sy(base+s.v), top = j===segs.length-1;
      const hgt = Math.max(1, y0-y1-(j>0?2:0)), yy = y1;
      g += top ? '<path d="'+topRounded(x,yy,bw,hgt,4)+'" fill="'+s.c+'" data-tip="'+esc(s.tip)+'"/>' : '<rect x="'+x+'" y="'+yy+'" width="'+bw+'" height="'+hgt+'" fill="'+s.c+'" data-tip="'+esc(s.tip)+'"/>';
      base += s.v;
    });
    if (c.total>0 && opt.totals) g += '<text class="ax" x="'+(x+bw/2)+'" y="'+(sy(c.total)-5)+'" text-anchor="middle" style="fill:var(--muted)">'+c.total+'</text>';
    if (i%(opt.every||2)===(cols.length-1)%(opt.every||2)) g += '<text class="ax" x="'+(x+bw/2)+'" y="'+(H-7)+'" text-anchor="middle">'+esc(i===cols.length-1?'This wk':c.label)+'</text>';
  });
  g += '<line x1="'+L+'" x2="'+(W-R)+'" y1="'+sy(0)+'" y2="'+sy(0)+'" stroke="var(--faint)" stroke-width="1"/>';
  return '<div class="chart"><svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+esc(opt.aria)+'">'+g+'</svg></div>';
}
