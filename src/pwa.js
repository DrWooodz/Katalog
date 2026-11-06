/* Registers the service worker (sw.js) so the app installs to the home screen and works offline.
   Updates are picked up in the background; the new code runs from the next launch. */
export function registerSW(){
  if (!("serviceWorker" in navigator) || location.protocol === "file:") return;
  window.addEventListener("load", ()=>{ navigator.serviceWorker.register("sw.js").catch(()=>{}); });
}
