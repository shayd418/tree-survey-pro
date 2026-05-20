/**
 * AuthManager.js
 * =================================================================
 * ניהול זהויות:
 *   doLogin()        — כניסה למערכת
 *   doLogout()       — יציאה וניקוי סשן
 *   doRegister()     — הרשמת משתמש חדש + Supabase
 *   resumeSession()  — שחזור סשן אוטומטי
 *   applyRegCoup()   — אימות קופון בהרשמה
 *   selPlan()        — בחירת מנוי
 *   showHomeChgPass() / doHomeChgPass() — שינוי סיסמא
 *
 * State: CU (current user) — מוגדר בחלק זה
 * Storage functions (sbDB, gUsers, idbSave...) — ב-StorageManager.js
 *
 * להוספת OAuth: הוסף doSocialLogin(provider) + supabase.auth.signInWithOAuth()
 * להוספת שדה הרשמה: הוסף ב-doRegister() לאובייקט המשתמש
 * =================================================================
 */

//  AUTH SYSTEM
// ════════════════════════════════════════════════════════════════
const ADMIN_USER = 'admin';
// Hashed admin passwords (SHA-256). Multiple passwords supported.
// To generate a hash: https://emn178.github.io/online-tools/sha256.html
// Replace with your own hashed password before deploying.
const ADMIN_PASS_HASHES = [
  // Add your SHA-256 password hashes here
  // Example: hash of "changeme123" = 'e3b2....' (generate your own)
];

async function _hashPass(pass) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pass));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
}
async function _isAdminPass(pass) {
  const h = await _hashPass(pass);
  return ADMIN_PASS_HASHES.includes(h);
}
let CU = null; // current user


/* ── Auth logic (storage helpers loaded from StorageManager.js) ── */


// Ensure admin exists locally (Supabase seeded on first login attempt)
function ensureAdmin() {
  const u=gUsers();
  if(!u[ADMIN_USER]) {
    u[ADMIN_USER]={username:ADMIN_USER,password:'__hashed__',name:'מנהל מערכת',
      role:'admin',status:'active',plan:'unlimited',expiry:null,created:new Date().toISOString()};
    sUsers(u);
  }
}

// Login
function _tryAutoFill() {
  const remembered = JSON.parse(localStorage.getItem('tsm_remember') || 'null');
  if (!remembered) return;
  const uVal = document.getElementById('li-u').value.trim().toLowerCase();
  if (uVal === remembered.u) {
    document.getElementById('li-p').value = remembered.p;
    const cb = document.getElementById('li-remember');
    if (cb) cb.checked = true;
  } else {
    document.getElementById('li-p').value = '';
  }
}

function _initLoginScreen() {
  const remembered = JSON.parse(localStorage.getItem('tsm_remember') || 'null');
  if (remembered) {
    const uEl = document.getElementById('li-u');
    const pEl = document.getElementById('li-p');
    const cb  = document.getElementById('li-remember');
    if (uEl) uEl.value = remembered.u;
    if (pEl) pEl.value = remembered.p;
    if (cb)  cb.checked = true;
  }
}

async function doLogin() {
  const username = document.getElementById('li-u').value.trim().toLowerCase();
  const pass = document.getElementById('li-p').value;
  const err = document.getElementById('li-err');
  const btn = document.getElementById('li-btn');
  err.textContent = '';
  if (!username || !pass) { err.textContent = 'נא למלא שם משתמש וסיסמא'; return; }
  btn.textContent = 'מתחבר...'; btn.disabled = true;

  // Admin: check against hashed passwords
  if (username === ADMIN_USER) {
    btn.textContent = 'כניסה'; btn.disabled = false;
    const ok = await _isAdminPass(pass);
    if (!ok) { err.textContent = 'סיסמא שגויה'; return; }
    ensureAdmin();
    CU = username;
    sessionStorage.setItem('tsm_s', username);
    showScreen('screen-admin'); admRefresh();
    return;
  }

  let u = null;

  // Try Supabase only if configured
  if (sbReady()) {
    try {
      const db = sbClient();
      const {data, error} = await db.from('users').select('*').eq('username', username).single();
      if (!error && data) u = data;
    } catch(e) { /* ignore, fall through to localStorage */ }
  }

  // Fallback: localStorage cache
  if (!u) {
    u = gUsers()[username] || null;
  }

  btn.textContent = 'כניסה'; btn.disabled = false;

  if (!u) {
    err.textContent = 'שם משתמש לא נמצא';
    return;
  }
  if (u.password !== pass) { err.textContent = 'סיסמא שגויה'; return; }
  if (u.status === 'blocked') { err.textContent = 'המשתמש חסום. פנה למנהל.'; return; }
  if (u.role !== 'admin' && u.plan !== 'unlimited' && u.expiry && new Date(u.expiry) < new Date()) {
    err.textContent = 'תוקף המנוי פג. פנה למנהל לחידוש.'; return;
  }

  // Cache locally
  const local = gUsers(); local[username] = u; sUsers(local);
  CU = username;
  sessionStorage.setItem('tsm_s', username);
  // Remember me
  if (document.getElementById('li-remember')?.checked) {
    localStorage.setItem('tsm_remember', JSON.stringify({u: username, p: pass}));
  } else {
    localStorage.removeItem('tsm_remember');
  }
  showScreen('screen-home');
  // Load projects from Supabase then render
  _loadProjectsFromSupabase().then(() => renderHomeScreen()).catch(() => renderHomeScreen());
}
document.addEventListener('keydown',e=>{
  if(e.key==='Enter'&&document.getElementById('screen-login').classList.contains('active'))doLogin();
});

