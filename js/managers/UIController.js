/**
 * UIController.js
 * =================================================================
 * ניווט, autocomplete, הודעות, ו-UI helpers:
 *   showScreen(id)        — מעבר בין מסכים
 *   validateEmail()       — אימות כתובת מייל
 *   fillDefaultIntro/Scope/Notes() — טקסטי ברירת מחדל
 *   cityAutocomplete()    — חיפוש ערים (data.gov.il)
 *   streetAutocomplete()  — חיפוש רחובות
 *   updateFullAddress()   — הרכבת כתובת אוטומטית
 *   setSpeciesVal()       — עדכון ניקוד מין אחרי בחירה
 *   spInput() / spKey()   — autocomplete מין עץ (TREE_LIST ב-SpeciesData.js)
 *   fmtVal(v)             — פורמט ערך (ILS)
 *   esc(s)                — HTML escape
 *
 * TREE_LIST + SPECIES_DATA טעונים כבר מ-js/data/SpeciesData.js
 *
 * להוספת autocomplete חדש:
 *   הוסף xxxAutocomplete() בדפוס cityAutocomplete()
 * =================================================================
 */

// ── Email validation ──
function validateEmail(input) {
  const err = document.getElementById('d-email-err');
  const v = input.value.trim();
  const valid = !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  err.classList.toggle('show', !valid);
}

// ── Default intro ──
const DEFAULT_INTRO = 'סקר העצים הוכן לצורך היתר בנייה. חוות דעת זו הוכנה על ידי כמומחה המוכר ומאושר על ידי משרד החקלאות ועל פי תיקון 83 ג\' לחוק התכנון והבנייה ובהתאם להנחיית פקיד היערות.';
function fillDefaultIntro() {
  document.getElementById('d-intro').value = localStorage.getItem('tsm_default_intro') || DEFAULT_INTRO;
  markUnsaved();
}
function saveDefaultIntro() {
  const txt = document.getElementById('d-intro').value.trim();
  if (!txt) { alert('אנא כתוב טקסט תחילה'); return; }
  localStorage.setItem('tsm_default_intro', txt);
  alert('✓ נשמר כברירת מחדל לכל הפרויקטים');
}

const DEFAULT_SCOPE = 'סקר זה כולל:\n• טבלת עצים הכוללת מיקום, מין, מצב בריאות והמלצה לכל עץ\n• סיכום ממצאים והמלצות\n• חישוב שווי העצים לפי נוהל משרד החקלאות';
function fillDefaultScope() {
  document.getElementById('d-scope').value = localStorage.getItem('tsm_default_scope') || DEFAULT_SCOPE;
  markUnsaved();
}
function saveDefaultScope() {
  const txt = document.getElementById('d-scope').value.trim();
  if (!txt) { alert('אנא כתוב טקסט תחילה'); return; }
  localStorage.setItem('tsm_default_scope', txt);
  alert('✓ נשמר כברירת מחדל לכל הפרויקטים');
}

function buildNotesList(notes) {
  const src = (notes && notes.trim()) ? notes : DEFAULT_NOTES;
  return src.split('\n').filter(l => l.trim()).map(l => '<li>' + l.replace(/^[•\-]\s*/, '') + '</li>').join('');
}
const DEFAULT_NOTES = `• אין לבצע עבודות בקרבת עצים לשימור. מילוי או חפירה במרחק הקטן 3 מ' מהגזע יהיה באישור הליווי הנופי.
• אין לבצע פעולות בעצים המיועדים לשימור כגון גיזום, גיזום שורשים, הרמת נוף, חיגור או פגיעה בגזע.
• חיתוך שורשים, פגיעה בגזע או כל פעולה שתגרום מוות לעץ תיחשב כריתה ללא היתר ע"פ חוק.
• גידור עצים לשימור ייושם עם כניסת הקבלן לביצוע וטרם כניסת כלים כבדים לאתר.
• כריתה/העתקה ללא רישיון בתוקף מפקיד יערות עירוני הינה עבירה פלילית.
• הסקר תקף לשנה מיום תיעוד העצים ע"פ הנחיית הרשויות.
• שווי העץ חושב לפי נוהל בדיקת ערך עצים, משרד החקלאות — תעריפי 2024.`;
function fillDefaultNotes() {
  document.getElementById('d-notes').value = localStorage.getItem('tsm_default_notes') || DEFAULT_NOTES;
  markUnsaved();
}
function saveDefaultNotes() {
  const txt = document.getElementById('d-notes').value.trim();
  if (!txt) { alert('אנא כתוב טקסט תחילה'); return; }
  localStorage.setItem('tsm_default_notes', txt);
  alert('✓ נשמר כברירת מחדל לכל הפרויקטים');
}

