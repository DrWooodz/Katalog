/* Registers the service worker (sw.js) so the app installs to the home screen and works offline.
   Updates are picked up in the background; the new code runs from the next launch. */
export function registerSW(){
  if (!("serviceWorker" in navigator) || location.protocol === "file:") return;
  window.addEventListener("load", ()=>{
    navigator.serviceWorker.register("sw.js").catch(()=>{});
    /* refill the offline cache if another app on this origin cleared it */
    navigator.serviceWorker.ready.then(r=>{ if (r.active) r.active.postMessage({type:"ensure-cache"}); }).catch(()=>{});
  });
}
