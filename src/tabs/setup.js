import { JUMP, MAXMODE, TOP, pct, pctOff } from "../data/rules.js";
import { S, adaptive } from "../core/state.js";
import { esc, fmtDate, r5 } from "../core/util.js";
import { PLATE_SET, TYPES } from "../data/types.js";
import { barWeight, curPlan, planStart, platesAvail } from "../logic/plan.js";
import { baseMax, maxUnknown } from "../logic/progression.js";
import { SKINS, skinKey } from "../ui/skins.js";

/* ----- setup ----- */
export function vSetup(){
  const p = S.profile;
  let h = '<div class="panel"><h2>How targets are set</h2><label class="f">Target mode<select id="p-mode"><option value="adaptive"'+(adaptive()?' selected':'')+'>Adaptive: adjust from your logs (recommended)</option><option value="max"'+(!adaptive()?' selected':'')+'>Max-based: fixed % of saved maxes</option></select></label>'+
    '<p class="hint">'+(adaptive()
      ? 'Top sets go up '+JUMP.upper+' lb (upper body) or '+JUMP.lower+' lb (lower body) after a clean triple, repeat after a miss, and drop '+pctOff(TOP.dropTo)+'% after two misses. Back-offs and accessories follow a working max taken from your clean sets in the last 6 weeks, and drop if you miss them. A so-so readiness tap takes '+pctOff(TOP.soSoPct)+'% off heavy sets. Limit-bouldering volume follows your own good sessions and is cut after a session that ended on fingers.'
      : 'Every lift target is a fixed percentage of the saved maxes below: '+pct(MAXMODE.topPct)+'% top triple, '+pct(MAXMODE.backoffPct)+'% back-off. Hang loads still come from your last hang session, since there is no saved hang max.')+'</p></div>';
  h += '<div class="panel"><h2>Look</h2><div class="skins">'+Object.keys(SKINS).map(k=>'<button class="skinopt" data-act="skin" data-k="'+k+'" aria-pressed="'+(skinKey()===k)+'"><span class="sw">'+SKINS[k].sw.map(c=>'<i style="background:'+c+';border:1px solid var(--line)"></i>').join("")+'</span><b>'+esc(SKINS[k].name)+'</b><span class="hint">'+esc(SKINS[k].desc)+'</span></button>').join("")+'</div><p class="hint">Skins change the look and a few labels. They don\'t change any numbers.</p></div>';
  h += '<div class="panel"><h2>Out of practice</h2><p class="hint">Ticked lifts start with the re-entry ramp (3×5 from 70%) the first time you train them. A lift also goes back to re-entry after 6 weeks without heavy work.</p><div class="row">'+
    ["bench","dead","squat","ohp"].map(k=>'<label class="check"><input type="checkbox" data-detr="'+k+'" id="detr-'+k+'"'+((p.detrained||{})[k]?' checked':'')+'> '+TYPES[k].short+'</label>').join("")+'</div></div>';
  const rs = Object.assign({top:240, backoff:180, acc:120, hang:180, limit:180, wrist:60}, p.rest||{});
  h += '<div class="panel"><h2>Live rest timers (seconds)</h2><p class="hint">These start automatically after a set, hang, attempt or wrist set during a live session.</p><div class="grid3">'+
    [["top","Top set"],["backoff","Back-off"],["acc","Accessory"],["hang","Between hangs"],["limit","Between boulder attempts"],["wrist","Wrist sets"]].map(([k,l])=>'<label class="f">'+l+'<input type="number" inputmode="numeric" id="rest-'+k+'" data-rest="'+k+'" value="'+rs[k]+'"></label>').join("")+'</div></div>';
  h += '<div class="panel"><h2>Current maxes (lb)</h2><p class="hint">Every percentage and target is calculated from these. Update them every 10–12 sessions or when Stats says they moved. Tick <b>unknown</b> when a saved max is only a placeholder: that lift then starts with a test day from its floor, and its max comes from your logged sets.</p><div class="grid4">'+
    ["bench","dead","squat","ohp"].map(k=>{ const unk = !!(p.unknown||{})[k], fl = (p.floors||{})[k];
      return '<label class="f">'+TYPES[k].short+(unk ? ' · unknown'+(fl ? ', floor '+fl : '') : '')+'<input type="number" inputmode="decimal" data-orm="'+k+'" id="orm-'+k+'" value="'+esc(p.oneRM[k])+'"></label>'; }).join("")+'</div>'+
    '<div class="row">'+["bench","dead","squat","ohp"].map(k=>'<label class="check"><input type="checkbox" data-unk="'+k+'"'+((p.unknown||{})[k]?' checked':'')+'> '+TYPES[k].short+' unknown</label>').join("")+'</div>'+
    '<div class="grid3"><label class="f">Bodyweight (lb)<input type="number" inputmode="decimal" id="p-bw" value="'+esc(p.bw)+'"></label><label class="f">Hangboard edge (mm)<input type="number" id="p-edge" value="'+esc(p.edge||20)+'"></label></div></div>';
  const pa = platesAvail();
  h += '<div class="panel"><h2>Bar and plates</h2><p class="hint">Used to show how to load the bar for every barbell lift in Today, Log and History. Plates are per pair.</p>'+
    '<div class="grid3"><label class="f">Bar weight (lb)<select id="p-bar">'+[[45,"45 · standard"],[35,"35 · women\'s bar"],[55,"55 · safety squat bar"],[25,"25 · technique bar"]].map(([v,l])=>'<option value="'+v+'"'+(barWeight()===v?' selected':'')+'>'+l+'</option>').join("")+'</select></label></div>'+
    '<div class="platecfg">'+PLATE_SET.map(p=>'<label class="check"><input type="checkbox" data-plate="'+p+'"'+(pa.includes(p)?' checked':'')+'> '+p+'</label>').join("")+'</div></div>';
  h += '<div class="panel"><h2>Long-term goals</h2><p class="hint">Where each lift is headed in the long run. The current plan\'s stepping-stone targets live on the Plan tab.</p><div class="grid4">'+["bench","dead","squat","ohp"].map(k=>'<label class="f">'+TYPES[k].short+' (weight × reps)<div class="row" style="gap:4px;flex-wrap:nowrap"><input type="number" data-gw="'+k+'" id="gw-'+k+'" value="'+esc(p.goals[k].w)+'"><input type="number" data-gr="'+k+'" id="gr-'+k+'" value="'+esc(p.goals[k].r)+'" style="max-width:60px"></div></label>').join("")+'</div></div>';
  h += '<div class="panel"><h2>Plan</h2><p class="hint">'+esc(curPlan().name)+' since '+esc(fmtDate(planStart()))+'. Plans are read-only for now; see the Plan tab. How many days a week the plan is laid out for:</p><div class="chiprow">'+[3,4,5].map(n=>'<button data-act="days" data-v="'+n+'" aria-pressed="'+((+p.planDays||4)===n)+'">'+n+' days</button>').join("")+'</div></div>';
  // percent table
  const pcts = [50,60,65,70,75,80,85,88,90,95];
  h += '<div class="panel"><h2>Percent chart</h2><div class="tw"><table class="pct"><thead><tr><th>%</th>'+["bench","dead","squat","ohp"].map(k=>'<th>'+TYPES[k].short+'</th>').join("")+'</tr></thead><tbody>'+
    pcts.map(x=>'<tr><td>'+x+'%</td>'+["bench","dead","squat","ohp"].map(k=>'<td>'+(maxUnknown(k) ? '?' : r5(baseMax(k)*x/100))+'</td>').join("")+'</tr>').join("")+'</tbody></table></div><p class="hint">Rounded to 5 lb. Roughly: 90% ≈ 3 reps, 85% ≈ 5, 80% ≈ 7–8, 75% ≈ 10.</p></div>';
  const canShare = (()=>{ try{ return !!(navigator.canShare && navigator.canShare({files:[new File(["{}"], "k.json", {type:"application/json"})]})); }catch(e){ return false; } })();
  h += '<div class="panel"><h2>Backup</h2><p class="hint">Your log lives on this device only (in this browser\'s storage'+(S.persisted ? ', marked as persistent' : '')+'). Clearing site data or deleting the app erases it, so save a backup now and then. The same file restores here or in the old Send Log artifact, and it\'s what to hand Claude for a log review.</p>'+
    '<div class="row"><button class="btn" data-act="export">Save backup file</button>'+(canShare?'<button class="btn" data-act="share">Share backup file</button>':'')+'<button class="btn" data-act="copy">Copy backup text</button></div>'+
    '<div class="row"><label class="btn" style="display:inline-block">Restore from file<input type="file" id="imp-file" accept=".json,application/json,text/plain" class="sr"></label></div>'+
    '<label class="f">Or paste backup text<textarea id="imp" placeholder="Paste backup JSON here"></textarea></label><div class="row"><button class="btn" data-act="import">Restore</button><span class="hint" id="imp-msg"></span></div>'+
    '<p class="hint">Restoring adds sessions or replaces ones with the same id; it never deletes any. It also replaces your settings with the backup\'s.</p></div>';
  return h;
}
