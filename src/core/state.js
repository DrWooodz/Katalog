/* The live app state S (sessions, profile, draft, readiness, tab) and REF/asOf: the date plans are made for. sorted(), deloadOn(), adaptive(). */
import { dayNum, lsGet, today } from "./util.js";
import { DEFAULT_PROFILE, MAIN } from "../data/types.js";

/* REF = the day a plan is being made for. The log form plans "as of" its own date, from sessions before it
   (never the session itself or anything later); everywhere else REF is null and plans are as of today. */
export let REF = null;
export const refDay = () => REF ? REF.date : today();
export const daysAgo = s => s ? Math.round(dayNum(refDay()) - dayNum(s)) : null;
if (typeof document !== "undefined") document.documentElement.dataset.skin = lsGet("sl.skin", "chalk");   /* guarded so node tests can import the logic */
/* ---------- state ---------- */
export const S = {
  mode:"local", sessions:[], profile:JSON.parse(JSON.stringify(DEFAULT_PROFILE)),
  tab: lsGet("sl.tab","today"),
  ready: lsGet("sl.ready",{d:"",fingers:"g",back:"g",press:"g"}),
  draft:lsGet("sl.draft", null), confirmDel:null, confirmDiscard:false, downloads:null
};
if (S.ready.d !== today()) S.ready = {d:today(),fingers:"g",back:"g",press:"g"};
/* ---------- derived ---------- */
export const inRef = s => !REF || (s.id!==REF.ex && (s.date<REF.date || (s.date===REF.date && (s.created||0) < REF.created)));
export function asOf(d, fn){ const prev = REF; REF = {date:(d && d.date) || today(), ex:d && d.id, created:(d && d.created) || Date.now(), ready:d && d.readiness}; try{ return fn(); } finally{ REF = prev; } }
export const sorted = () => S.sessions.filter(inRef).sort((a,b)=> a.date===b.date ? (b.created||0)-(a.created||0) : (a.date<b.date?1:-1));
export function lastWhere(pred){ const s = sorted().find(pred); return s ? s.date : null; }
export const isFinger = s => s.fingers && s.fingers.done;
export const adaptive = () => S.profile.mode !== "max";
export const liftName = key => Object.keys(MAIN).find(k=>MAIN[k]===key);
export const deloadOn = () => !!(S.profile.deloadUntil && refDay() <= S.profile.deloadUntil);
