/* The app's storage: everything lives on this device in IndexedDB (db.js). The data shape is exactly the Claude
   artifact's, so a backup moves both ways:
     { profile: {...}, sessions: [{id, date, type, ...}, ...], body: {...} }   (+ app/exportedAt, ignored on import)
   S.sessions and S.profile stay the in-memory copies every tab reads; this file keeps IndexedDB in step with them. */
import { S } from "../core/state.js";
import { $, today, toast } from "../core/util.js";
import { DEFAULT_PROFILE } from "../data/types.js";
import { bodyCache } from "../frozen/sim-bridge.js";
import { render } from "../ui/render.js";
import { applySkin } from "../ui/skins.js";
import { getAllSessions, putSession, putSessions, deleteSessionRec, getKV, putKV } from "./db.js";

let storeReadyDone;
export const storeReady = new Promise(r=>{ storeReadyDone = r; });

/* ---------- storage ---------- */
export function mergeProfile(p){
  const base = JSON.parse(JSON.stringify(DEFAULT_PROFILE));
  if (!p) return base;
  return Object.assign(base, p, {oneRM:Object.assign(base.oneRM, p.oneRM||{}), goals:Object.assign(base.goals, p.goals||{})});
}
const failMsg = e => e && (e.name==="QuotaExceededError" || e.code===22) ? "Storage full. Export a backup and delete old sessions." : "Couldn't save on this device. Try again.";
export async function saveSession(s){
  const i = S.sessions.findIndex(x=>x.id===s.id);
  if (i>=0) S.sessions[i] = s; else S.sessions.push(s);
  try{ await putSession(JSON.parse(JSON.stringify(s))); }catch(e){ toast(failMsg(e)); throw e; }
}
export async function deleteSession(id){
  S.sessions = S.sessions.filter(x=>x.id!==id);
  try{ await deleteSessionRec(id); }catch(e){ toast("Couldn't delete. Try again."); }
}
/* writes go out in order, and an unchanged profile is never written twice */
let profQ = Promise.resolve(), profJSON = null;
export function saveProfile(){
  const js = JSON.stringify(S.profile); if (js === profJSON) return profQ;
  profJSON = js;
  profQ = profQ.then(()=>putKV("profile", JSON.parse(js))).catch(e=>{ profJSON = null; toast(failMsg(e)); });
  return profQ;
}
export const loadBodyRec = () => getKV("body");
export const saveBodyRec = b => putKV("body", b);

export async function initStore(){
  try{
    const [sessions, profile] = await Promise.all([getAllSessions(), getKV("profile")]);
    S.sessions = sessions;
    S.profile = mergeProfile(profile);
    if (!profile) S.profile.skin = (()=>{ try{ return JSON.parse(localStorage.getItem("sl.skin")) || "chalk"; }catch(e){ return "chalk"; } })();
    if (!S.profile.blockStart){ S.profile.blockStart = today(); saveProfile(); }
    else profJSON = JSON.stringify(S.profile);
    applySkin();
    S.storeOK = true;
  }catch(e){
    S.storeOK = false;
    toast("This browser blocked on-device storage, so nothing will be saved. Leave private browsing and reload.");
  }
  askPersist();
  S.storeDone = true; setMode(); storeReadyDone(); render();
}
/* ask the browser not to evict this site's data under storage pressure (installed apps usually get it) */
async function askPersist(){
  try{ if (navigator.storage && navigator.storage.persist){ S.persisted = await navigator.storage.persisted() || await navigator.storage.persist(); } }catch(e){}
}
export function setMode(){
  $("#mode").innerHTML = S.storeOK===false ? "<b>Not saving</b> · storage blocked" : "<b>Saved on this device</b> · export backups in Setup";
}

/* ---------- backup ---------- */
/* backups include the body record when there is one; read from cache so the copy button stays synchronous */
export function backupObj(){ const o = {profile:S.profile, sessions:S.sessions}; if (bodyCache) o.body = bodyCache; return o; }
export function backupJSON(pretty){ return JSON.stringify(Object.assign({app:"katalog", exportedAt:new Date().toISOString()}, backupObj()), null, pretty ? 1 : 0); }
/* restore: the profile is replaced (merged over defaults), sessions are added or replaced by id, nothing is deleted */
export async function importBackup(data){
  if (!data || !Array.isArray(data.sessions)) throw new Error("No sessions found in that backup.");
  const list = data.sessions.filter(s=>s && s.id && s.date);
  if (data.profile){ S.profile = mergeProfile(data.profile); await saveProfile(); applySkin(); }
  await putSessions(JSON.parse(JSON.stringify(list)));
  list.forEach(s=>{ const i = S.sessions.findIndex(x=>x.id===s.id); if (i>=0) S.sessions[i] = s; else S.sessions.push(s); });
  return list.length;
}
