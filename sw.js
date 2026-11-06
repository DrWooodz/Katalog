/* Katalog service worker: the app works offline after the first visit.
   - App shell (everything in SHELL): precached on install, then served from cache and refreshed in the background
     (stale-while-revalidate), so a new deploy reaches the phone on the launch after next without any version bump.
   - Pose model (pose/*, 16 MB) and CDN files (TensorFlow.js, Google Fonts): cached the first time they are used.
   SHELL must list every file under src/, css/ and icons/; test/sw.test.js fails if it doesn't. */
const VERSION = "2026-11-06.4";
const SHELL_CACHE = "katalog-shell-" + VERSION;
const RUNTIME = "katalog-runtime-1";
const SHELL = [
  "./", "index.html", "manifest.webmanifest",
  "css/app.css", "css/skins.css",
  "icons/apple-touch-icon.png", "icons/favicon-32.png", "icons/icon-192.png", "icons/icon-512.png",
  "src/main.js", "src/pwa.js", "src/version.js",
  "src/core/state.js", "src/core/util.js",
  "src/data/compendium.js", "src/data/plans.js", "src/data/playbook.js", "src/data/refs.js", "src/data/rules.js", "src/data/types.js",
  "src/events/backup.js", "src/events/change.js", "src/events/click.js",
  "src/frozen/film.js", "src/frozen/sim-bridge.js", "src/frozen/sim-log.js", "src/frozen/sim.js", "src/frozen/stats-model.js",
  "src/logic/climb.js", "src/logic/draft.js", "src/logic/engine.js", "src/logic/plan.js", "src/logic/profile.js", "src/logic/progression.js", "src/logic/sets.js",
  "src/logic/status.js", "src/logic/week.js", "src/logic/wrist.js",
  "src/store/db.js", "src/store/store.js",
  "src/tabs/history.js", "src/tabs/limit.js", "src/tabs/log-form.js", "src/tabs/log.js", "src/tabs/method.js",
  "src/tabs/plan.js", "src/tabs/setup.js", "src/tabs/stats.js", "src/tabs/today.js",
  "src/ui/charts.js", "src/ui/live.js", "src/ui/plates.js", "src/ui/render.js", "src/ui/skins.js", "src/ui/tips.js"
];
const CDN = /^https:\/\/(cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com)\//;

self.addEventListener("install", e=>{
  e.waitUntil(caches.open(SHELL_CACHE).then(c=>c.addAll(SHELL.map(u=>new Request(u, {cache:"reload"})))).then(()=>self.skipWaiting()));
});
/* Other apps on this origin (drwooodz.github.io, e.g. DaCapo) can delete every cache but their own when they update.
   The page asks on each launch; if the app shell cache is gone or partial, it is filled again. */
self.addEventListener("message", e=>{
  if (!e.data || e.data.type !== "ensure-cache") return;
  e.waitUntil(caches.open(SHELL_CACHE).then(c=>c.keys().then(k=>k.length >= SHELL.length || c.addAll(SHELL))).catch(()=>{}));
});
self.addEventListener("activate", e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith("katalog-shell-") && k!==SHELL_CACHE).map(k=>caches.delete(k))))
    .then(()=>self.clients.claim()));
});

/* serve the cached copy now, refresh the cache for next time */
function swr(req, key){
  return caches.open(SHELL_CACHE).then(c=>c.match(key || req, {ignoreSearch:true}).then(hit=>{
    const net = fetch(req).then(r=>{ if (r && r.ok) c.put(key || req, r.clone()); return r; });
    if (hit){ net.catch(()=>{}); return hit; }
    return net;
  }));
}
/* cache first, fetch once (large or versioned files) */
function cacheFirst(req){
  return caches.open(RUNTIME).then(c=>c.match(req).then(hit=>hit || fetch(req).then(r=>{ if (r && (r.ok || r.type==="opaque")) c.put(req, r.clone()); return r; })));
}

self.addEventListener("fetch", e=>{
  const req = e.request; if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin){
    /* opening the app (its folder or index.html) gets the app shell; opening any other file shows that file */
    const appPage = /\/(index\.html)?$/.test(url.pathname);
    if (req.mode === "navigate" && appPage){ e.respondWith(swr(req, "index.html").catch(()=>caches.match("index.html", {ignoreSearch:true}))); return; }
    if (url.pathname.includes("/pose/")){ e.respondWith(cacheFirst(req)); return; }
    e.respondWith(swr(req)); return;
  }
  if (CDN.test(req.url)) e.respondWith(cacheFirst(req));
});
