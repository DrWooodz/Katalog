/* Goal tiers, the weekly floor, plan days (PDAY), plans (PLANS: Foundation + old examples), coverage rule, wrist phases, handstand levels. */
import { WRIST } from "./rules.js";

/* ---------- goals, floor and plans (v31) ----------
   Plans are data. The engine reads the current plan's lifts, targets, days and end conditions from here; nothing about a
   specific plan is written into the progression logic, so a future plan editor can create, copy and edit these objects. */
export const GOAL_TIERS = [
  {tier:"Primary", note:"no order among them", goals:[
    {id:"tendon", name:"Tendon health and longevity", note:"Higher tissue capacity and no sudden load spikes; lifelong ability to move"},
    {id:"dead", name:"Deadlift"}, {id:"bench", name:"Bench"},
    {id:"boulder", name:"Bouldering grade and ability"}]},
  {tier:"Secondary", note:"in this order; they rotate through the year", goals:[
    {id:"hand", name:"Handstands"}, {id:"ohp", name:"OHP"}, {id:"squat", name:"Squat"}]},
  {tier:"Tertiary", note:"", goals:[{id:"cardio", name:"Cardio and the rest"}]}
];
export const GOAL_NAME = {};
GOAL_TIERS.forEach(t=>t.goals.forEach(g=>{ GOAL_NAME[g.id] = g.name; }));
export const GOAL_TIER = {};
GOAL_TIERS.forEach(t=>t.goals.forEach(g=>{ GOAL_TIER[g.id] = t.tier; }));
/* the floor: always on, whatever the plan. Reminders only; nothing is ever blocked by it. */
export const FLOOR = [
  {id:"lift", label:"Lifting session", min:1},
  {id:"climb", label:"Climbing session", min:1},
  {id:"hangs", label:"Hangs", min:2},
  {id:"wrist", label:"Wrist / elbow heavy-slow work", min:2}
];
/* a plan day: rows = [lift, role, {sets, reps}?]; hangs "A" heavy, "B" light, "" none; items say which goal each part serves */
export const PDAY = {
  bench:{id:"bench", type:"bench", name:"Heavy bench", rows:[["Bench","top"],["Bench","backoff"],["Weighted pull-up","acc"]], hangs:"", wrist:true, hs:false, climb:false,
    items:[{what:"Bench: heavy triple + back-offs", goals:["bench"]},{what:"Weighted pull-ups", goals:["boulder"]},{what:"Wrist / elbow heavy-slow block, at the end", goals:["tendon","hand"]}]},
  limit:{id:"limit", type:"limit", name:"Limit bouldering + hangs A", rows:[], hangs:"A", wrist:false, hs:false, climb:true,
    items:[{what:"Max hangs A (heavy), after the warm-up and before climbing", goals:["tendon","boulder"]},{what:"Limit bouldering at solid +1 to +2 grades", goals:["boulder"]}]},
  dead:{id:"dead", type:"dead", name:"Heavy deadlift", rows:[["Deadlift","top"],["Deadlift","backoff"],["Legs-up bench","acc"]], hangs:"", wrist:true, hs:false, climb:false,
    items:[{what:"Deadlift: heavy triple + back-offs", goals:["dead"]},{what:"Legs-up bench (the one light upper accessory; nothing else heavy)", goals:["bench"]},{what:"Wrist / elbow heavy-slow block, at the end", goals:["tendon","hand"]}]},
  vol:{id:"vol", type:"bench", name:"Bench volume + hangs B + easy climbing", rows:[["Bench","backoff",{sets:3}]], hangs:"B", wrist:false, hs:true, climb:true,
    items:[{what:"Bench volume: 3×5 at ~80%", goals:["bench"]},{what:"Max hangs B (~80% of A)", goals:["tendon","boulder"]},{what:"Easier climbing", goals:["boulder"]},{what:"Short handstand practice", goals:["hand"]}]},
  bench3:{id:"bench3", type:"bench", name:"Heavy bench + hangs B + easy climbing", rows:[["Bench","top"],["Bench","backoff"],["Weighted pull-up","acc"]], hangs:"B", wrist:true, hs:true, climb:true,
    items:[{what:"Bench: heavy triple + back-offs", goals:["bench"]},{what:"Weighted pull-ups", goals:["boulder"]},{what:"Max hangs B (~80% of A)", goals:["tendon","boulder"]},{what:"Easier climbing + short handstand practice", goals:["boulder","hand"]},{what:"Wrist / elbow heavy-slow block, at the end", goals:["tendon","hand"]}]},
  easy:{id:"easy", type:"light", name:"Easy climbing or aerobic", rows:[], hangs:"", wrist:false, hs:true, climb:true, optional:true,
    items:[{what:"Easy climbing, or 20–40 min easy aerobic", goals:["boulder","cardio"]},{what:"Short handstand practice", goals:["hand"]}]}
};
export const PLANS = {
  foundation:{id:"foundation", name:"Foundation", weeks:{min:12, cap:16},
    summary:"Bench and deadlift toward the stepping-stone targets while building tendon capacity. Bouldering every week; handstands are the one secondary goal.",
    emphasis:["bench","dead","tendon"], alwaysOn:["boulder"], secondary:["hand"],
    lifts:{bench:{target:{w:285,r:3}, longTerm:{w:315,r:3}}, dead:{target:{w:385,r:3}, longTerm:{w:405,r:3}}},
    maint:[], limitZone:[1,2], end:{hits:2, stall:"any", weeks:16},
    rules:["No squat or OHP in this plan: no maintenance sets, no re-entry prompts. The coverage rule brings them into the next plan.",
           "Deadlift day: the deadlift plus one light upper accessory. No other heavy lower-body lift.",
           "Hangs A ride on the limit day (after the warm-up, before climbing); hangs B come at least 48 h later.",
           "Tendons change slowly (~12+ weeks of heavy loading), so consistency beats the exact protocol."],
    days:{3:["dead","limit","bench3"], 4:["bench","limit","dead","vol"], 5:["bench","limit","dead","vol","easy"]}},
  bd:{id:"bd", name:"Bench + Deadlift block (old)", example:true, weeks:{min:8, cap:16},
    summary:"The v30 rotation: bench and deadlift heavy, squat and OHP on weekly maintenance.",
    emphasis:["bench","dead"], alwaysOn:["boulder"], secondary:[],
    lifts:{bench:{target:{w:315,r:3}}, dead:{target:{w:405,r:3}}}, maint:["squat","ohp"], limitZone:[1,2], end:{hits:2, stall:"all", sessions:16},
    rules:["Saved as an example; not active."], days:{4:["bench","limit","dead","vol"]}},
  so:{id:"so", name:"Squat + OHP block (old)", example:true, weeks:{min:8, cap:16},
    summary:"The v30 rotation: squat and OHP heavy, bench and deadlift on weekly maintenance.",
    emphasis:["squat","ohp"], alwaysOn:["boulder"], secondary:[],
    lifts:{squat:{target:{w:405,r:3}}, ohp:{target:{w:135,r:8}}}, maint:["bench","dead"], limitZone:[1,2], end:{hits:2, stall:"all", sessions:16},
    rules:["Saved as an example; not active. Its squat and OHP days were never laid out as plan days."], days:{}}
};
/* the coverage rule: secondary goals a plan leaves out are recommended for the next one, in tier order */
export const COVERAGE = ["hand","ohp","squat"];
export const REGION = {bench:"press", ohp:"press", dead:"back", squat:"back"};
/* ---------- wrist + handstand structure ---------- */
export const WRIST_PHASES = {
  1:{name:"Foundation", items:"Wrist extension + flexion curls 3×8–12 (3 s lowering) · deviation 2×12 each way · iso extension pulses 30×2 s · quadruped wrist rocks 3×10", advance:WRIST.advanceSessions+" sessions in phase, last "+WRIST.calmSessions+" with wrist pain ≤"+WRIST.painUp+"/10, curls at "+WRIST.sets[1]+"×"+WRIST.top[1]},
  2:{name:"Loaded extension", items:"Heavier curls 4×6–10, 3 s up / 3 s down · iso pulses 30×2 s · planche leans 3×20–30 s · push-up-position wrist rocks 3×10", advance:WRIST.advanceSessions+" sessions in phase, pain ≤"+WRIST.painUp+"/10, leans held "+WRIST.leanSecs+" s with straight arms"},
  3:{name:"Capacity", items:"Curls 4×6–8 heavy-slow · deeper planche leans 4×20–30 s · wall-handstand weight shifts 3×30 s · iso pulses 30×2 s", advance:"Maintenance: keep 2×/week, add load by double progression"}
};
export const HS_LEVELS = {
  1:{name:"Chest-to-wall hold", rx:"4–6 holds of 20–45 s, 60–90 s rest", crit:"best ≥ 60 s", test:(b)=>b>=60},
  2:{name:"Wall toe-taps / heel pulls", rx:"8–12 tries: pull off the wall and balance, tap back when lost", crit:"best ≥ 15 s off the wall", test:(b)=>b>=15},
  3:{name:"Freestanding kick-ups", rx:"10–15 kick-ups, cartwheel out to bail, rest 30–60 s", crit:"best ≥ 10 s freestanding", test:(b)=>b>=10},
  4:{name:"Freestanding holds", rx:"5–8 holds, aim 15–30 s, stop when line breaks", crit:"best ≥ 30 s", test:(b)=>b>=30},
  5:{name:"Lines + variations", rx:"Holds plus shoulder taps, tuck/straddle shapes, 8–10 min", crit:"open-ended", test:()=>false}
};
