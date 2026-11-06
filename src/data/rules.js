/* The training rules, as numbers. The progression code (src/logic/) and the Method tab (src/data/playbook.js) both read
   them from here, so what Method says is what the app does. Change a number here and both follow.
   Values are exactly those of Send Log v32; tests/progression.test.js pins the behaviour. */

/* bar jumps after a clean top triple, when your plates allow them (lb) */
export const JUMP = {upper:5, lower:10};
/* top set: reps, the rep ceiling when plates force reps-first progression, and what a miss does */
export const TOP_REPS_MAX = 5;
export const TOP = {reps:3, firstPct:0.89, soSoPct:0.95, missesToDrop:2, dropTo:0.925, returnGapDays:10, stallTops:3};
/* back-offs: % of working max, sets, and the step down after unclean back-offs */
export const BACKOFF = {pct:0.8, sets:2, missStep:5};
export const BO_REPS = {bench:5, dead:4, squat:5, ohp:8};
/* working max: best e1RM (Epley) from clean sets of up to maxReps, in your last `sessions` sessions within `days` */
export const WORKMAX = {days:42, sessions:3, maxReps:10};
/* re-entry ramp for a lift with no heavy work in `lapseDays` (or marked out of practice) */
export const REENTRY = {lapseDays:42, startPct:0.70, untilPct:0.85, reps:5, sets:3};
/* maintenance (only when a plan lists maintenance lifts), deload week, and max-based mode */
export const MAINT = {topPct:0.87, backoffPct:0.85};
export const DELOAD = {topPct:0.85, backoffSets:1, accSets:2, hangs:3, limitPct:0.6, days:6};
export const MAXMODE = {topPct:0.89, backoffPct:0.8};
/* accessories: [main lift, start % of its max, cap % of working max, rep range low, high] */
export const ACC_PLAN = {"RDL":["dead",0.55,0.6,6,8], "Legs-up bench":["bench",0.65,0.7,6,8]};
export const ACC_SETS = 3;
/* pulling: bodyweight reps first (lo -> hi), then added load; fast pull-ups capped at a share of bodyweight; the row */
export const PULL_BW = {lo:5, hi:8};
export const PULLING = {addStep:5, addedLo:3, addedHi:5, sets:3, fastSets:5, fastReps:3, fastCapBW:0.10, rowLo:8, rowHi:10, rowStartPct:0.5, rowMinJump:5};
/* max hangs: earn hangs lo -> hi at a load, then one plate; B is a share of A's total load; light after a gap */
export const HANGS = {lo:4, hi:6};
export const HANG = {secs:10, bPct:0.8, returnGapDays:10, testEveryDays:42};
/* wrist block curls: reps first, then one dumbbell step; pain limits (0-10) */
export const WRIST = {step:5, painUp:2, painDown:5, stepDownPct:0.8, top:{1:12, 2:10, 3:10}, sets:{1:3, 2:4, 3:4}, advanceSessions:6, calmSessions:3, leanSecs:30};
/* handstands: move up after meeting the level's criterion in 2 of the last 3, with wrist pain at most painOk; drop at painDrop */
export const HAND = {need:2, of:3, painOk:3, painDrop:4};
/* days between plan days of a kind */
export const GAPS = {bench:2, dead:4, finger:2};
/* limit bouldering: a grade is solid with `sends` sends in `tries` tries or fewer within `days` days */
export const SOLID = {sends:2, tries:3, days:90};

/* text helpers for Method: 0.925 -> "7.5", 0.8 -> "80" */
export const pctOff = x => String(Math.round((1-x)*1000)/10);
export const pct = x => String(Math.round(x*1000)/10);