function doLogout() {
  CU=null; sessionStorage.removeItem('tsm_s');
  document.getElementById('li-u').value='';
  document.getElementById('li-p').value='';
  document.getElementById('li-err').textContent='';
  showScreen('screen-login');
  setTimeout(_initLoginScreen, 50);
}

function resumeSession() {
  // Clear any existing session — always start at login
  sessionStorage.clear();
  CU = null;
  ensureAdmin();
  showScreen('screen-login');
  setTimeout(_initLoginScreen, 50);
}

// ── Register ──
let selPlanVal=null, regDisc=0;
function selPlan(p) {
  selPlanVal=p;
  document.getElementById('pc-monthly').classList.toggle('sel',p==='monthly');
  document.getElementById('pc-yearly').classList.toggle('sel',p==='yearly');
}
function refreshPlanPrices() {
  const pr=gPrices();
  ['monthly','yearly'].forEach(p=>{
    const base=pr[p]||0;
    const el=document.getElementById('pp-'+p);
    if(!base){el.textContent='ליצירת קשר';return;}
    const fin=Math.round(base*(1-regDisc/100));
    el.textContent=regDisc>0?fin+' ₪ ('+regDisc+'% הנחה)':fin+' ₪';
  });
}
function applyRegCoup() {
  const code=document.getElementById('rg-coup').value.trim().toUpperCase();
  const msg=document.getElementById('rg-coup-msg');
  const c=gCoupons()[code];
  if(!c){msg.style.color='#c0392b';msg.textContent='קוד לא תקף';return;}
  if(c.expiry&&new Date(c.expiry)<new Date()){msg.style.color='#c0392b';msg.textContent='הקופון פג תוקף';return;}
  if(c.usesLeft<=0){msg.style.color='#c0392b';msg.textContent='הקופון מוצה';return;}
  regDisc=c.pct;
  msg.style.color='#2d6a4f';msg.textContent='✓ '+c.pct+'% הנחה!';
  refreshPlanPrices();
}

function showRegSuccess(n, planName, fin, u) {
  const box = document.querySelector('#screen-register .auth-box');
  box.innerHTML =
    '<div class="reg-done"><div class="big">✅</div><h3>הבקשה התקבלה!</h3>' +
    '<p>שלום <strong>' + n + '</strong>,<br>בקשת ההרשמה שלך התקבלה.<br><br>' +
    'מסלול: <strong>' + planName + '</strong> · ' + fin +
    '<br><br>ניצור קשר בקרוב לסיום התהליך.<br>שם משתמש: <strong>' + u + '</strong></p>' +
    '<button class="auth-btn" id="reg-back-btn" style="margin-top:18px;max-width:200px">חזרה לכניסה</button></div>';
  document.getElementById('reg-back-btn').addEventListener('click', function(){ showScreen('screen-login'); });
}
function doRegister() {
  const u=document.getElementById('rg-u').value.trim().toLowerCase();
  const p=document.getElementById('rg-p').value;
  const n=document.getElementById('rg-n').value.trim();
  const ct=document.getElementById('rg-c').value.trim();
  const coup=document.getElementById('rg-coup').value.trim().toUpperCase();
  const err=document.getElementById('rg-err');
  err.textContent='';
  if(!u||!p||!n){err.textContent='נא למלא שם משתמש, סיסמא ושם מלא';return;}
  if(!/^[a-z0-9_]+$/.test(u)){err.textContent='שם משתמש: אותיות לועזיות, ספרות וקו תחתון בלבד';return;}
  if(p.length<6){err.textContent='סיסמא לפחות 6 תווים';return;}
  if(!selPlanVal){err.textContent='נא לבחור מסלול';return;}
  const pr=gPrices();
  const base=pr[selPlanVal]||0;
  const fin=base?Math.round(base*(1-regDisc/100))+' ₪'+(regDisc?' ('+regDisc+'% הנחה)':''):'ליצירת קשר';
  const planName=selPlanVal==='monthly'?'חודשי':'שנתי';
  const btn=document.getElementById('rg-submit-btn');
  btn.textContent='שולח...';btn.disabled=true;

  const regData={username:u,password:p,name:n,contact:ct,plan:planName,
    price:fin,coupon:coup||'ללא',status:'pending'};

  if(sbReady()) {
    // Submit to Supabase
    sbReq('registrations','POST',regData)
      .then(()=>{ showRegSuccess(n,planName,fin,u); })
      .catch(err=>{
        console.error('Supabase error:',err);
        // Fallback: save locally + Netlify form
        const local=gPendingLocal(); local.push({...regData,date:new Date().toISOString()}); sPendingLocal(local);
        showRegSuccess(n,planName,fin,u);
      });
  } else {
    // No Supabase — save locally (works only on same browser/device)
    const local=gPendingLocal(); local.push({...regData,date:new Date().toISOString()}); sPendingLocal(local);
    // Also try Netlify Forms
    const formData=new FormData();
    Object.entries({...regData,'form-name':'registration'}).forEach(([k,v])=>formData.append(k,v));
    fetch('/',{method:'POST',body:formData}).catch(()=>{});
    showRegSuccess(n,planName,fin,u);
  }
}

// ════════════════════════════════════════════════════════════════

/* ── Namespace ── */
const AuthManager = {
  doLogin, doLogout, doRegister, resumeSession,
  applyRegCoup, selPlan, refreshPlanPrices,
  showHomeChgPass, doHomeChgPass,
};
