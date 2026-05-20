/**
 * StorageManager.js
 * =================================================================
 * כל שכבת האחסון של האפליקציה:
 *
 *   localStorage   tsm_u    — משתמשים
 *                  tsm_proj — פרויקטים
 *                  tsm_c    — קופונים
 *                  tsm_pr   — מחירים
 *   IndexedDB      TreePhotosDB — תמונות ללא הגבלת גודל
 *   Supabase       users / registrations — ענן (אופציונלי)
 *
 * להוספת שדה אחסון חדש:
 *   הוסף זוג gXxx() / sXxx() בדפוס הקיים.
 *   השתמש בקידומת 'tsm_' למפתחות localStorage.
 * =================================================================
 */

// Storage helpers

// Legacy local helpers (used only for admin session caching)
function gUsers() { try{return JSON.parse(localStorage.getItem('tsm_u')||'{}');}catch(e){return{};} }
function sUsers(u) { localStorage.setItem('tsm_u',JSON.stringify(u)); }
function gCoupons() { try{return JSON.parse(localStorage.getItem('tsm_c')||'{}');}catch(e){return{};} }
function sCoupons(c) { localStorage.setItem('tsm_c',JSON.stringify(c)); }

// ── Supabase credentials ──
// Configure your own Supabase project at https://supabase.com
const SB_DEFAULT_URL = 'YOUR_SUPABASE_PROJECT_URL';
const SB_DEFAULT_KEY = 'YOUR_SUPABASE_ANON_KEY';

function sbConfig() {
  return {
    url: localStorage.getItem('tsm_sb_url') || SB_DEFAULT_URL,
    key: localStorage.getItem('tsm_sb_key') || SB_DEFAULT_KEY
  };
}
function sbReady() { const s=sbConfig(); return !!(s.url&&s.key&&s.url!=='YOUR_SUPABASE_PROJECT_URL'); }
function sbClient() {
  const s=sbConfig();
  return supabase.createClient(s.url, s.key);
}
// Generic Supabase DB helper
// Usage: sbDB('users').getAll(), sbDB('users').getBy('username','yossi'), etc.
function sbDB(table) {
  const db = sbClient();
  return {
    async getAll(filters) {
      let q = db.from(table).select('*');
      if(filters) Object.entries(filters).forEach(([k,v]) => { q = q.eq(k,v); });
      const {data,error} = await q;
      if(error) throw new Error(error.message);
      return data||[];
    },
    async getOne(filters) {
      const rows = await this.getAll(filters);
      return rows[0]||null;
    },
    async insert(body) {
      const {data,error} = await db.from(table).insert(body).select();
      if(error) throw new Error(error.message);
      return data;
    },
    async upsert(body, onConflict) {
      const {data,error} = await db.from(table).upsert(body,{onConflict}).select();
      if(error) throw new Error(error.message);
      return data;
    },
    async update(filters, body) {
      let q = db.from(table).update(body);
      Object.entries(filters).forEach(([k,v]) => { q = q.eq(k,v); });
      const {error} = await q;
      if(error) throw new Error(error.message);
    },
    async delete(filters) {
      let q = db.from(table).delete();
      Object.entries(filters).forEach(([k,v]) => { q = q.eq(k,v); });
      const {error} = await q;
      if(error) throw new Error(error.message);
    }
  };
}
// Legacy sbReq for registrations (backward compat)
async function sbReq(path, method, body) {
  const db = sbDB('registrations');
  if(method==='POST') return db.insert(body);
  if(method==='PATCH') {
    const m=path.match(/id=eq\.([^&]+)/);
    if(m) return db.update({id:m[1]},body);
  }
  const filters={};
  if(path.includes('status=eq.pending')) filters.status='pending';
  return db.getAll(filters);
}
// Legacy localStorage fallback for pending (used before Supabase connected)
function gPendingLocal() { try{return JSON.parse(localStorage.getItem('tsm_p')||'[]');}catch(e){return[];} }
function sPendingLocal(p) { localStorage.setItem('tsm_p',JSON.stringify(p)); }
function gPrices() { try{return JSON.parse(localStorage.getItem('tsm_pr')||'{"monthly":0,"yearly":0}');}catch(e){return{monthly:0,yearly:0};} }
function sPrices(p) { localStorage.setItem('tsm_pr',JSON.stringify(p)); }

