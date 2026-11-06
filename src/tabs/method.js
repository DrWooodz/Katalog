import { esc } from "../core/util.js";
import { COMPENDIUM } from "../data/compendium.js";
import { PLAYBOOK } from "../data/playbook.js";
import { GRADE_LABEL, REFS } from "../data/refs.js";

/* ----- method ----- */
export function vMethod(){
  let h = '<div class="panel"><h2>How this program works</h2><p class="hint">Each work group lists what to do, how it progresses, when to back off, and the reasoning. Every claim is tagged by how strong its evidence is: <span class="gtag trial">Trial / meta-analysis</span><span class="gtag obs">Observational</span><span class="gtag mech">Mechanism / lab</span><span class="gtag">Coaching convention</span>. Where the evidence runs out, the app uses your own logs instead.</p>'+
    '<div class="mjump">'+PLAYBOOK.map(p=>'<a href="#m-'+p.id+'">'+esc(p.title.split(":")[0])+'</a>').join("")+'<a href="#m-compendium">Movement compendium</a></div></div>';
  h += '<div class="panel"><h2>Weekly shape (rolling 7 days)</h2><div class="tw"><table class="pct"><thead><tr><th>Work</th><th>Per week</th><th>Spacing</th></tr></thead><tbody>'+
    [["Floor (every plan)","lifting ≥1, climbing ≥1, hangs 2, wrist/elbow 2","reminder only"],["Heavy focus lift","3–6 sets ≥80% each, 1–2 days","bench 2 d · deadlift 4 d"],["Max hangs","2: A on the limit day, B later","finger days 48 h apart · 6 h from other finger work"],["Limit bouldering","1","hangs A first, after the warm-up"],["Light climbing","fill the gaps","any"],["Wrist block","2–3","after lifts"],["Pulling","weighted pull-ups on heavy bench days","not before limit or hangs"],["Handstands","short practice, 1+","not on sore-wrist days"],["Finger rest days","≥3","—"]]
    .map(r=>'<tr><td>'+r[0]+'</td><td>'+r[1]+'</td><td>'+r[2]+'</td></tr>').join("")+'</tbody></table></div></div>';
  PLAYBOOK.forEach(p=>{
    h += '<article class="panel mcard" id="m-'+p.id+'" style="border-top:3px solid '+p.c+'"><h3>'+esc(p.title)+'</h3><p class="purpose">'+esc(p.purpose)+'</p><dl>'+
      '<div><dt>Prescription</dt><dd><ul>'+p.rx.map(x=>'<li>'+esc(x)+'</li>').join("")+'</ul></dd></div>'+
      '<div><dt>Progression</dt><dd>'+esc(p.prog)+'</dd></div>'+
      '<div><dt>Back off when</dt><dd>'+esc(p.stop)+'</dd></div></dl>'+
      '<details class="why"><summary>Why: biology, mechanics and evidence</summary><div class="ev">'+p.why.map(w=>'<div class="evi"><span class="gtag '+w.g+'">'+GRADE_LABEL[w.g]+'</span>'+esc(w.x)+
        (w.r?w.r.map(id=>'<div class="cite"><a href="'+esc(REFS[id].u)+'" target="_blank" rel="noopener">'+esc(REFS[id].t)+'</a></div>').join(""):'')+'</div>').join("")+'</div></details></article>';
  });
  const STAT = {plan:["In plan","ok"], swap:["Swap","accent"], option:["Option",""]};
  h += '<article class="panel mcard" id="m-compendium" style="border-top:3px solid var(--accent)"><h3>Movement compendium</h3><p class="purpose">Worthwhile movements, whether or not today\'s plan uses them. Use it to compare options, find a swap when something is sore, or decide what to add. <b>In plan</b> = programmed now. <b>Swap</b> = a sensible substitute. <b>Option</b> = situational. Grades show how well supported the entry is; most movement choices are coaching convention, and that is marked.</p>'+
    COMPENDIUM.map(grp=>'<h4 style="margin:14px 0 6px">'+esc(grp.g)+'</h4><div class="tw"><table class="pct"><tbody>'+grp.items.map(it=>{
      const st = STAT[it[1]];
      return '<tr><td style="white-space:nowrap"><b>'+esc(it[0])+'</b></td><td><span class="gtag" style="'+(st[1]?'border-color:var(--'+st[1]+');color:var(--'+st[1]+')':'')+'">'+st[0]+'</span><span class="gtag '+it[2]+'">'+GRADE_LABEL[it[2]]+'</span></td><td>'+esc(it[3])+
        (it[4]?it[4].map(id=>'<div class="cite"><a href="'+esc(REFS[id].u)+'" target="_blank" rel="noopener">'+esc(REFS[id].t)+'</a></div>').join(""):'')+'</td></tr>'; }).join("")+'</tbody></table></div>').join("")+'</article>';
  return h;
}
