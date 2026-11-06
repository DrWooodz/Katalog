/* Backup in and out (Setup tab). The file is the same JSON the Claude artifact's "Save backup file" / "Copy backup text"
   produced: {profile, sessions, body}. Restoring adds or replaces sessions by id and never deletes any. */
import { S } from "../core/state.js";
import { $, today, toast } from "../core/util.js";
import { SIM_BRIDGE } from "../frozen/sim-bridge.js";
import { backupJSON, importBackup } from "../store/store.js";
import { render } from "../ui/render.js";

const fileName = () => "katalog-"+today()+".json";
const say = t => { const m = $("#imp-msg"); if (m) m.textContent = t; };

export async function copyBackup(){
  const txt = backupJSON(false);
  try{ await navigator.clipboard.writeText(txt); toast("Backup copied"); }
  catch(err){ const t = $("#imp"); t.value = txt; t.select(); toast("Select-all and copy the text in the box"); }
}
/* a download link on a computer; the share sheet on a phone (Save to Files, AirDrop, Drive...) when the browser offers it */
export async function saveBackup(share){
  const txt = backupJSON(true), name = fileName();
  if (share){
    try{ const f = new File([txt], name, {type:"application/json"});
      if (navigator.canShare && navigator.canShare({files:[f]})){ await navigator.share({files:[f], title:name}); return; } }
    catch(err){ if (err && err.name==="AbortError") return; }
  }
  const url = URL.createObjectURL(new Blob([txt], {type:"application/json"})), a = document.createElement("a");
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 4000);
  toast("Backup saved as "+name);
}
export async function restoreText(txt){
  let data; try{ data = JSON.parse(txt); }catch(err){ say("That isn't valid backup text. Paste the whole thing."); return; }
  if (!data || !Array.isArray(data.sessions)){ say("No sessions found in that text."); return; }
  let n = 0;
  try{ n = await importBackup(data); }catch(err){ say("Couldn't restore: "+(err && err.message || "storage error")+"."); return; }
  if (data.body && typeof data.body==="object"){ try{ await SIM_BRIDGE.saveBody(data.body); }catch(err){} }
  render();
  say("Restored "+n+" session(s)."); toast("Restored "+n+" session(s)");
}
export function restoreFile(input){
  const f = input.files && input.files[0]; if (!f) return;
  f.text().then(restoreText, ()=>say("Couldn't read that file.")).finally(()=>{ input.value = ""; });
}
