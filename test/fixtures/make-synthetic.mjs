/* Builds test/fixtures/synthetic.json: a made-up lifter's log (not anyone's real data) in the backup shape
   {profile, sessions}. It is built to walk the progression code through as many branches as possible:
   clean jumps, two misses and the drop, unclean back-offs, accessories at their cap, bodyweight pull-ups earning reps,
   hangs earning hangs, limit sessions ending on fingers, wrist pain above 5, handstand levels, a filmed set.
   Run: node test/fixtures/make-synthetic.mjs */
import { writeFileSync } from "node:fs";

let n = 0;
const id = () => "syn" + String(++n).padStart(3, "0");
const T0 = Date.UTC(2026, 8, 1);
const created = d => T0 + (Date.UTC(+d.slice(0,4), +d.slice(5,7)-1, +d.slice(8,10)) - T0) + 17*3600e3;
/* a set list: [w, reps, target, st] */
const sets = (...a) => a.map(([w, reps, tgt, st]) => ({w, reps, tgt: tgt ?? reps, st: st ?? "ok"}));
const row = (lift, role, sl, extra) => Object.assign({lift, role, sl}, extra || {});
const base = (date, type, more) => Object.assign({
  id: id(), date, type, created: created(date), readiness: {fingers:"g", back:"g", press:"g"},
  lifts: [], fingers: {done:false}, climb: {on:false}, wb: {done:false}, hs: {done:false},
  wristPain: "", wrist: false, handstand: false, bw: "", notes: ""
}, more);
const hang = (added, hangs, clean, light) => ({done:true, edge:20, added, secs:10, hangs, clean, light:!!light, test:false});
const wb = (phase, ew, er, es, fw, fr, fs) => ({done:true, phase, ext:{w:ew, reps:er, sets:es}, flex:{w:fw, reps:fr, sets:fs}, iso:true, dev:phase===1, rocks:true, leans:""});
const hs = (level, best) => ({done:true, level, best, time:best*4, tries:6});
const prob = (name, grade, attempts, prog, style) => ({name, grade, attempts, prog, style});

