/* Barbell loading: plates per side, the bar SVG, belt plates for hangs. */
import { esc, num } from "../core/util.js";
import { BARBELL_LIFTS, PLATE_LOOK } from "../data/types.js";
import { barWeight, platesAvail } from "../logic/plan.js";
import { bwAt } from "../logic/status.js";

/* greedy from the heaviest plate down: the way people actually load a bar, and exact for standard lb plate sets */
export function loadPlates(total, base, avail){
  avail = avail || platesAvail(); let rem = (total - base)/2; const side = [];
  avail.forEach(p=>{ while (rem >= p - 1e-6){ side.push(p); rem -= p; } });
  return {side, load:Math.round((base + 2*side.reduce((a,b)=>a+b,0))*100)/100};
}
export function barbellSVG(side, bar){
  const W = 280, H = 64, cy = 32, collarL = 96, collarR = W - 96, sleeve = 84;
  const tot = side.reduce((a,p)=>a + (PLATE_LOOK[p]||{w:6}).w + 1.5, 0), k = tot > sleeve - 6 ? (sleeve - 6)/tot : 1;
  let g = '<rect x="'+collarL+'" y="'+(cy-2.5)+'" width="'+(collarR-collarL)+'" height="5" rx="1.5" fill="currentColor" opacity=".55"/>'+
    '<rect x="6" y="'+(cy-4)+'" width="'+(collarL-6)+'" height="8" rx="2" fill="currentColor" opacity=".8"/><rect x="'+collarR+'" y="'+(cy-4)+'" width="'+(W-6-collarR)+'" height="8" rx="2" fill="currentColor" opacity=".8"/>'+
    '<rect x="'+(collarL-4)+'" y="'+(cy-7)+'" width="4" height="14" rx="1" fill="currentColor"/><rect x="'+collarR+'" y="'+(cy-7)+'" width="4" height="14" rx="1" fill="currentColor"/>';
  let xl = collarL - 4, xr = collarR + 4;
  side.forEach(p=>{ const L = PLATE_LOOK[p] || {c:"#888", h:.4, w:5}, w = L.w*k, h = L.h*(H - 6);
    xl -= w + 1.5*k; g += '<rect x="'+xl.toFixed(1)+'" y="'+(cy - h/2).toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+h.toFixed(1)+'" rx="1.5" fill="'+L.c+'" stroke="rgba(0,0,0,.35)" stroke-width=".8"/>';
    g += '<rect x="'+(xr + 1.5*k).toFixed(1)+'" y="'+(cy - h/2).toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+h.toFixed(1)+'" rx="1.5" fill="'+L.c+'" stroke="rgba(0,0,0,.35)" stroke-width=".8"/>'; xr += w + 1.5*k; });
  return '<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+esc((bar)+" lb bar"+(side.length ? ", per side "+side.join(", ") : ", no plates"))+'">'+g+'</svg>';
}
export const plateChips = side => '<span class="pl-chips">'+side.map(p=>{ const L = PLATE_LOOK[p] || {c:"#888"}; return '<span class="pl-chip'+(L.lt?' lt':'')+'" style="--pc:'+L.c+'">'+p+'</span>'; }).join("")+'</span>';
/* the whole loading block for a barbell lift; empty for anything that isn't on a bar */
export function plateHTML(lift, w, sm){
  w = num(w); if (!BARBELL_LIFTS[lift] || !w) return "";
  const bar = barWeight();
  if (w < bar) return '<div class="plates'+(sm?' sm':'')+'"><span class="pl-txt pl-off">'+w+' lb is under the '+bar+' lb bar.</span></div>';
  const r = loadPlates(w, bar), off = Math.round((w - r.load)*100)/100;
  return '<div class="plates'+(sm?' sm':'')+'">'+barbellSVG(r.side, bar)+'<span class="pl-txt">'+(r.side.length ? 'Each side: '+plateChips(r.side)+'<br>' : 'Empty bar. ')+'<b>'+bar+'</b> bar'+(r.side.length ? ' + <b>'+(r.side.reduce((a,b)=>a+b,0))+'</b> a side' : '')+
    (off > 0 ? '<br><span class="pl-off">Closest load is '+r.load+' lb ('+off+' short). Add smaller plates in Setup to hit it.</span>' : '')+'</span></div>';
}
/* hangboard: added weight hangs off a belt, so it is one stack, not pairs */
export function beltText(added){ const a = num(added); if (!a) return ""; if (a < 0) return " · "+(-a)+" lb assist"; let rem = a; const st = [];
  platesAvail().concat([1.25]).filter((x,i,arr)=>arr.indexOf(x) === i).sort((x,y)=>y-x).forEach(p=>{ while (rem >= p - 1e-6){ st.push(p); rem -= p; } });
  rem = Math.round(rem*100)/100; return " · on the belt: "+(st.length ? st.join(" + ") : "nothing")+(rem ? " (+"+rem+" lb more)" : ""); }
export function ratioText(d){ const bw = num(d.bw)||bwAt(d.date); return "Load ratio "+((bw+(num(d.fingers.added)||0))/bw).toFixed(2)+"× BW"+beltText(d.fingers.added); }