// ── Address autocomplete via data.gov.il ──
let cityTimer, streetTimer;

function cityAutocomplete(input) {
  clearTimeout(cityTimer);
  const q = input.value.trim();
  const list = document.getElementById('city-list');
  if (q.length < 2) { list.style.display='none'; return; }
  cityTimer = setTimeout(async () => {
    try {
      const res = await fetch('https://data.gov.il/api/3/action/datastore_search?resource_id=5c78e9fa-c2e2-4771-93ff-7f400a12f7ba&q='+encodeURIComponent(q)+'&limit=8');
      const data = await res.json();
      const cities = (data.result?.records || []).map(r => r['שם_ישוב']?.trim()).filter(Boolean);
      if (!cities.length) { list.style.display='none'; return; }
      list.innerHTML = cities.map(c => `<div onclick="pickCity('${c.replace(/'/g,"\\'")}')">📍 ${c}</div>`).join('');
      list.style.display = 'block';
    } catch(e) { list.style.display='none'; }
  }, 300);
}

function pickCity(city) {
  document.getElementById('d-city').value = city;
  document.getElementById('city-list').style.display = 'none';
  document.getElementById('d-street').value = '';
  markUnsaved();
}

function streetAutocomplete(input) {
  clearTimeout(streetTimer);
  const q = input.value.trim();
  const city = document.getElementById('d-city').value.trim();
  const list = document.getElementById('street-list');
  if (q.length < 2) { list.style.display='none'; return; }
  streetTimer = setTimeout(async () => {
    try {
      let url = 'https://data.gov.il/api/3/action/datastore_search?resource_id=a7296d1a-f8c9-4b70-96c2-6ebb4352f8e3&q='+encodeURIComponent(q)+'&limit=8';
      if (city) url += '&filters={"שם_ישוב":"'+encodeURIComponent(city)+'"}';
      const res = await fetch(url);
      const data = await res.json();
      const streets = [...new Set((data.result?.records || []).map(r => r['שם_רחוב']?.trim()).filter(Boolean))];
      if (!streets.length) { list.style.display='none'; return; }
      list.innerHTML = streets.map(s => `<div onclick="pickStreet('${s.replace(/'/g,"\\'")}')">🏠 ${s}</div>`).join('');
      list.style.display = 'block';
    } catch(e) { list.style.display='none'; }
  }, 300);
}

function pickStreet(street) {
  document.getElementById('d-street').value = street;
  document.getElementById('street-list').style.display = 'none';
  updateFullAddress();
  markUnsaved();
}

function updateFullAddress() {
  const city = document.getElementById('d-city').value.trim();
  const street = document.getElementById('d-street').value.trim();
  const num = document.getElementById('d-streetnum').value.trim();
  const parts = [street, num, city].filter(Boolean);
  if (parts.length > 1) document.getElementById('d-address').value = parts.join(' ');
}

// Close dropdowns on outside click
document.addEventListener('click', e => {
  if (!e.target.closest('.autocomplete-wrap')) {
    document.querySelectorAll('.autocomplete-list').forEach(l => l.style.display='none');
  }
});
// Update full address when street number changes
document.addEventListener('DOMContentLoaded', () => {
  const sn = document.getElementById('d-streetnum');
  if (sn) sn.addEventListener('input', updateFullAddress);
});


