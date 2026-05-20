/**
 * AdminManager.js
 * =================================================================
 * פאנל ניהול — משתמשים, הרשמות, קופונים, הגדרות:
 *   admTab(name)           — מעבר בין לשוניות הניהול
 *   admRenderUsers()       — הצגת טבלת משתמשים
 *   admFilterUsers()       — חיפוש וסינון משתמשים
 *   admRenderPending()     — בקשות הרשמה ממתינות
 *   admSetExpiry()         — הארכת/קביעת תוקף מנוי
 *   admAddUser()           — הוספת משתמש ידנית
 *   admAddCoupon()         — יצירת קופון הנחה
 *   admDelCoup()           — מחיקת קופון
 *   admSavePrices()        — עדכון מחירון
 *   admSaveSupabase()      — שמירת פרטי חיבור Supabase
 *   admTestSupabase()      — בדיקת חיבור Supabase
 *   admChgUser()           — שינוי שם משתמש אדמין
 *   admChgPass()           — שינוי סיסמא אדמין
 *
 * להוספת לשונית ניהול חדשה:
 *   הוסף כפתור ב-HTML + div#ap-xxx + case ב-admTab()
 * =================================================================
 */

//  ADMIN PANEL
// ════════════════════════════════════════════════════════════════
function admTab(name) {
  document.querySelectorAll('.adm-tab').forEach((t,i)=>{
    t.classList.toggle('active',['users','pending','add','coupons','settings'][i]===name);
  });
  document.querySelectorAll('.adm-panel').forEach(p=>p.classList.remove('active'));
  document.getElementById('ap-'+name).classList.add('active');
  if(name==='users')admRenderUsers();
  if(name==='pending')admRenderPending();
  if(name==='coupons')admRenderCoupons();
  if(name==='settings')admLoadSettings();
}
function admRefresh(){admRenderUsers();admRenderPending();admRenderCoupons();}
function adminToApp(){showScreen('screen-home');renderHomeScreen();}

async function admRenderUsers(){
  const tbody = document.getElementById('adm-users-body');
  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#aaa;padding:16px">טוען...</td></tr>';
  let userList = [];
  try { userList = await sbDB('users').getAll(); }
  catch(e) { userList = Object.values(gUsers()); }
  window._admUserList = userList;
  admRenderUserRows(userList);
}

