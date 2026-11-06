/* IndexedDB, the smallest wrapper that works: one database, two object stores.
   sessions: one record per session, keyed by its id (same objects the Claude artifact kept in data/users/<id>/profile/sessions)
   kv:       "profile" (the training profile) and "body" (the simulator's record), stored as {k, v}
   No logic lives here; store.js decides what to read and write. */
const DB_NAME = "katalog", DB_VERSION = 1;
let dbp = null;

export function openDB(){
  if (dbp) return dbp;
  dbp = new Promise((res, rej)=>{
    if (typeof indexedDB === "undefined"){ rej(new Error("IndexedDB is not available")); return; }
    const rq = indexedDB.open(DB_NAME, DB_VERSION);
    rq.onupgradeneeded = ()=>{
      const db = rq.result;
      if (!db.objectStoreNames.contains("sessions")) db.createObjectStore("sessions", {keyPath:"id"});
      if (!db.objectStoreNames.contains("kv")) db.createObjectStore("kv", {keyPath:"k"});
    };
    rq.onsuccess = ()=> res(rq.result);
    rq.onerror = ()=> rej(rq.error);
    rq.onblocked = ()=> rej(new Error("The database is open in another tab with an older version. Close other Katalog tabs."));
  });
  dbp.catch(()=>{ dbp = null; });
  return dbp;
}
function tx(store, mode, fn){
  return openDB().then(db=>new Promise((res, rej)=>{
    const t = db.transaction(store, mode), os = t.objectStore(store);
    let out; const r = fn(os); if (r) r.onsuccess = ()=>{ out = r.result; };
    t.oncomplete = ()=> res(out);
    t.onerror = ()=> rej(t.error);
    t.onabort = ()=> rej(t.error || new Error("aborted"));
  }));
}
export const getAllSessions = () => tx("sessions", "readonly", os=>os.getAll()).then(a=>a || []);
export const putSession = s => tx("sessions", "readwrite", os=>os.put(s));
export const deleteSessionRec = id => tx("sessions", "readwrite", os=>os.delete(id));
export const getKV = k => tx("kv", "readonly", os=>os.get(k)).then(r=>r ? r.v : null);
export const putKV = (k, v) => tx("kv", "readwrite", os=>os.put({k, v}));
/* many sessions in one transaction (import): all or nothing */
export function putSessions(list){
  return openDB().then(db=>new Promise((res, rej)=>{
    const t = db.transaction("sessions", "readwrite"), os = t.objectStore("sessions");
    list.forEach(s=>os.put(s));
    t.oncomplete = ()=> res(list.length);
    t.onerror = ()=> rej(t.error);
    t.onabort = ()=> rej(t.error || new Error("aborted"));
  }));
}