function printReport() {
  const allSections = [
    {key:'cover',      label:'עמוד שער'},
    {key:'aerial',     label:'תצ"א — מיקום האתר'},
    {key:'siteplan',   label:'תכנית העמדה'},
    {key:'table',      label:'טבלת סקר עצים'},
    {key:'summary',    label:'סיכום המלצות'},
    {key:'sum-values', label:'טבלת ריכוז ערכים לפי מיני העצים'},
    {key:'sum-rec',    label:'טבלת ריכוז המלצות לפי מיני העצים'},
    {key:'sum-cut',    label:'✂️ סה"כ כריתות — פיצוי נופי'},
    {key:'sum-pres',   label:'🌿 סה"כ שווי שימור עצים'},
    {key:'sum-move',   label:'🚚 סה"כ שווי העתקות'},
    {key:'notes',      label:'הערות והנחיות'},
    {key:'photos',     label:'תמונות עצים'},
  ];

  // Build overlay
  const overlay = document.createElement('div');
  overlay.id = 'print-dialog-overlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.55);z-index:9999;display:flex;align-items:center;justify-content:center;';

  const box = document.createElement('div');
  box.style.cssText = 'background:#fff;border-radius:14px;padding:26px 30px;max-width:460px;width:92%;direction:rtl;text-align:right;box-shadow:0 20px 60px rgba(0,0,0,.3);';

  // Title
  const title = document.createElement('div');
  title.style.cssText = 'font-size:1rem;font-weight:700;color:#1a3a2a;margin-bottom:4px;';
  title.textContent = '🖨️ בחר חלקים להדפסה';
  box.appendChild(title);

  const sub = document.createElement('div');
  sub.style.cssText = 'font-size:.78rem;color:#888;margin-bottom:14px;';
  sub.textContent = 'ברירת המחדל — הכל מסומן';
  box.appendChild(sub);

  // Checkboxes container
  const cbWrap = document.createElement('div');
  cbWrap.style.cssText = 'display:flex;flex-direction:column;gap:2px;margin-bottom:18px;border:1px solid #e0e0e0;border-radius:9px;padding:6px 4px;';

  allSections.forEach(s => {
    const lbl = document.createElement('label');
    lbl.style.cssText = 'display:flex;align-items:center;gap:10px;padding:' + (s.indent ? '5px 10px 5px 26px' : '7px 10px') + ';border-radius:7px;cursor:pointer;direction:rtl;';
    lbl.addEventListener('mouseover',  () => lbl.style.background = '#f0f7f0');
    lbl.addEventListener('mouseout',   () => lbl.style.background = 'transparent');

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = true;
    cb.dataset.sectionKey = s.key;
    cb.style.cssText = 'width:' + (s.indent ? '14' : '16') + 'px;height:' + (s.indent ? '14' : '16') + 'px;accent-color:#2d6a4f;cursor:pointer;flex-shrink:0;';

    const span = document.createElement('span');
    span.style.cssText = 'font-size:' + (s.indent ? '.8' : '.85') + 'rem;' + (s.indent ? 'color:#555;' : 'font-weight:600;');
    span.textContent = s.label;

    lbl.appendChild(cb);
    lbl.appendChild(span);
    cbWrap.appendChild(lbl);
  });
  box.appendChild(cbWrap);

  // Tip
  const tip = document.createElement('div');
  tip.style.cssText = 'background:#f4f8f4;border-radius:8px;padding:10px 14px;margin-bottom:18px;font-size:.76rem;line-height:2;color:#555;';
  tip.innerHTML = '<div><strong>🟢 Chrome / Edge:</strong> "פרטים נוספים" ← בטל <strong>כותרות עליונות ותחתונות</strong></div><div><strong>🟠 Firefox:</strong> "עוד הגדרות" ← בטל <strong>הדפס כותרות ושורות תחתון</strong></div>';
  box.appendChild(tip);

  // Buttons
  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;gap:10px;justify-content:flex-end;';

  const btnClearAll = document.createElement('button');
  btnClearAll.textContent = 'נקה הכל';
  btnClearAll.style.cssText = 'padding:9px 14px;background:#f0f0f0;color:#666;border:none;border-radius:7px;cursor:pointer;font-size:.82rem;font-weight:600;font-family:inherit;margin-left:auto;';
  btnClearAll.onclick = () => {
    overlay.querySelectorAll('input[type=checkbox]').forEach(cb => { cb.checked = false; });
  };
  btnRow.appendChild(btnClearAll);

  const btnCancel = document.createElement('button');
  btnCancel.textContent = 'ביטול';
  btnCancel.style.cssText = 'padding:9px 18px;background:#e8e4da;color:#444;border:none;border-radius:7px;cursor:pointer;font-size:.85rem;font-weight:600;font-family:inherit;';
  btnCancel.onclick = () => { overlay.remove(); _restoreAllSections(); };

  const btnPrint = document.createElement('button');
  btnPrint.textContent = 'הדפס / PDF 🖨️';
  btnPrint.style.cssText = 'padding:9px 22px;background:#2d6a4f;color:#fff;border:none;border-radius:7px;cursor:pointer;font-size:.88rem;font-weight:700;font-family:inherit;';
  btnPrint.onclick = _doPrint;

  btnRow.appendChild(btnCancel);
  btnRow.appendChild(btnPrint);
  box.appendChild(btnRow);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
}