function admRenderUserRows(userList) {
  const tbody = document.getElementById('adm-users-body');
  if (!userList.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#aaa;padding:20px">לא נמצאו משתמשים</td></tr>';
    return;
  }
  tbody.innerHTML = userList.map(u=>{
    const pc = Object.keys(JSON.parse(localStorage.getItem('tp_'+u.username)||'{}')).length;
    const exp = u.expiry||(u.plan==='unlimited'?'ללא הגבלה':'—');
    const isExp = u.expiry && new Date(u.expiry) < new Date();
    const statusKey = u.status==='blocked'?'blocked': u.role==='admin'||u.plan==='unlimited'?'active': isExp?'expired': u.plan==='trial'?'trial':'active';
    const badge = statusKey==='blocked'?'<span class="bdg bdg-blk">חסום</span>':
      statusKey==='expired'?'<span class="bdg bdg-exp">פג תוקף</span>':
      statusKey==='trial'?'<span class="bdg bdg-tri">ניסיון</span>':
      '<span class="bdg bdg-act">פעיל</span>';
    const isAdmin = u.role==='admin';
    // expiry display with days-left
    let expDisplay = exp;
    if (u.expiry && !isExp) {
      const daysLeft = Math.ceil((new Date(u.expiry)-new Date())/(1000*60*60*24));
      const col = daysLeft<=14?'#c0390b':daysLeft<=30?'#e67e22':'#2d6a4f';
      expDisplay = `<span style="color:${col};font-weight:600">${exp}</span><br><span style="font-size:.68rem;color:#999">${daysLeft} ימים נותרו</span>`;
    } else if (isExp) {
      expDisplay = `<span style="color:#c0390b;font-weight:600">${exp}</span><br><span style="font-size:.68rem;color:#c0390b">⚠ פג!</span>`;
    }
    return `<tr data-username="${u.username}" data-name="${(u.name||'').toLowerCase()}" data-status="${statusKey}" data-plan="${u.plan||''}">
      <td><strong>${u.username}</strong></td>
      <td>${u.name||'—'}</td>
      <td>${expDisplay}</td>
      <td>${badge}<br><span style="font-size:.68rem;color:#aaa">${u.plan||''}</span></td>
      <td style="text-align:center">${pc}</td>
      <td>${isAdmin
        ? `<span style="color:#aaa;font-size:.75rem">אדמין</span>${u.username!==CU?` <button class="ab ab-r" style="background:#7b0000;color:#fff" onclick="admDelUser('${u.username}')">🗑</button>`:'<span style="color:#bbb;font-size:.72rem"> (אתה)</span>'}`
        : `<div style="display:flex;flex-wrap:wrap;gap:4px;align-items:center">
            <button class="ab ab-b" onclick="admExt('${u.username}',30)" title="+30 יום מסיום המנוי הנוכחי">+30י</button>
            <button class="ab ab-b" style="background:#1a6696" onclick="admExt('${u.username}',90)" title="+90 יום">+3ח</button>
            <button class="ab ab-g" onclick="admExt('${u.username}',365)" title="+שנה">+שנה</button>
            <button class="ab" style="background:#f5f0e8;color:#7d5a00;border:1px solid #d4b896;font-size:.75rem" onclick="admSetExpiry('${u.username}')" title="הגדר תאריך ספציפי">📅</button>
            ${u.status==='blocked'
              ?`<button class="ab ab-g" onclick="admBlock('${u.username}')">✓ בטל</button>`
              :`<button class="ab ab-r" onclick="admBlock('${u.username}')">🚫</button>`}
            <button class="ab ab-o" onclick="admRstPass('${u.username}')" title="איפוס סיסמא">🔑</button>
            <button class="ab ab-r" style="background:#7b0000;color:#fff" onclick="admDelUser('${u.username}')" title="מחק">🗑</button>
          </div>`
      }</td></tr>`;
  }).join('');
  admFilterUsers();
}

function admFilterUsers() {
  const q = (document.getElementById('adm-search')?.value||'').toLowerCase().trim();
  const st = document.getElementById('adm-filter-status')?.value||'';
  const pl = document.getElementById('adm-filter-plan')?.value||'';
  const rows = document.querySelectorAll('#adm-users-body tr[data-username]');
  let visible = 0;
  rows.forEach(tr => {
    const un = tr.dataset.username.toLowerCase();
    const nm = tr.dataset.name||'';
    const matchQ = !q || un.includes(q) || nm.includes(q);
    const matchSt = !st || tr.dataset.status === st;
    const matchPl = !pl || (tr.dataset.plan||'') === pl;
    const show = matchQ && matchSt && matchPl;
    tr.style.display = show ? '' : 'none';
    if (show) visible++;
  });
  const hasFilter = q||st||pl;
  const countEl = document.getElementById('adm-filter-count');
  const clearBtn = document.getElementById('adm-filter-clear');
  if (countEl) countEl.textContent = hasFilter ? `מציג ${visible} מתוך ${rows.length}` : `${rows.length} משתמשים`;
  if (clearBtn) clearBtn.style.display = hasFilter ? '' : 'none';
}

function admClearFilter() {
  const s = document.getElementById('adm-search');
  const fs = document.getElementById('adm-filter-status');
  const fp = document.getElementById('adm-filter-plan');
  if(s) s.value=''; if(fs) fs.value=''; if(fp) fp.value='';
  admFilterUsers();
}

