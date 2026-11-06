/* Entry point. Importing the event and UI modules registers their listeners; then the store loads and the app draws. */
import { S } from "./core/state.js";
import { SIM_BRIDGE } from "./frozen/sim-bridge.js";
import { initStore, storeReady } from "./store/store.js";
import { liveBar, liveOn, wake } from "./ui/live.js";
import "./ui/tips.js";
import "./events/click.js";
import "./events/change.js";
import { registerSW } from "./pwa.js";

/* ---------- boot ---------- */
storeReady.then(()=>SIM_BRIDGE.loadBody()).catch(()=>{});
if (!S.profile.blockStart) S.profile.blockStart = "";
initStore();
liveBar(); if (liveOn()) wake(true);
registerSW();