function _doPrint() {
  const overlay = document.getElementById('print-dialog-overlay');
  if (!overlay) return;

  overlay.querySelectorAll('input[type=checkbox]').forEach(cb => {
    if (!cb.checked) {
      const key = cb.dataset.sectionKey;
      // sum-* sections use class selector, others use data-section
      const sel = key.startsWith('sum-') ? '.ps-' + key : '[data-section="' + key + '"]';
      document.querySelectorAll(sel).forEach(el => {
        el.style.display = 'none';
        el.dataset.hiddenForPrint = '1';
      });
    }
  });

  overlay.remove();
  setTimeout(() => { window.print(); setTimeout(_restoreAllSections, 1000); }, 100);
}

function _restoreAllSections() {
  document.querySelectorAll('[data-hidden-for-print]').forEach(el => {
    el.style.display = '';
    delete el.dataset.hiddenForPrint;
  });
}


function showHomeChgPass() {
  ['hcp-old','hcp-new1','hcp-new2'].forEach(function(id){ document.getElementById(id).value=''; });
  var msg = document.getElementById('hcp-msg');
  msg.style.display = 'none';
  document.getElementById('home-chgpass-modal').style.display = 'flex';
}

async function doHomeChgPass() {
  var op  = document.getElementById('hcp-old').value;
  var np  = document.getElementById('hcp-new1').value;
  var np2 = document.getElementById('hcp-new2').value;
  var msg = document.getElementById('hcp-msg');
  function hcpMsg(txt, ok) {
    msg.textContent = txt;
    msg.style.display = 'block';
    msg.style.background = ok ? '#d4edda' : '#fdecea';
    msg.style.color = ok ? '#1a5a2a' : '#c0392b';
  }
  if (np.length < 6) { hcpMsg('סיסמא חדשה לפחות 6 תווים', false); return; }
  if (np !== np2)    { hcpMsg('הסיסמאות אינן תואמות', false); return; }
  var local = gUsers();
  var u = local[CU] || null;
  if (!u || u.password !== op) { hcpMsg('סיסמא נוכחית שגויה', false); return; }
  try {
    var db = sbClient();
    await db.from('users').update({password: np}).eq('username', CU);
  } catch(e) { console.error(e); }
  local[CU].password = np;
  sUsers(local);
  hcpMsg('✓ סיסמא עודכנה בהצלחה!', true);
  setTimeout(function(){ document.getElementById('home-chgpass-modal').style.display='none'; }, 1500);
}


function showHomeChgPass() {
  ['hcp-old','hcp-new1','hcp-new2'].forEach(function(id){ document.getElementById(id).value=''; });
  var msg = document.getElementById('hcp-msg');
  msg.style.display = 'none';
  document.getElementById('home-chgpass-modal').style.display = 'flex';
}

