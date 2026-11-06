import { S } from "../core/state.js";
import { lsSet, toast } from "../core/util.js";
import { saveProfile } from "../store/store.js";
import { render } from "./render.js";

/* ---------- skins ---------- */
export const SKINS = {
  chalk:{name:"Chalk", desc:"Default. Follows your light or dark setting.", sw:["#eceff2","#1d4fc4","#14181d"]},
  ink:{name:"Ink Blade", desc:"Sumi ink, rice paper and a vermilion seal.", sw:["#0c0c0e","#e2452f","#ece8df"]},
  arcade:{name:"Arcade", desc:"Neon CRT with scanlines. Pixel type.", sw:["#0a0720","#33e1ff","#4dff9a"]},
  summit:{name:"Summit", desc:"Topo lines, forest green and granite.", sw:["#e9ede4","#2f6b4f","#1d2a22"]}
};
export const SKIN_TEXT = {
  chalk:{saved:"Session saved", next:"Up next"},
  ink:{saved:"Recorded in the scroll", next:"Next strike"},
  arcade:{saved:"Save point reached", next:"Next stage"},
  summit:{saved:"Logged at basecamp", next:"Next pitch"}
};
export const skinKey = () => SKINS[S.profile.skin] ? S.profile.skin : "chalk";
export function skinText(k){ return (SKIN_TEXT[skinKey()]||SKIN_TEXT.chalk)[k] || SKIN_TEXT.chalk[k]; }
export function applySkin(){ const k = skinKey(); document.documentElement.dataset.skin = k; lsSet("sl.skin", k); }
export function setSkin(k){ S.profile.skin = k; applySkin(); saveProfile(); render(); toast(SKINS[k].name+" skin"); }
