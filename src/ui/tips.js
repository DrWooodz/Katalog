/* ---------- tooltips (hover on desktop, tap on phone) ---------- */
export const TIP = document.getElementById("tip");
export function placeTip(x,y){ const r = TIP.getBoundingClientRect(); let l = x+12, t = y-r.height-12; if (l+r.width > innerWidth-8) l = x-r.width-12; if (l<8) l = 8; if (t<8) t = y+18; TIP.style.left = l+"px"; TIP.style.top = t+"px"; }
export function tipFor(e){ const el = e.target && e.target.closest ? e.target.closest("[data-tip]") : null; return el && el.getAttribute("data-tip") ? el : null; }
document.addEventListener("pointerover", e=>{ const el = tipFor(e); if (el){ TIP.textContent = el.getAttribute("data-tip"); TIP.hidden = false; placeTip(e.clientX, e.clientY); } });
document.addEventListener("pointermove", e=>{ if (TIP.hidden) return; if (!tipFor(e)){ TIP.hidden = true; return; } placeTip(e.clientX, e.clientY); });
document.addEventListener("pointerdown", e=>{ const el = tipFor(e); if (el){ TIP.textContent = el.getAttribute("data-tip"); TIP.hidden = false; placeTip(e.clientX, e.clientY); } else TIP.hidden = true; });
window.addEventListener("scroll", ()=>{ TIP.hidden = true; }, {passive:true});
