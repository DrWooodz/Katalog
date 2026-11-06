/* Method tab movement compendium. */
/* Movement compendium: worthwhile movements, whether or not the plan uses them today.
   [name, status, grade, note]. status: "plan" = programmed now, "swap" = a sensible substitute, "option" = situational.
   Grades follow GRADE_LABEL; most movement-choice calls are coaching convention, and the sheet says so. */
export const COMPENDIUM = [
 {g:"Squat pattern", items:[
  ["Back squat","option","conv","Secondary goal. Not in Foundation; the coverage rule brings it into a later plan, starting with a test day (max unknown, floor 225)."],
  ["Front squat","swap","conv","More upright, lower max load, less back demand per rep. Swap when the low back is flagged."],
  ["Pause squat","option","conv","Fixes the bottom position and bracing; use if the hole is the weak point."],
  ["Bulgarian split squat","option","conv","One leg at a time, little spinal load. Good when the back needs a break from axial loading."]]},
 {g:"Hip hinge", items:[
  ["Conventional deadlift","plan","conv","Primary goal: target 385×3 in Foundation, 405×3 long-term. Heavy triple plus back-offs."],
  ["Romanian deadlift (RDL)","option","conv","Accessory at ~55% of deadlift max; builds hamstrings and hinge without a floor pull. Not in Foundation."],
  ["Trap-bar deadlift","swap","conv","A lower-demand heavy pull when the barbell pull is unwelcome. Does not replace the barbell goal."],
  ["Sumo deadlift","option","conv","Different leverage; only if a stance change suits the body."],
  ["Hip thrust","option","conv","Glute strength with little back fatigue."]]},
 {g:"Horizontal press", items:[
  ["Flat barbell bench","plan","conv","Primary goal: target 285×3 in Foundation, 315×3 long-term. Heavy triple plus 80% back-offs, and a volume day."],
  ["Legs-up bench","plan","conv","Deadlift-day accessory (the one light upper accessory there); removes leg drive so the chest and triceps do the work."],
  ["Paused bench","option","conv","Builds the bottom position; use for off-the-chest sticking points."],
  ["Dumbbell bench / floor press","option","conv","Easier on shoulders; floor press trains lockout."],
  ["Weighted push-up","option","conv","Pressing with no bench or rack, and scapular control."]]},
 {g:"Vertical press", items:[
  ["Overhead press (OHP)","option","conv","Secondary goal. Not in Foundation; comes back via the coverage rule, starting with a test day (max unknown, floor 90)."],
  ["Landmine press","swap","conv","Shoulder-friendly angle when overhead pressing bothers the joint."],
  ["Handstand push-up","option","conv","Ties into the handstand and wrist block once freestanding holds are solid."]]},
 {g:"Vertical pull", items:[
  ["Weighted pull-up (heavy)","plan","conv","Bodyweight reps first (3×5 → 3×8), then added weight 3×3–5; main vertical pulling strength. Heavy bench days."],
  ["Fast pull-up","option","mech","Light, max-speed intent; trains rate of force. Frozen feature, not in Foundation. Intent to move fast drives speed adaptations (see Pulling)."],
  ["Chin-up","option","conv","Supinated grip, more biceps; fine as a swap if elbows dislike the pronated grip."],
  ["Lat pulldown","swap","conv","For volume or when pull-ups are not available; no better than pull-ups for climbing."],
  ["Archer / one-arm negatives","option","conv","Climbing-flavoured but heavy on elbows and fingers. Only after weighted pull-ups are strong and pain-free."]]},
 {g:"Horizontal pull", items:[
  ["Bent-over barbell row","option","mech","3×8–10 accessory. Not in Foundation, which keeps deadlift day light. Trunk and lumbar demand differ between row styles (see Pulling)."],
  ["Chest-supported row","swap","mech","Takes the low back out of it; use when the back is flagged or after heavy pulls."],
  ["One-arm dumbbell row","option","conv","Unilateral and easy to load; checks left/right differences."],
  ["Inverted row","option","conv","Bodyweight, low fatigue; good on deload weeks."]]},
 {g:"Shoulder and scapular health", items:[
  ["Face pull / band pull-apart","option","conv","High-rep rear-delt and rotator work as a warm-up or finisher."],
  ["Scapular pull-ups","option","conv","Teaches the first part of a pull-up and loads the shoulder gently."]]},
 {g:"Fingers and grip", items:[
  ["Max hangs (half crimp)","plan","trial","Two sessions a week. 100% and 80% loads each raised finger strength in advanced climbers.",["dev","her"]],
  ["Repeaters / low-load hangs","option","obs","Low-intensity finger loading added to max-hang gains in app data. Not randomized.",["gil"]],
  ["Farmer carry","option","conv","General grip and trunk work with little finger stress."],
  ["Campus board","option","conv","High finger load. Not until hang strength is established and fingers are healthy."]]},
 {g:"Wrist and handstand", items:[
  ["Wrist curls and iso pulses","plan","trial","The block builds wrist capacity; isometric extension training raised grip force.",["shi"]],
  ["Handstand progression","plan","conv","Levels from chest-to-wall to freestanding lines."]]},
 {g:"Trunk and bracing", items:[
  ["Belt-cued or 360° bracing drills","option","conv","You noted bracing/breathing as a limiter on a heavy day. Practice on warm-up sets before adding load."],
  ["Pallof press / dead bug","option","conv","Anti-rotation and rib-pelvis control; cheap, low fatigue."],
  ["Hanging knee raise","option","conv","Hip-flexor and abdominal strength for steep climbing."]]},
 {g:"Conditioning", items:[
  ["Zone 2 (easy run or bike)","option","trial","Tertiary goal; the 5-day layout of Foundation has a slot for it. Endurance work alongside strength did not reduce max strength in a meta-analysis.",["sch","spi"]],
  ["Sprints","option","conv","Very short, fully rested; only when legs and fingers are fresh. Never before limit climbing or heavy deadlifts."],
  ["Easy traversing / light volume climbing","option","conv","Movement volume at low strain; doubles as active recovery."]]},
 {g:"Climbing", items:[
  ["Limit bouldering","plan","conv","Skill and power at the edge of ability. Volume follows your own log."],
  ["Light climbing","plan","conv","Low-strain movement volume and variety."]]}
];