// User-scoped project storage
// ═══ INDEXEDDB — אחסון תמונות ללא הגבלה ═══
const _IDB = { name:'TreePhotosDB', ver:1, store:'photos', _db:null };
function _idbOpen() {
  return new Promise((res,rej) => {
    if (_IDB._db) return res(_IDB._db);
    const req = indexedDB.open(_IDB.name, _IDB.ver);
    req.onupgradeneeded = e => e.target.result.createObjectStore(_IDB.store);
    req.onsuccess = e => { _IDB._db = e.target.result; res(_IDB._db); };
    req.onerror = e => rej(e);
  });
}
function idbSave(projId, photos) {
  return _idbOpen().then(db => new Promise((res,rej) => {
    const tx = db.transaction(_IDB.store,'readwrite');
    tx.objectStore(_IDB.store).put(photos, projId);
    tx.oncomplete = res; tx.onerror = rej;
  }));
}
function idbLoad(projId) {
  return _idbOpen().then(db => new Promise((res,rej) => {
    const req = db.transaction(_IDB.store,'readonly').objectStore(_IDB.store).get(projId);
    req.onsuccess = e => res(e.target.result || null);
    req.onerror = rej;
  }));
}
function idbDel(projId) {
  return _idbOpen().then(db => new Promise((res,rej) => {
    const tx = db.transaction(_IDB.store,'readwrite');
    tx.objectStore(_IDB.store).delete(projId);
    tx.oncomplete = res; tx.onerror = rej;
  }));
}

function getProjects() {
  if(!CU) return {};
  try{return JSON.parse(localStorage.getItem('tp_'+CU)||'{}');}catch(e){return{};}
}
function saveProjects(p) {
  if(!CU) return;
  // שמור ללא תמונות עצים — הן ב-IndexedDB
  const slim = {};
  for (const id in p) {
    const proj = Object.assign({}, p[id]);
    delete proj.photos;
    slim[id] = proj;
  }
  try { localStorage.setItem('tp_'+CU, JSON.stringify(slim)); }
  catch(e) { alert('❌ שגיאת שמירה: אחסון מלא. נסה למחוק פרויקטים ישנים.'); }
  // Sync to Supabase (async, non-blocking)
  _syncProjectsToSupabase(slim).catch(()=>{});
}

async function _syncProjectsToSupabase(slim) {
  try {
    const json = JSON.stringify(slim);
    await sbDB('projects').upsert({username: CU, data: json}, 'username');
  } catch(e) { /* silent fail — localStorage is the source of truth */ }
}

async function _loadProjectsFromSupabase() {
  try {
    const row = await sbDB('projects').getOne({username: CU});
    if (!row || !row.data) return;
    const remote = JSON.parse(row.data);
    const local = getProjects();
    // Merge per-project: take the one with later lastModified
    const merged = Object.assign({}, local);
    for (const id in remote) {
      const r = remote[id], l = local[id];
      if (!l || (r.lastModified || 0) >= (l.lastModified || 0)) {
        merged[id] = r;
      }
    }
    localStorage.setItem('tp_'+CU, JSON.stringify(merged));
  } catch(e) { /* silent fail */ }
}
function getProject(id) { return getProjects()[id]||null; }
function putProject(id,data) { const p=getProjects(); p[id]=data; saveProjects(p); }
function deleteProject(id) {
  const p = getProjects();
  delete p[id];
  saveProjects(p);
  idbDel(id).catch(() => {});
}

/* ── Namespace (לתיעוד ו-IDE) ── */
const StorageManager = {
  gUsers, sUsers, gCoupons, sCoupons, gPrices, sPrices,
  gPendingLocal, sPendingLocal,
  getProjects, saveProjects, getProject, putProject, deleteProject,
  sbConfig, sbReady, sbClient, sbDB,
  idbSave, idbLoad, idbDel,
};