function admSetExpiry(un) {
  const d = prompt(`הגדר תאריך תפוגה למשתמש ${un} (פורמט: YYYY-MM-DD):`, new Date(Date.now()+30*86400000).toISOString().split('T')[0]);
  if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return;
  const newPlan = 'monthly';
  (async()=>{
    if(sbReady()){ try{ await sbDB('users').update({username:un},{expiry:d,plan:newPlan,status:'active'}); }catch(e){} }
    const u=gUsers(); if(u[un]){u[un].expiry=d;u[un].plan=newPlan;u[un].status='active';sUsers(u);}
    admRenderUsers();
  })();
}

async function admExt(un, days){
  // קודם שלוף את המשתמש העדכני מ-Supabase
  let currentExpiry = null;
  if(sbReady()){
    try {
      const userRow = await sbDB('users').getOne({username: un});
      if(userRow) currentExpiry = userRow.expiry;
    } catch(e){ console.error(e); }
  }
  // אם לא קיים ב-Supabase, נסה localStorage
  if(!currentExpiry){
    const u = gUsers();
    currentExpiry = u[un]?.expiry || null;
  }

  const base = (currentExpiry && new Date(currentExpiry) > new Date())
    ? new Date(currentExpiry) : new Date();
  base.setDate(base.getDate() + days);
  const newExpiry = base.toISOString().split('T')[0];
  const newPlan = days >= 365 ? 'yearly' : 'monthly';

  // עדכן ב-Supabase (update — לא upsert — כדי לא לאפס שדות אחרים)
  if(sbReady()){
    try {
      await sbDB('users').update({username: un}, {expiry: newExpiry, plan: newPlan, status: 'active'});
    } catch(e){ console.error('Supabase update failed:', e); }
  }

  // עדכן גם localStorage
  const u = gUsers();
  if(u[un]){ u[un].expiry = newExpiry; u[un].plan = newPlan; u[un].status = 'active'; sUsers(u); }

  admRenderUsers();
  admMsg('✓ מנוי הוארך עד ' + newExpiry, 'ok');
}
async function admDelUser(un){
  if(!confirm('למחוק לצמיתות את המשתמש '+un+'?\nכל הפרויקטים שלו יימחקו גם כן!'))return;
  if(!confirm('פעולה זו בלתי הפיכה. האם אתה בטוח?'))return;
  // Delete from Supabase
  try { await sbDB('users').delete({username:un}); } catch(e){ console.error(e); }
  // Delete from localStorage
  const u=gUsers(); delete u[un]; sUsers(u);
  localStorage.removeItem('tp_'+un);
  admRenderUsers();
  admMsg('✓ משתמש '+un+' נמחק לצמיתות','ok');
}
async function admBlock(un){
  // קרא סטטוס עדכני מ-Supabase
  let currentStatus = 'active';
  if(sbReady()){
    try {
      const userRow = await sbDB('users').getOne({username: un});
      if(userRow) currentStatus = userRow.status || 'active';
    } catch(e){ console.error(e); }
  } else {
    const u = gUsers();
    currentStatus = u[un]?.status || 'active';
  }

  const newStatus = currentStatus === 'blocked' ? 'active' : 'blocked';

  // עדכן ב-Supabase
  if(sbReady()){
    try {
      await sbDB('users').update({username: un}, {status: newStatus});
    } catch(e){ console.error('Supabase block update failed:', e); }
  }

  // עדכן localStorage
  const u = gUsers();
  if(u[un]){ u[un].status = newStatus; sUsers(u); }

  admRenderUsers();
  admMsg(newStatus === 'blocked' ? '🚫 משתמש חסום' : '✓ משתמש פעיל', 'ok');
}
async function admRstPass(un){
  const np=prompt('סיסמא חדשה עבור '+un+':');
  if(!np||np.length<4){return;}
  if(sbReady()){
    try { await sbDB('users').update({username:un},{password:np}); } catch(e){ console.error(e); }
  }
  const u=gUsers();if(u[un]){u[un].password=np;sUsers(u);}
  admMsg('✓ סיסמא עודכנה','ok');
}
async function admRenderPending(){
  const tbody=document.getElementById('adm-pend-body');
  const cnt=document.getElementById('pcnt');
  tbody.innerHTML='<tr><td colspan="6" style="text-align:center;color:#aaa;padding:18px">טוען...</td></tr>';

  let items=[];
  if(sbReady()){
    try{
      items=await sbReq("registrations?status=eq.pending&order=created_at.desc")||[];
    }catch(e){
      console.error(e);
      items=gPendingLocal();
    }
  } else {
    items=gPendingLocal();
  }

  cnt.textContent=items.length;cnt.style.display=items.length?'inline-block':'none';

  if(!items.length){
    tbody.innerHTML='<tr><td colspan="6" style="text-align:center;color:#aaa;padding:20px">אין בקשות ממתינות</td></tr>';
    return;
  }
  const pr=gPrices();
  tbody.innerHTML=items.map((p,i)=>{
    const base=pr[p.plan==='חודשי'?'monthly':'yearly']||0;
    const priceStr=p.price||'—';
    const dateStr=p.created_at?new Date(p.created_at).toLocaleDateString('he-IL'):(p.date?new Date(p.date).toLocaleDateString('he-IL'):'—');
    const idAttr=p.id?`data-id="${p.id}"`:`data-idx="${i}"`;
    return `<tr>
      <td><strong>${p.username}</strong></td>
      <td>${p.name}</td>
      <td>${p.contact||'—'}</td>
      <td>${p.plan||'—'} · ${priceStr}</td>
      <td style="font-size:.73rem;color:#888">${dateStr}</td>
      <td>
        <button class="ab ab-g" onclick="admApprove(this)" ${idAttr} data-username="${p.username}" data-password="${p.password}" data-name="${p.name}" data-email="${p.contact||''}" data-plan="${p.plan}">✓ אשר</button>
        <button class="ab ab-r" onclick="admReject(this)" ${idAttr}>✕ דחה</button>
      </td>
    </tr>`;
  }).join('');
}
async function admApprove(btn){
  const id=btn.getAttribute('data-id');
  const idx=btn.getAttribute('data-idx');
  const un=btn.getAttribute('data-username');
  const pw=btn.getAttribute('data-password');
  const n=btn.getAttribute('data-name');
  const em=btn.getAttribute('data-email');
  const plan=btn.getAttribute('data-plan');
  const days=(plan==='שנתי')?365:30;
  const exp=new Date(); exp.setDate(exp.getDate()+days);
  const expStr=exp.toISOString().split('T')[0];

  // Save to Supabase
  const userData = {username:un, password:pw, name:n, email:em,
    plan:(plan==='שנתי')?'yearly':'monthly', expiry:expStr,
    status:'active', role:'user'};
  let sbOk = false;
  try {
    const db = sbClient();
    // Delete existing first (if any), then insert fresh
    await db.from('users').delete().eq('username', un);
    const {error} = await db.from('users').insert(userData);
    if(error) throw new Error(error.message);
    sbOk = true;
  } catch(e) {
    admMsg('⚠️ שגיאת שמירה ב-Supabase: '+e.message+' — המשתמש נשמר רק מקומית!','err');
    console.error('Supabase save failed:', e);
  }
  // Always save locally as cache
  const users=gUsers(); users[un]=userData; sUsers(users);
  if(sbOk) console.log('✓ User saved to Supabase:', un);

  // Mark as approved in Supabase or remove from localStorage
  if(sbReady()&&id){
    try{ await sbReq('registrations?id=eq.'+id,'PATCH',{status:'approved'}); }
    catch(e){ console.error(e); }
  } else if(idx!==null){
    const local=gPendingLocal(); local.splice(parseInt(idx),1); sPendingLocal(local);
  }

  admRenderPending(); admRenderUsers();
  admMsg('✓ '+un+' אושר! גישה עד '+expStr,'ok');
}
async function admReject(btn){
  if(!confirm('לדחות את הבקשה?'))return;
  const id=btn.getAttribute('data-id');
  const idx=btn.getAttribute('data-idx');
  if(sbReady()&&id){
    try{ await sbReq('registrations?id=eq.'+id,'PATCH',{status:'rejected'}); }
    catch(e){ console.error(e); }
  } else if(idx!==null){
    const local=gPendingLocal(); local.splice(parseInt(idx),1); sPendingLocal(local);
  }
  admRenderPending();
  admMsg('בקשה נדחתה','ok');
}
async function admAddUser(){
  const u=document.getElementById('au-u').value.trim().toLowerCase();
  const p=document.getElementById('au-p').value;
  const n=document.getElementById('au-n').value.trim();
  const e=document.getElementById('au-e').value.trim();
  const x=document.getElementById('au-x').value;
  const pl=document.getElementById('au-pl').value;
  const msg=document.getElementById('au-msg');
  if(!u||!p){showMsg(msg,'שם משתמש וסיסמא חובה','err');return;}
  if(p.length<4){showMsg(msg,'סיסמא קצרה מדי','err');return;}
  const userData={username:u,password:p,name:n,email:e,plan:pl,expiry:x||null,status:'active',role:'user'};
  try {
    const existing = await sbDB('users').getAll({username:u});
    if(existing.length){showMsg(msg,'שם משתמש קיים','err');return;}
    await sbDB('users').upsert(userData,'username');
  } catch(e2) { console.error(e2); }
  const users=gUsers(); users[u]=userData; sUsers(users);
  admRenderUsers();
  showMsg(msg,'✓ משתמש '+u+' נוצר','ok');
  ['au-u','au-p','au-n','au-e'].forEach(id=>document.getElementById(id).value='');
}
function admRenderCoupons(){
  const c=gCoupons();const list=Object.values(c);
  document.getElementById('adm-coup-body').innerHTML=list.length?list.map(cp=>
    `<tr><td><strong>${cp.code}</strong></td><td>${cp.pct}%</td><td>${cp.expiry||'ללא הגבלה'}</td><td>${cp.usesLeft}</td>
    <td><button class="ab ab-r" onclick="admDelCoup('${cp.code}')">מחק</button></td></tr>`
  ).join(''):'<tr><td colspan="5" style="text-align:center;color:#aaa">אין קופונים</td></tr>';
}
function admAddCoupon(){
  const code=document.getElementById('cp-c').value.trim().toUpperCase();
  const pct=parseInt(document.getElementById('cp-p').value)||0;
  const exp=document.getElementById('cp-x').value;
  const uses=parseInt(document.getElementById('cp-u').value)||10;
  const msg=document.getElementById('cp-msg');
  if(!code){showMsg(msg,'נא להזין קוד','err');return;}
  const c=gCoupons();c[code]={code,pct,expiry:exp||null,usesLeft:uses,created:new Date().toISOString()};
  sCoupons(c);admRenderCoupons();showMsg(msg,'✓ קופון '+code+' נוצר','ok');
  document.getElementById('cp-c').value='';
}
function admDelCoup(code){
  if(!confirm('למחוק קופון '+code+'?'))return;
  const c=gCoupons();delete c[code];sCoupons(c);admRenderCoupons();
}
function admLoadSettings(){
  const pr=gPrices();
  document.getElementById('sf-pm').value=pr.monthly||'';
  document.getElementById('sf-py').value=pr.yearly||'';
  const s=sbConfig();
  document.getElementById('sf-sb-url').value=s.url||'';
  document.getElementById('sf-sb-key').value=s.key||'';
}
function admSaveSupabase(){
  const url=document.getElementById('sf-sb-url').value.trim().replace(/\/$/,'');
  const key=document.getElementById('sf-sb-key').value.trim();
  localStorage.setItem('tsm_sb_url',url);
  localStorage.setItem('tsm_sb_key',key);
  showMsg(document.getElementById('sf-sbmsg'),'✓ פרטי Supabase נשמרו. לחץ "בדוק חיבור"','ok');
}
async function admTestSupabase(){
  const msg=document.getElementById('sf-sbmsg');
  if(!sbReady()){showMsg(msg,'נא להזין URL ו-Key תחילה','err');return;}
  showMsg(msg,'בודק...','ok');
  try{
    await sbReq('registrations?limit=1');
    showMsg(msg,'✅ החיבור תקין! Supabase מחובר ופעיל.','ok');
  }catch(e){
    showMsg(msg,'❌ שגיאה: '+e.message,'err');
  }
}
function admChgUser(){
  const nu=document.getElementById('sf-nu').value.trim().toLowerCase();
  const cp=document.getElementById('sf-cp').value;
  const msg=document.getElementById('sf-umsg');
  if(!nu){showMsg(msg,'נא להזין שם חדש','err');return;}
  if(!/^[a-z0-9_]+$/.test(nu)){showMsg(msg,'אותיות לועזיות וספרות בלבד','err');return;}
  const u=gUsers();const adm=u[CU];
  if(!adm||adm.password!==cp){showMsg(msg,'סיסמא שגויה','err');return;}
  if(u[nu]&&nu!==CU){showMsg(msg,'שם משתמש כבר קיים','err');return;}
  const proj=localStorage.getItem('tp_'+CU);
  if(proj)localStorage.setItem('tp_'+nu,proj);
  adm.username=nu;u[nu]=adm;
  if(nu!==CU)delete u[CU];
  sUsers(u);CU=nu;sessionStorage.setItem('tsm_s',nu);
  showMsg(msg,'✓ שם משתמש עודכן ל-'+nu,'ok');
  document.getElementById('sf-nu').value='';document.getElementById('sf-cp').value='';
}
function admChgPass(){
  const op=document.getElementById('sf-op').value;
  const np=document.getElementById('sf-np').value;
  const np2=document.getElementById('sf-np2').value;
  const msg=document.getElementById('sf-pmsg');
  const u=gUsers();const adm=u[CU];
  if(!adm||adm.password!==op){showMsg(msg,'סיסמא נוכחית שגויה','err');return;}
  if(np.length<6){showMsg(msg,'סיסמא חדשה לפחות 6 תווים','err');return;}
  if(np!==np2){showMsg(msg,'הסיסמאות אינן תואמות','err');return;}
  adm.password=np;sUsers(u);showMsg(msg,'✓ סיסמא עודכנה','ok');
  ['sf-op','sf-np','sf-np2'].forEach(id=>document.getElementById(id).value='');
}
function admSavePrices(){
  const m=parseFloat(document.getElementById('sf-pm').value)||0;
  const y=parseFloat(document.getElementById('sf-py').value)||0;
  sPrices({monthly:m,yearly:y});
  showMsg(document.getElementById('sf-prmsg'),'✓ מחירים נשמרו','ok');
}
function admMsg(txt,type){
  const el=document.getElementById('adm-gmsg');
  el.className='adm-msg '+type;el.textContent=txt;el.style.display='block';
  setTimeout(()=>el.style.display='none',3500);
}
function showMsg(el,txt,type){
  el.className='adm-msg '+type;el.textContent=txt;el.style.display='block';
  setTimeout(()=>el.style.display='none',4000);
}

// Boot
document.addEventListener('DOMContentLoaded', ()=>{ resumeSession(); });

// Warn on unsaved
window.addEventListener('beforeunload', e=>{
  if(typeof unsaved!=='undefined'&&unsaved){e.preventDefault();e.returnValue='';}
});


/* ── Namespace ── */
const AdminManager = {
  admTab, adminToApp, admRenderUsers, admFilterUsers, admClearFilter,
  admRenderPending, admSetExpiry, admAddUser,
  admAddCoupon, admDelCoup, admRenderCoupons,
  admSavePrices, admSaveSupabase, admTestSupabase,
  admChgUser, admChgPass, admLoadSettings,
};
