/* ---------- utils ---------- */
export const $ = s => document.querySelector(s);
export const esc = s => String(s==null?"":s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
export const r5 = x => Math.round(x/5)*5;
export const r25 = x => Math.round(x/2.5)*2.5;
export const num = v => { const n = parseFloat(v); return isFinite(n) ? n : null; };
export const today = () => { const d = new Date(); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); };
export const dayNum = s => { const [y,m,d] = s.split("-").map(Number); return Date.UTC(y,m-1,d)/864e5; };
export const fmtDate = s => { const [y,m,d] = s.split("-").map(Number); return new Date(y,m-1,d).toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric"}); };
export const epley = (w,r) => (!w||!r) ? 0 : (r===1 ? w : w*(1+r/30));
export const uid = () => Date.now().toString(36)+Math.random().toString(36).slice(2,7);
export const gradeN = g => g ? parseInt(g.slice(1),10) : null;
export function lsGet(k,d){ try{ const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; }catch(e){ return d; } }
export function lsSet(k,v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }
export let toastT;
export function toast(msg){ const t = $("#toast"); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(()=>{ t.hidden = true; }, 2600); }
export const addDays = (s, n) => { const [y,m,d] = s.split("-").map(Number); const t = new Date(Date.UTC(y,m-1,d+n)); return t.getUTCFullYear()+"-"+String(t.getUTCMonth()+1).padStart(2,"0")+"-"+String(t.getUTCDate()).padStart(2,"0"); };
export const mmss = s => { s = Math.max(0, Math.round(s)); const h = Math.floor(s/3600), m = Math.floor(s%3600/60), x = s%60; return (h? h+":"+String(m).padStart(2,"0") : m)+":"+String(x).padStart(2,"0"); };
export const clock = t => new Date(t).toLocaleTimeString([], {hour:"numeric", minute:"2-digit", second:"2-digit"});
/* ----- dashboard ----- */
export const dnStr = n => { const d = new Date(n*864e5); return d.getUTCFullYear()+"-"+String(d.getUTCMonth()+1).padStart(2,"0")+"-"+String(d.getUTCDate()).padStart(2,"0"); };
export const mondayN = s => { const n = dayNum(s); return n - ((new Date(n*864e5).getUTCDay()+6)%7); };
export const shortD = s => { const [y,m,d] = s.split("-").map(Number); return new Date(y,m-1,d).toLocaleDateString(undefined,{month:"short",day:"numeric"}); };
export const clampN = (x, a, b) => Math.max(a, Math.min(b, x));
