export const TYPES = {
  bench:{label:"Bench + fingers", short:"Bench", c:"var(--t-bench)"},
  dead:{label:"Deadlift + fingers", short:"Deadlift", c:"var(--t-dead)"},
  limit:{label:"Limit bouldering", short:"Limit", c:"var(--t-limit)"},
  light:{label:"Light climbing + fingers", short:"Light climb", c:"var(--t-light)"},
  squat:{label:"Squat focus", short:"Squat", c:"var(--t-squat)"},
  ohp:{label:"Overhead press focus", short:"OHP", c:"var(--t-ohp)"},
  other:{label:"Other / mixed", short:"Other", c:"var(--t-other)"}
};
export const LIFTS = ["Bench","Deadlift","Squat","OHP","RDL","Tempo deadlift","Legs-up bench","Tempo bench","Weighted pull-up","Fast pull-up","Bent-over row","Other"];
/* Pulling work. Pull-up loads are ADDED weight (0 = bodyweight); the row is a barbell lift. All three are accessory-role rows. */
export const PULL = {"Weighted pull-up":{mode:"heavy"}, "Fast pull-up":{mode:"fast"}, "Bent-over row":{mode:"row"}};
export const MAIN = {Bench:"bench",Deadlift:"dead",Squat:"squat",OHP:"ohp"};
export const GRADES = ["","V0","V1","V2","V3","V4","V5","V6","V7","V8","V9","V10","V11","V12"];
export const PROGRESS = [["","—"],["few","A few moves"],["half","About half"],["moves","All moves, not linked"],["high","Fell near the top"],["sent","Sent"]];
export const PROG_RANK = {"":0,few:1,half:2,moves:3,high:4,sent:5};
export const STYLES = ["","Crimp","Pinch","Sloper","Pocket","Compression","Dyno / coordination","Slab / technical","Steep power"];
export const LIMIT_PLAN = {probs:"4–6", probsMax:6, att:"15–30", attMax:30};
export const DEFAULT_PROFILE = {
  oneRM:{bench:315, dead:405, squat:405, ohp:135},
  goals:{bench:{w:315,r:3}, dead:{w:405,r:3}, squat:{w:405,r:3}, ohp:{w:135,r:8}},
  bw:175, block:"bd", blockStart:"", blockCap:16, edge:20, mode:"adaptive",
  detrained:{squat:true}, skin:"chalk", deloadUntil:"", lastDeload:"", bwLog:[],
  /* v31: the current plan and how many days a week it is laid out for; lifts whose saved max is a placeholder (unknown) and their known floors */
  plan:{id:"foundation", start:"2026-11-04"}, planDays:4,
  unknown:{squat:true, ohp:true}, floors:{squat:225, ohp:90}
};
/* ---------- the model in the log ----------
   Setup cues, missed-set notes and filmed sets use the simulator's helpers (the same file the Build tab loads, fetched only
   when a lift here has a model). They only compute. The one thing they add to your log is a short summary on a set, and only
   when you press Save on a filmed set: reps tracked, rep speeds, speed loss and the reps-in-reserve estimate. The video is never
   uploaded or kept. */
export const SIM_LIFTS = {Bench:1, "Tempo bench":1, "Legs-up bench":1, Deadlift:1, "Tempo deadlift":1, Squat:1, OHP:1, RDL:1, "Bent-over row":1, "Weighted pull-up":1, "Fast pull-up":1};
/* ---------- barbell loading (lb) ---------- */
export const PLATE_SET = [55,45,35,25,15,10,5,2.5,1.25];
export const PLATE_DEF = [45,35,25,10,5,2.5];
/* colours follow the common lb bumper code (55 red, 45 blue, 35 yellow, 25 green, 15 yellow-ish, 10 white), change plates in metal grey */
export const PLATE_LOOK = {55:{c:"#c73a33",h:1,w:12}, 45:{c:"#2d62c2",h:1,w:11}, 35:{c:"#d9a91a",h:.9,w:10}, 25:{c:"#2f9457",h:.8,w:9}, 15:{c:"#c9a63a",h:.68,w:8}, 10:{c:"#ecebe6",h:.58,w:7,lt:1}, 5:{c:"#7d8590",h:.46,w:6}, 2.5:{c:"#9aa2ad",h:.38,w:5}, 1.25:{c:"#b8bec7",h:.32,w:4,lt:1}};
export const BARBELL_LIFTS = {Bench:1, Deadlift:1, Squat:1, OHP:1, RDL:1, "Tempo deadlift":1, "Legs-up bench":1, "Tempo bench":1, "Bent-over row":1};
export const STACK_ORDER = ["bench","dead","light","limit","ohp","squat","other"];
export const PRIORITY = ["bench","dead","squat","ohp","limit","light","other"];
/* the training rules moved to rules.js; re-exported so older imports keep working */
export { TOP_REPS_MAX, HANGS, BO_REPS, PULL_BW, ACC_PLAN } from "./rules.js";
