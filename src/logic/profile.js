/* A saved profile merged over the defaults, so older profiles missing newer keys still work. Pure. */
import { DEFAULT_PROFILE } from "../data/types.js";

export function mergeProfile(p){
  const base = JSON.parse(JSON.stringify(DEFAULT_PROFILE));
  if (!p) return base;
  return Object.assign(base, p, {oneRM:Object.assign(base.oneRM, p.oneRM||{}), goals:Object.assign(base.goals, p.goals||{})});
}