async function doHomeChgPass() {
  var op  = document.getElementById('hcp-old').value;
  var np  = document.getElementById('hcp-new1').value;
  var np2 = document.getElementById('hcp-new2').value;
  var msg = document.getElementById('hcp-msg');
  function hcpMsg(txt, ok) {
    msg.textContent = txt;
    msg.style.display = 'block';
    msg.style.background = ok ? '#d4edda' : '#fdecea';
    msg.style.color = ok ? '#1a5a2a' : '#c0392b';
  }
  if (np.length < 6) { hcpMsg('סיסמא חדשה לפחות 6 תווים', false); return; }
  if (np !== np2)    { hcpMsg('הסיסמאות אינן תואמות', false); return; }
  var local = gUsers();
  var u = local[CU] || null;
  if (!u || u.password !== op) { hcpMsg('סיסמא נוכחית שגויה', false); return; }
  try { var db = sbClient(); await db.from('users').update({password:np}).eq('username',CU); } catch(e) {}
  local[CU].password = np; sUsers(local);
  hcpMsg('✓ סיסמא עודכנה!', true);
  setTimeout(function(){ document.getElementById('home-chgpass-modal').style.display='none'; }, 1500);
}


/* ── Species autocomplete functions (uses TREE_LIST from SpeciesData.js) ── */


function setSpeciesVal(inp, speciesName) {
  var tr = inp.closest('tr');
  if (!tr) return;
  var sel = tr.querySelector('.f-spec-val');
  if (!sel) return;
  var data = getSpeciesData(speciesName);
  if (data && data.s !== undefined) {
    sel.value = String(data.s);
  }
  var rid = tr.dataset.rid;
  if (rid) calcRow(parseInt(rid));
}

function spInput(inp) {
  var q = inp.value.trim().toLowerCase();
  var drop = inp.parentElement.querySelector('.sp-drop');
  if (q.length === 0) { drop.style.display = 'none'; return; }
  var results = TREE_LIST.filter(function(t) {
    return t.toLowerCase().includes(q);
  }).slice(0, 20);
  if (!results.length) { drop.style.display = 'none'; return; }
  drop.innerHTML = results.map(function(t, i) {
    var parts = t.split(',');
    var heb = parts[0].trim();
    var lat = parts.slice(1).join(',').trim();
    return '<div data-val="' + t.replace(/"/g,'&quot;') + '" class="' + (i===0?'sp-active':'') + '">' +
      heb + (lat ? '<span class="sp-latin">' + lat + '</span>' : '') + '</div>';
  }).join('');
  drop.style.display = 'block';
  drop.querySelectorAll('div').forEach(function(d) {
    d.addEventListener('mousedown', function(e) {
      e.preventDefault();
      inp.value = d.getAttribute('data-val');
      drop.style.display = 'none';
      setSpeciesVal(inp, inp.value);
      markUnsaved();
    });
  });
}

function spKey(e, inp) {
  var drop = inp.parentElement.querySelector('.sp-drop');
  if (drop.style.display === 'none') return;
  var items = drop.querySelectorAll('div');
  var active = drop.querySelector('.sp-active');
  var idx = Array.from(items).indexOf(active);
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (active) active.classList.remove('sp-active');
    items[(idx + 1) % items.length].classList.add('sp-active');
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (active) active.classList.remove('sp-active');
    items[(idx - 1 + items.length) % items.length].classList.add('sp-active');
  } else if (e.key === 'Enter' || e.key === 'Tab') {
    var cur = drop.querySelector('.sp-active');
    if (cur) {
      e.preventDefault();
      inp.value = cur.getAttribute('data-val');
      drop.style.display = 'none';
      setSpeciesVal(inp, inp.value);
      markUnsaved();
    }
  } else if (e.key === 'Escape') {
    drop.style.display = 'none';
  }
}

// סגור dropdown בלחיצה מחוץ
document.addEventListener('click', function(e) {
  if (!e.target.closest('.sp-wrap')) {
    document.querySelectorAll('.sp-drop').forEach(function(d){ d.style.display='none'; });
  }
});


/* ── Namespace ── */
const UIController = {
  showScreen, validateEmail, fmtVal, esc,
  fillDefaultIntro, saveDefaultIntro,
  fillDefaultScope, saveDefaultScope,
  fillDefaultNotes, saveDefaultNotes,
  cityAutocomplete, streetAutocomplete, updateFullAddress,
  setSpeciesVal, spInput, spKey,
};