const S = [];
// September: squat once (so its unknown max gets a logged e1RM), a re-entry style 3x5 on OHP
S.push(base("2026-09-14", "squat", {lifts:[row("Squat","top",sets([255,3],[255,3],[255,3]))], rpe:7, duration:55}));
S.push(base("2026-09-16", "ohp", {lifts:[row("OHP","top",sets([95,5],[95,5],[95,5]))], rpe:6, duration:40}));
// Bench: 250x3 clean, 255x3 clean, 260x3 clean, 265x3 missed twice (drop), then 245x3 clean
const benchTops = [["2026-09-21",250,"ok"],["2026-09-28",255,"ok"],["2026-10-05",260,"ok"],["2026-10-12",265,"miss"],["2026-10-19",265,"grind"],["2026-10-26",245,"ok"]];
benchTops.forEach(([d, w, st], i) => {
  const reps = st==="miss" ? 2 : 3;
  S.push(base(d, "bench", {
    lifts: [
      row("Bench","top",sets([w,reps,3,st]),{ps:1, pw:w}),
      row("Bench","backoff",sets([w-45,5,5,"ok"],[w-45,i===3?4:5,5,i===3?"ok":"ok"]),{ps:2, pw:w-45}),
      row("Weighted pull-up","acc",sets(...[0,0,0].map(()=>[i<3?0:5, i<3?5+i:3, i<3?5+i:3, "ok"])),{ps:3, pw:i<3?0:5}),
    ],
    fingers: i%2===0 ? hang(10, 4+Math.min(2,i/2), true, false) : {done:false},
    wb: wb(1, 10+(i>2?5:0), 12, 3, 15, 12, 3), wristPain: i===4 ? 6 : 1, wrist:true,
    readiness: {fingers:"g", back:"g", press: i===4 ? "y" : "g"}, rpe: 7+(i%3)*0.5, duration: 60+i*3
  }));
});
// Deadlift: 345x3, 355x3 clean, 365x3 clean; legs-up bench 170x6 -> 7 -> 8 -> cap
[["2026-09-23",345,170,6],["2026-10-07",355,170,7],["2026-10-21",365,170,8],["2026-11-02",365,180,6]].forEach(([d, w, lw, lr], i) => {
  S.push(base(d, "dead", {
    lifts: [
      row("Deadlift","top",sets([w,3]),{ps:1, pw:w}),
      row("Deadlift","backoff",sets([w-70,4],[w-70,4]),{ps:2, pw:w-70}),
      row("Legs-up bench","acc",sets([lw,lr],[lw,lr],[lw,lr]),{ps:3, pw:lw}),
      row("RDL","acc",sets([225,8],[225,8],[225,8])),
      row("Bent-over row","acc",sets([135,8+i],[135,8+i],[135,8+i])),
    ],
    wb: wb(1, 15, 10, 3, 20, 12, 3), wrist:true, rpe: 8, duration: 70
  }));
});
// a filmed bench set with speeds
S[S.length-3].lifts[0].sl[0].vid = {n:3, v:[0.42,0.39,0.33], loss:0.21, rir:2, at:T0};
// Limit bouldering: projects, a send, sessions ending on fingers
const lim = [
  ["2026-09-24", [prob("Red cave","V6",6,"sent","Crimp"), prob("Blue roof","V7",8,"high","Steep power"), prob("","V6",3,"sent","Sloper")], "quality"],
  ["2026-10-01", [prob("Blue roof","V7",5,"sent","Steep power"), prob("Green arete","V7",4,"half","Pinch"), prob("","V6",2,"sent","Crimp")], "fingers"],
  ["2026-10-15", [prob("Green arete","V7",6,"moves","Pinch"), prob("Black slab","V8",7,"few","Slab / technical"), prob("","V7",3,"sent","Crimp")], "fingers"],
  ["2026-10-29", [prob("Black slab","V8",9,"half","Slab / technical"), prob("","V7",2,"sent","Crimp"), prob("","V7",3,"sent","Dyno / coordination")], "plan"],
];
lim.forEach(([d, list, stop], i) => S.push(base(d, "limit", {
  fingers: hang(10 + (i>1?5:0), 4 + (i%3), i!==2, false),
  climb: {on:true, list, stop, send: list.filter(p=>p.prog==="sent").map(p=>p.grade).sort().pop() || "", tried: list.map(p=>p.grade).sort().pop(), problems:list.length},
  readiness: {fingers: i===2 ? "y" : "g", back:"g", press:"g"}, rpe: 8, duration: 90
})));
// Light climbing + hangs B + handstands (level 1 met twice, then level 2)
[["2026-09-26",1,62],["2026-10-03",1,65],["2026-10-10",2,12],["2026-10-17",2,16],["2026-10-24",2,18]].forEach(([d, L, best], i) => S.push(base(d, "light", {
  fingers: hang(0, 4, true, true), climb: {on:true, send:"V5", tried:"V6", attempts:2, problems:8},
  hs: hs(L, best), handstand:true, wristPain: i===3 ? 4 : 2, rpe: 5, duration: 50
})));
// bodyweight entries
S[3].bw = 176; S[12].bw = 177.5;

const profile = {
  oneRM:{bench:285, dead:395, squat:405, ohp:135}, goals:{bench:{w:315,r:3}, dead:{w:405,r:3}, squat:{w:405,r:3}, ohp:{w:135,r:8}},
  bw:176, mode:"adaptive", edge:20, skin:"chalk", deloadUntil:"", lastDeload:"2026-08-30", bwLog:[{d:"2026-09-01", w:175.5}],
  plan:{id:"foundation", start:"2026-10-05"}, planDays:4, unknown:{squat:true, ohp:true}, floors:{squat:225, ohp:90},
  plates:[45,35,25,10,5], bar:45, blockStart:"2026-09-14", detrained:{}
};

writeFileSync(new URL("./synthetic.json", import.meta.url), JSON.stringify({profile, sessions:S}, null, 1) + "\n");
console.log("wrote", S.length, "sessions");
