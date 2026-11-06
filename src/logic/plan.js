import { S, refDay } from "../core/state.js";
import { dayNum, num } from "../core/util.js";
import { PDAY, PLANS } from "../data/plans.js";
import { DEFAULT_PROFILE, PLATE_DEF } from "../data/types.js";

/* ---------- the current plan ---------- */
export function curPlan(){ const pp = S.profile.plan || DEFAULT_PROFILE.plan; return PLANS[pp.id] || PLANS.foundation; }
export const planStart = () => (S.profile.plan && S.profile.plan.start) || DEFAULT_PROFILE.plan.start;
export const planLifts = () => Object.keys(curPlan().lifts);
export const inPlan = key => planLifts().includes(key) || curPlan().maint.includes(key);
export const isMaint = key => curPlan().maint.includes(key);
export const planTarget = key => { const L = curPlan().lifts[key]; return L ? L.target : S.profile.goals[key]; };
export function planDayIds(){ const P = curPlan(), n = [3,4,5].includes(+S.profile.planDays) ? +S.profile.planDays : 4; return P.days[n] || P.days[4] || []; }
export const planDayList = () => planDayIds().map(id=>PDAY[id]).filter(Boolean);
/* 1 = first week of the plan; weeks run from the start date in 7-day steps */
export function planWeek(){ return Math.max(1, Math.floor((dayNum(refDay()) - dayNum(planStart()))/7) + 1); }
/* Plate-aware progression. jumpFor = the jump we'd like (+5 upper / +10 lower). barStep = the smallest jump your plates allow
   (two of your smallest plate). If your plates allow the desired jump, the bar goes up by it; if not (e.g. no 2.5s, so the
   smallest bar jump is 10), the work grows by reps first (top set 3 -> 4 -> 5 reps), then one barStep. All bar weights are
   rounded to something you can actually load. */
export const jumpFor = key => (key==="squat"||key==="dead") ? 10 : 5;
export const barStep = () => 2*plateStep();
export const repsFirst = key => barStep() > jumpFor(key);
export const rBar = x => { const b = barWeight(), st = barStep(); return x>0 ? Math.max(b, b + Math.round((x-b)/st)*st) : x; };
export const nextBar = w => { const b = barWeight(), st = barStep(); return b + (Math.floor((w-b)/st + 1e-6) + 1)*st; };
export const upBar = (w, key) => repsFirst(key) ? nextBar(w) : rBar(w + jumpFor(key));
/* round a prescription to a loadable bar weight and say so when that changed it */
export const toBar = o => { if (o && o.w>0){ const w = rBar(o.w); if (w!==o.w && o.why) o.why += " · "+w+" is the nearest weight your plates load"; o.w = w; } return o; };
export const plateStep = () => Math.min.apply(null, platesAvail());
export const rStep = x => { const st = plateStep(); return Math.round(x/st)*st; };
export const barWeight = () => num(S.profile.bar) || 45;
export const platesAvail = () => (Array.isArray(S.profile.plates) && S.profile.plates.length ? S.profile.plates : PLATE_DEF).slice().sort((a,b)=>b-a);
