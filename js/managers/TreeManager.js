/**
 * TreeManager.js
 * =================================================================
 * לב המערכת — טבלת עצים, חישובים, Undo, Excel:
 *   addRow(data)        — הוספת שורת עץ לטבלה
 *   removeRow(id)       — מחיקת שורה
 *   clearAllRows()      — ניקוי כל הטבלה
 *   calcRow(id)         — חישוב ערך עץ (נוהל 2024)
 *   collectRows()       — איסוף שורות מה-DOM
 *   filterTable()       — חיפוש וסינון
 *   pushUndo() / performUndo() — מנגנון Undo (5 פעולות)
 *   importExcel()       — ייבוא XLSX/CSV
 *   exportGovExcel()    — ייצוא פורמט ממשרד החקלאות
 *   applyBulkEdit()     — עריכה קבוצתית
 *
 * נוסחת ערך (עץ):  V = 20 x k x PI x SUM(d^2/4) x (health/5) x (location/5) x count
 * נוסחת ערך (דקל): V = 37.5 x fronds x k x (health/5) x (location/5) x count
 *
 * GOV_TEMPLATE_B64 (תבנית Excel 480KB) => js/data/GovTemplate.js
 * =================================================================
 */

//  TREE TABLE — ADD / REMOVE ROW
// ═══════════════════════════════════════════════════════════════
function clearAllPhotos() {
  if (!confirm('למחוק את כל תמונות העצים?')) return;
  idbSave(currentProjectId, []).then(() => {
    document.getElementById('tree-photo-grid').innerHTML = '<div class="add-img-btn"><input type="file" accept="image/*" multiple="multiple" onchange="addPhotos(this)"><span style="font-size:1.8rem">＋</span><span>הוסף תמונות</span></div>';
    markUnsaved();
  });
}

function clearAllTrees() {
  if (!confirm('למחוק את כל שורות העצים?')) return;
  document.getElementById('tree-body').innerHTML = '';
  markUnsaved();
}

function addRow(data) {
  rowCounter++;
  const id = rowCounter;
  const d = data || {};

  const tbody = document.getElementById('tree-tbody');
  const tr = document.createElement('tr');
  tr.id = 'tr-' + id;
  tr.dataset.rid = id;

  // Score selects helper
  const scoreOpts = (val) =>
    SCORE_OPTS.map(v => `<option value="${v}"${String(v) === String(val || '') ? ' selected' : ''}>${v}</option>`).join('');

  // Status select
  const statOpts = STATUS_OPTS.map(v =>
    `<option value="${v}"${v === (d.status||'') ? ' selected' : ''}>${v || '—'}</option>`
  ).join('');

  // TreeORpolygon select
  const TREE_TYPE_OPTS = ['', 'עץ', 'פוליגון'];
  const treeTypeOpts = TREE_TYPE_OPTS.map(v =>
    `<option value="${v}"${v === (d.treeType||'') ? ' selected' : ''}>${v || '—'}</option>`
  ).join('');

  tr.innerHTML = `
    <td style="text-align:center;padding:3px 4px"><input type="checkbox" class="row-check" onchange="onRowCheck()"></td>
    <td style="text-align:center;color:#aaa;font-size:.68rem;padding:3px 4px">${id}</td>
    <td><select class="f-treetype" onchange="markUnsaved()" style="min-width:65px">${treeTypeOpts}</select></td>
    <td><input type="text" class="f-num" value="${esc(d.num||'')}" oninput="markUnsaved()" style="min-width:55px"></td>
    <td><input type="number" class="f-count" value="${d.count||1}" min="1" oninput="calcRow(${id});markUnsaved()" style="min-width:38px"></td>
    <td><div class="sp-wrap">
      <input type="text" class="f-species" value="${esc(d.species||'')}" autocomplete="off"
        oninput="spInput(this);markUnsaved()"
        onkeydown="spKey(event,this)"
        onfocus="spInput(this)"
        style="min-width:155px;width:100%">
      <div class="sp-drop"></div>
    </div></td>
    <td><input type="number" class="f-height" value="${d.height||''}" min="0" step="0.5" oninput="markUnsaved()" style="min-width:46px"></td>
    <td><input type="number" class="f-diam1" value="${d.diam1||d.diam||''}" min="0" step="0.1" oninput="calcRow(${id});markUnsaved()" style="min-width:56px" placeholder="ראשי"></td>
    <td><input type="number" class="f-diam2" value="${d.diam2||''}" min="0" step="0.1" oninput="calcRow(${id});markUnsaved()" style="min-width:56px" placeholder="2"></td>
    <td><input type="number" class="f-diam3" value="${d.diam3||''}" min="0" step="0.1" oninput="calcRow(${id});markUnsaved()" style="min-width:56px" placeholder="3"></td>
    <select class="f-spec-val" style="display:none" onchange="calcRow(${id});markUnsaved()">${scoreOpts(d.specVal)}</select>
    <td class="cc" id="specval-disp-${id}" style="font-weight:600;text-align:center"></td>
    <td><select class="f-canopy" onchange="calcRow(${id});markUnsaved()">${scoreOpts(d.canopy)}</select></td>
    <td><select class="f-health" onchange="calcRow(${id});markUnsaved()">${scoreOpts(d.health)}</select></td>
    <td><select class="f-loc" onchange="calcRow(${id});markUnsaved()">${scoreOpts(d.location)}</select></td>
    <td class="cc" id="total-${id}"></td>
    <td class="cc" id="valclass-${id}" style="font-size:.62rem;white-space:normal;max-width:90px"></td>
    <td><input type="number" class="f-rootrad" value="${d.rootRad||''}" min="0" step="0.5" oninput="markUnsaved()" style="min-width:50px"></td>
    <td class="cc value-cell" id="value-${id}"><input type="number" class="f-value-override" min="0" step="0.01" placeholder="אוטו'" oninput="onValueOverride(${id})" ondblclick="resetValueOverride(${id})" style="width:100%;border:none;background:transparent;text-align:center;font-size:inherit;color:#7d5a00;font-weight:700;min-width:85px"></td>
    <td><input type="text" class="f-notes" value="${esc(d.notes||'')}" oninput="markUnsaved()" style="min-width:135px"></td>
    <td><select class="f-status" onchange="markUnsaved()">${statOpts}</select></td>
    <td><input type="text" class="f-explain" value="${esc(d.explain||'')}" oninput="markUnsaved()" style="min-width:95px"></td>
    <td><button class="del-row-btn" onclick="removeRow(${id})" title="מחק שורה">✕</button></td>
  `;

  tbody.appendChild(tr);
  calcRow(id);
  // Restore manual value override if saved
  if (d.valueManual && d.valueManual !== '') {
    const valEl = document.getElementById('value-' + id);
    if (valEl) {
      const inp = valEl.querySelector('.f-value-override');
      if (inp) {
        inp.value = d.valueManual;
        inp.dataset.manual = '1';
        inp.style.color = '#c0390b';
        valEl.dataset.num = parseFloat(d.valueManual) || 0;
      }
    }
  }
  updateRowCount();
  return id;
}

// ═══════════════════════════════════════════════════════════════
//  UNDO SYSTEM — זיכרון 5 פעולות אחרונות
// ═══════════════════════════════════════════════════════════════
const UNDO_LIMIT = 5;
const undoStack = [];

function pushUndo(action) {
  undoStack.push(action);
  if (undoStack.length > UNDO_LIMIT) undoStack.shift(); // מחק את הישנה ביותר
  updateUndoHint();
}

function updateUndoHint() {
  let hint = document.getElementById('undo-hint');
  if (!hint) {
    hint = document.createElement('div');
    hint.id = 'undo-hint';
    hint.style.cssText = 'position:fixed;bottom:18px;left:18px;background:rgba(30,30,30,.82);color:#fff;' +
      'padding:7px 14px;border-radius:8px;font-size:.76rem;font-family:Heebo,sans-serif;' +
      'z-index:999;opacity:0;transition:opacity .3s;pointer-events:none;direction:rtl';
    document.body.appendChild(hint);
  }
  if (undoStack.length > 0) {
    hint.textContent = `↩ Ctrl+Z לביטול (${undoStack.length}/5)`;
    hint.style.opacity = '1';
    clearTimeout(hint._timer);
    hint._timer = setTimeout(() => { hint.style.opacity = '0'; }, 3000);
  } else {
    hint.style.opacity = '0';
  }
}

function performUndo() {
  if (!undoStack.length) return;
  const action = undoStack.pop();
  if (action.type === 'removeRow') {
    const tbody = document.getElementById('tree-tbody');
    if (action.nextSiblingId) {
      const sibling = document.getElementById('tr-' + action.nextSiblingId);
      if (sibling) { tbody.insertBefore(action.el, sibling); }
      else tbody.appendChild(action.el);
    } else {
      tbody.appendChild(action.el);
    }
    // מספר מחדש
    tbody.querySelectorAll('tr[data-rid] .f-num').forEach((inp, idx) => { inp.value = idx + 1; });
    markUnsaved(); updateRowCount();
  } else if (action.type === 'deletePhoto') {
    idbLoad(currentProjectId).then(photos => {
      photos = photos || [];
      photos.splice(action.index, 0, action.photo);
      idbSave(currentProjectId, photos).then(() => {
        renderPhotos(photos);
        markUnsaved();
      });
    });
  }
  updateUndoHint();
}

// האזן ל-Ctrl+Z
document.addEventListener('keydown', function(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
    e.preventDefault();
    performUndo();
  }
});

function removeRow(id) {
  const tr = document.getElementById('tr-' + id);
  if (!tr) return;
  // שמור ב-undo לפני מחיקה
  const nextSibling = tr.nextElementSibling;
  pushUndo({
    type: 'removeRow',
    el: tr,
    nextSiblingId: nextSibling ? nextSibling.dataset.rid : null
  });
  tr.remove();
  // מספר מחדש
  document.querySelectorAll('#tree-tbody tr[data-rid] .f-num').forEach((inp, idx) => {
    inp.value = idx + 1;
  });
  markUnsaved();
  updateRowCount();
}

function clearAllRows() {
  document.getElementById('tree-tbody').innerHTML = '';
  rowCounter = 0;
  markUnsaved();
  updateRowCount();
}

function updateRowCount() {
  const rows = getAllRows();
  const total = rows.reduce((s, r) => s + (parseInt(r.count) || 1), 0);
  document.getElementById('row-count-label').textContent =
    rows.length > 0 ? `${rows.length} שורות | ${total} עצים` : '';
}

// ── Number formatter matching government "General" format ──────
// Rounds to 6 decimals (removes float noise like 2976.7200000000003→2976.72)
// then strips trailing zeros — so 486 stays 486, 4612.032 stays 4612.032
// ── Smart tree number sort: 7 < 7A < 7B < 8 < 10 < 10A ──────
function cmpTreeNum(a, b) {
  const parse = s => {
    const m = String(s || '').trim().match(/^(\d+)([A-Za-zא-ת]*)$/);
    if (m) return [parseInt(m[1]), m[2].toUpperCase()];
    const n = parseFloat(s);
    return [isNaN(n) ? 0 : n, ''];
  };
  const [na, sa] = parse(a);
  const [nb, sb] = parse(b);
  return na !== nb ? na - nb : sa < sb ? -1 : sa > sb ? 1 : 0;
}

function fmtVal(v) {
  const cleaned = parseFloat(v.toFixed(6)); // kill float noise
  return cleaned.toLocaleString('he-IL', { maximumFractionDigits: 6 });
}

function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ═══════════════════════════════════════════════════════════════
//  FORMULA CALCULATION
// ═══════════════════════════════════════════════════════════════
function getSpeciesData(speciesStr) {
  // Returns {k, t} — k = ערך המין, t = 1 (non-palm) or 2 (palm)
  if (!speciesStr) return null;
  const s = speciesStr.trim();
  // Helper to wrap raw value
  const wrap = v => (typeof v === 'object') ? v : {k: v, t: 1};
  // Exact match first
  if (SPECIES_DATA[s] !== undefined) return wrap(SPECIES_DATA[s]);
  // Partial match
  const key = Object.keys(SPECIES_DATA).find(k =>
    s.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(s.toLowerCase())
  );
  return key ? wrap(SPECIES_DATA[key]) : null;
}

function getSpeciesK(speciesStr, specVal) {
  // Legacy: returns combined k for backward compatibility (for d² formula)
  const data = getSpeciesData(speciesStr);
  if (data) return data.k * 20 * 0.785;  // 0.785 = π/4, converts from area formula to d² formula
  return (K_BY_SPECVAL[specVal] || 10.0);
}

// Parse diameter string "30" or "30, 30" → sum of squares
function parseDiamSumSq(diamStr) {
  if (!diamStr) return 0;
  const parts = String(diamStr).split(/[,،\s]+/).map(x => parseFloat(x.trim())).filter(x => x > 0);
  if (!parts.length) return 0;
  return parts.reduce((sum, d) => sum + d * d, 0);
}

function getBaseValue(diamStr) {
  // Parse diameter - handle "30, 30" or "30" etc.
  const clean = String(diamStr || '').split(/[,;\s]+/)[0].trim();
  const diam = parseFloat(clean);
  if (!diam || diam <= 0) return 0;

  // (legacy - kept for compatibility but no longer used)
  return 0;
}



function calcRow(id) {
  const tr = document.getElementById('tr-' + id);
  if (!tr) return;

  const get = cls => tr.querySelector('.' + cls)?.value || '';
  const getN = cls => parseFloat(get(cls)) || 0;

  const health = getN('f-health');
  const loc = getN('f-loc');
  const specVal = getN('f-spec-val');
  const canopy = getN('f-canopy');
  const count = parseInt(get('f-count')) || 1;
  const diam1 = get('f-diam1');
  const diam2 = get('f-diam2');
  const diam3 = get('f-diam3');
  // Build combined diam string for parseDiamSumSq (sum of squares of all provided diameters)
  const diamParts = [diam1, diam2, diam3].filter(v => v && parseFloat(v) > 0).join(',');
  const species = get('f-species');

  // Total score (0-20)
  const total = health + loc + specVal + canopy;
  const totalEl = document.getElementById('total-' + id);
  if (totalEl) totalEl.textContent = total > 0 ? total : '';

  // Value classification
  let vc = '';
  if (total >= 17) vc = 'ערכיות גבוהה מאוד';
  else if (total >= 14) vc = 'ערכיות גבוהה';
  else if (total >= 7) vc = 'ערכיות בינונית';
  else if (total > 0) vc = 'ערכיות נמוכה';

  const vcEl = document.getElementById('valclass-' + id);
  if (vcEl) vcEl.textContent = vc;

  // Show specVal in read-only display cell
  const specValDispEl = document.getElementById('specval-disp-' + id);
  if (specValDispEl) specValDispEl.textContent = String(specVal);

  // ─────────────────────────────────────────────────────────────
  // EXACT Government of Israel Ministry of Agriculture formula:
  //
  // NON-PALM (type 1):
  //   V = 20 × specK × 3.14 × Σ((d/2)²) × (health/5) × (location/5) × count
  //
  // PALM (type 2):
  //   V = 37.5 × frondCount × specK × (health/5) × (location/5) × count
  //   (frondCount is stored in diam1 field for palm trees)
  // ─────────────────────────────────────────────────────────────
  let value = 0;
  const specData = getSpeciesData(species);
  const specK_actual = specData ? specData.k : (specVal > 0 ? specVal * 0.2 : 0.5);
  const isPalm = specData ? specData.t === 2 : false;

  if (!isPalm) {
    // Non-palm: sum of trunk cross-section areas using π=3.14
    const diams = [diam1, diam2, diam3].map(v => parseFloat(v)).filter(v => v > 0);
    const sumArea = diams.reduce((s, d) => s + 3.14 * (d / 2) * (d / 2), 0);
    if (sumArea > 0 && health > 0 && loc > 0) {
      value = 20 * specK_actual * sumArea * (health / 5) * (loc / 5) * count;
    }
  } else {
    // Palm: frond count stored in diam1
    const frondCount = parseFloat(diam1) || 0;
    if (frondCount > 0 && health > 0 && loc > 0) {
      value = 37.5 * frondCount * specK_actual * (health / 5) * (loc / 5) * count;
    }
  }

  const valEl = document.getElementById('value-' + id);
  if (valEl) {
    const inp = valEl.querySelector('.f-value-override');
    // Only auto-fill if user hasn't manually overridden
    if (inp && !inp.dataset.manual) {
      if (value > 0) {
        const cleaned = parseFloat(value.toFixed(6));
        inp.value = cleaned;
        inp.placeholder = '';
        inp.title = 'ערך מחושב אוטומטית. ניתן לערוך ידנית.';
        valEl.dataset.num = cleaned;
      } else {
        inp.value = '';
        inp.placeholder = '0 ₪';
        valEl.dataset.num = '0';
        inp.title = 'ערך מחושב: 0';
        inp.style.color = '#999';
      }
    } else if (inp && inp.dataset.manual) {
      // Keep manual value
      valEl.dataset.num = parseFloat(inp.value) || 0;
    }
  }
}

// ═══════════════════════════════════════════════════════════════
//  SEARCH / FILTER
// ═══════════════════════════════════════════════════════════════
function filterTable() {
  const q = (document.getElementById('tree-search')?.value || '').trim().toLowerCase();
  const st = document.getElementById('tree-filter-status')?.value || '';
  const rows = document.querySelectorAll('#tree-tbody tr[data-rid]');
  let visible = 0;

  rows.forEach(tr => {
    const species = (tr.querySelector('.f-species')?.value || '').toLowerCase();
    const num     = (tr.querySelector('.f-num')?.value || '').toLowerCase();
    const status  = (tr.querySelector('.f-status')?.value || '').trim();
    const notes   = (tr.querySelector('.f-notes')?.value || '').toLowerCase();

    const matchQ = !q || species.includes(q) || num.includes(q) || notes.includes(q);
    const matchSt = !st || (st === '__none__' ? status === '' : status === st);

    if (matchQ && matchSt) { tr.style.display = ''; visible++; }
    else tr.style.display = 'none';
  });

  const total = rows.length;
  const fc = document.getElementById('filter-count');
  const clearBtn = document.getElementById('filter-clear-btn');
  const hasFilter = q || st;
  if (fc) fc.textContent = hasFilter ? `מציג ${visible} מתוך ${total}` : '';
  if (clearBtn) clearBtn.style.display = hasFilter ? '' : 'none';
}

function clearFilter() {
  const s = document.getElementById('tree-search');
  const fs = document.getElementById('tree-filter-status');
  if (s) s.value = '';
  if (fs) fs.value = '';
  filterTable();
}

// ═══════════════════════════════════════════════════════════════
//  CHECKBOX + BULK EDIT
// ═══════════════════════════════════════════════════════════════
function onRowCheck() {
  updateBulkBar();
}

function toggleAllChecks(masterCb) {
  const rows = document.querySelectorAll('#tree-tbody tr[data-rid]');
  rows.forEach(tr => {
    if (tr.style.display === 'none') return; // skip filtered-out rows
    const cb = tr.querySelector('.row-check');
    if (cb) cb.checked = masterCb.checked;
  });
  updateBulkBar();
}

function clearAllChecks() {
  document.querySelectorAll('#tree-tbody .row-check').forEach(cb => cb.checked = false);
  const master = document.getElementById('check-all');
  if (master) master.checked = false;
  updateBulkBar();
}

function updateBulkBar() {
  const checked = document.querySelectorAll('#tree-tbody .row-check:checked');
  const bar = document.getElementById('bulk-edit-bar');
  const countEl = document.getElementById('bulk-selected-count');
  if (bar) bar.style.display = checked.length > 0 ? 'flex' : 'none';
  if (countEl) countEl.textContent = `${checked.length} שורות נבחרו`;
  // reset selects
  ['bulk-status-sel','bulk-health-sel','bulk-loc-sel'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
}

function applyBulkEdit() {
  const newStatus = document.getElementById('bulk-status-sel')?.value;
  const newHealth = document.getElementById('bulk-health-sel')?.value;
  const newLoc    = document.getElementById('bulk-loc-sel')?.value;

  if (!newStatus && !newHealth && !newLoc) {
    alert('בחר לפחות שדה אחד לעריכה');
    return;
  }

  const checked = document.querySelectorAll('#tree-tbody .row-check:checked');
  checked.forEach(cb => {
    const tr = cb.closest('tr');
    if (!tr) return;
    const id = parseInt(tr.dataset.rid);
    if (newStatus !== '') {
      const sel = tr.querySelector('.f-status');
      if (sel) sel.value = newStatus.trim();
    }
    if (newHealth !== '') {
      const sel = tr.querySelector('.f-health');
      if (sel) { sel.value = newHealth; calcRow(id); }
    }
    if (newLoc !== '') {
      const sel = tr.querySelector('.f-loc');
      if (sel) { sel.value = newLoc; calcRow(id); }
    }
  });

  markUnsaved();
  clearAllChecks();
}

function openBulkDeleteModal() {
  document.getElementById('bulk-delete-modal').style.display = 'flex';
  // reset
  document.querySelectorAll('input[name="bd-type"]')[0].checked = true;
  document.getElementById('bd-single-val').value = '';
  document.getElementById('bd-from-val').value = '';
  document.getElementById('bd-to-val').value = '';
  document.getElementById('bd-fromonly-val').value = '';
  document.getElementById('bd-preview').textContent = '';
  updateBulkDeleteUI();
}

function closeBulkDeleteModal() {
  document.getElementById('bulk-delete-modal').style.display = 'none';
}

function updateBulkDeleteUI() {
  const type = document.querySelector('input[name="bd-type"]:checked')?.value;
  document.getElementById('bd-single').style.display = type === 'single' ? '' : 'none';
  document.getElementById('bd-range').style.display  = type === 'range'  ? '' : 'none';
  document.getElementById('bd-from').style.display   = type === 'from'   ? '' : 'none';
  document.getElementById('bd-preview').textContent = '';
}

function executeBulkDelete() {
  const type = document.querySelector('input[name="bd-type"]:checked')?.value;
  const trs = Array.from(document.querySelectorAll('#tree-tbody tr[data-rid]'));
  const total = trs.length;
  let toDelete = [];

  if (type === 'single') {
    const n = parseInt(document.getElementById('bd-single-val').value);
    if (!n || n < 1 || n > total) {
      document.getElementById('bd-preview').textContent = `⚠️ מספר שורה לא תקין (1–${total})`;
      return;
    }
    toDelete = [trs[n - 1]];
  } else if (type === 'range') {
    const from = parseInt(document.getElementById('bd-from-val').value);
    const to   = parseInt(document.getElementById('bd-to-val').value);
    if (!from || !to || from < 1 || to > total || from > to) {
      document.getElementById('bd-preview').textContent = `⚠️ טווח לא תקין (1–${total})`;
      return;
    }
    toDelete = trs.slice(from - 1, to);
  } else if (type === 'from') {
    const from = parseInt(document.getElementById('bd-fromonly-val').value);
    if (!from || from < 1 || from > total) {
      document.getElementById('bd-preview').textContent = `⚠️ מספר שורה לא תקין (1–${total})`;
      return;
    }
    toDelete = trs.slice(from - 1);
  }

  if (!toDelete.length) return;
  if (!confirm(`למחוק ${toDelete.length} שורות?`)) return;

  toDelete.forEach(tr => tr.remove());
  updateRowCount();
  markUnsaved();
  closeBulkDeleteModal();
}

function resetValueOverride(id) {
  const valEl = document.getElementById('value-' + id);
  if (!valEl) return;
  const inp = valEl.querySelector('.f-value-override');
  if (!inp) return;
  delete inp.dataset.manual;
  inp.value = '';
  inp.style.color = '';
  calcRow(id);
  markUnsaved();
}

function onValueOverride(id) {
  const valEl = document.getElementById('value-' + id);
  if (!valEl) return;
  const inp = valEl.querySelector('.f-value-override');
  if (!inp) return;
  if (inp.value !== '') {
    inp.dataset.manual = '1';
    inp.style.color = '#c0390b';
    inp.title = 'ערך ידני. לחץ פעמיים לאיפוס אוטומטי.';
    valEl.dataset.num = parseFloat(inp.value) || 0;
  } else {
    delete inp.dataset.manual;
    inp.style.color = '';
    calcRow(id); // recalc auto
  }
  markUnsaved();
}

function collectRows() {
  const rows = [];
  document.querySelectorAll('#tree-tbody tr[data-rid]').forEach(tr => {
    const id = tr.dataset.rid;
    const get = cls => tr.querySelector('.' + cls)?.value || '';
    const valEl = document.getElementById('value-' + id);
    const totalEl = document.getElementById('total-' + id);
    const vcEl = document.getElementById('valclass-' + id);
    rows.push({
      treeType: get('f-treetype'),
      num: get('f-num'),
      species: get('f-species'),
      count: get('f-count'),
      height: get('f-height'),
      diam1: get('f-diam1'),
      diam2: get('f-diam2'),
      diam3: get('f-diam3'),
      health: get('f-health'),
      location: get('f-loc'),
      specVal: get('f-spec-val'),
      canopy: get('f-canopy'),
      totalScore: totalEl?.textContent || '',
      valClass: vcEl?.textContent || '',
      rootRad: get('f-rootrad'),
      value: valEl?.dataset.num || '0',
      valueManual: (() => { const inp = valEl?.querySelector('.f-value-override'); return inp?.dataset.manual ? inp.value : ''; })(),
      notes: get('f-notes'),
      status: get('f-status'),
      explain: get('f-explain')
    });
  });
  return rows;
}

function getAllRows() {
  return collectRows();
}

// ═══════════════════════════════════════════════════════════════
//  EXCEL IMPORT
// ═══════════════════════════════════════════════════════════════
function importExcel(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const wb = XLSX.read(e.target.result, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      if (!raw.length) { showAlert('הקובץ ריק', 'err'); return; }

      // Find header row — try first 3 rows, use the one that contains known column names
      const knownCols = ['מספר', 'מין', 'כמות', 'גובה', 'קוטר', 'מיקום', 'בריאות', 'ערכיות', 'המלצות'];
      let headerRowIdx = 0;
      for (let r = 0; r < Math.min(3, raw.length); r++) {
        const rowStr = (raw[r] || []).map(h => String(h)).join('|');
        if (knownCols.some(k => rowStr.includes(k))) { headerRowIdx = r; break; }
      }

      // First row = headers
      const headers = (raw[headerRowIdx] || []).map(h => String(h).trim());
      const ci = {};
      headers.forEach((h, i) => { ci[h] = i; });

      // Map headers to field names (flexible matching)
      const colMap = {
        treeType:findCol(ci, ['האם עץ/פוליגון', 'עץ/פוליגון', 'treetype']),
        num:     findCol(ci, ['מספר עץ/פוליגון', 'מספר העץ/פוליגון', 'מספר עץ', 'מספר', 'id', 'num']),
        species: findCol(ci, ['מין העץ עברי-לועזי', 'מין העץ/תיאור הפוליגון', 'מין העץ', 'species', 'מין']),
        count:   findCol(ci, ['כמות עצים', 'כמות', 'count']),
        height:  findCol(ci, ["גובה העץ (מ')", 'גובה', 'height']),
        diam1:   findCol(ci, ['קוטר גזע ראשי (ס"מ)', 'קוטר גזע מרכזי (ס"מ)', 'קוטר גזע', 'קוטר', 'diameter', 'diam']),
        diam2:   findCol(ci, ['קוטר גזע 2 (ס"מ)', 'קוטר 2']),
        diam3:   findCol(ci, ['קוטר גזע 3 (ס"מ)', 'קוטר 3']),
        health:  findCol(ci, ['ניקוד מצב בריאותי', 'מצב בריאותי (0-5)', 'מצב בריאותי', 'בריאות', 'health']),
        location:findCol(ci, ['ניקוד מיקום העץ', 'מיקום העץ (0-5)', 'מיקום', 'location']),
        specVal: findCol(ci, ['ניקוד ערך מין העץ', 'ערך מין העץ (0-5)', 'ערך מין העץ', 'ערך מין', 'species value']),
        canopy:  findCol(ci, ['ניקוד חופת העץ', 'חופת העץ (0-5)', 'חופת העץ', 'חופת', 'canopy']),
        rootRad: findCol(ci, ["רדיוס אזור שורשים מוגן (מ')", "אזור שורשים מוגן רדיוס במ'", 'רדיוס שורשים', 'rootrad']),
        notes:   findCol(ci, ['הערות אגרונום', 'הערות', 'notes']),
        status:  findCol(ci, ['סטטוס מוצע', 'המלצות', 'סטטוס', 'status']),
        explain: findCol(ci, ['הערות מתכנן', 'הסבר', 'explain'])
      };

      clearAllRows();
      let imported = 0;
      for (let i = headerRowIdx + 1; i < raw.length; i++) {
        const row = raw[i];
        if (!row.some(c => c !== '')) continue;
        const g = (key) => colMap[key] !== undefined ? String(row[colMap[key]] || '').trim() : '';
        const gn = (key) => colMap[key] !== undefined ? parseFloat(row[colMap[key]]) || '' : '';

        // NOTE: intentionally NOT importing: שווי עץ מומלץ (col 20), החלטה (21), תגובת פקיד (22), שגיאות (23)
        // Value is always recalculated fresh from species k-factor and scores
        addRow({
          treeType: g('treeType'),
          num: g('num'),
          species: g('species'),
          count: gn('count') || 1,
          height: gn('height'),
          diam1: gn('diam1'),
          diam2: gn('diam2'),
          diam3: gn('diam3'),
          health: gn('health'),
          location: gn('location'),
          specVal: gn('specVal'),
          canopy: gn('canopy'),
          rootRad: gn('rootRad'),
          notes: g('notes'),
          status: g('status'),
          explain: g('explain')
        });
        imported++;
      }

      showAlert(`✅ יובאו ${imported} שורות מהקובץ בהצלחה`, 'ok');
      markUnsaved();
    } catch(err) {
      showAlert('⚠️ שגיאה בקריאת הקובץ: ' + err.message, 'err');
    }
    input.value = '';
  };
  reader.readAsBinaryString(file);
}

function findCol(ci, names) {
  for (const n of names) {
    if (ci[n] !== undefined) return ci[n];
    // partial match
    const key = Object.keys(ci).find(k => k.includes(n) || n.includes(k));
    if (key !== undefined) return ci[key];
  }
  return undefined;
}

function showAlert(msg, type) {
  const el = document.getElementById('import-alert');
  el.textContent = msg;
  el.className = 'import-alert ' + type;
  el.style.display = 'block';
  setTimeout(() => el.style.display = 'none', 5000);
}

// ═══════════════════════════════════════════════════════════════
//  EXCEL EXPORT
// ═══════════════════════════════════════════════════════════════
function exportGovExcel() {
  const proj = getProject(currentProjectId);
  const allRows = collectRows();
  const rows = allRows
    .filter(r => (r.species && r.species.trim()) || (r.num && r.num.trim()))
    .sort((a,b) => cmpTreeNum(a.num, b.num));
  if (!rows.length) { alert('אין נתונים לייצוא'); return; }

  // GOV_TEMPLATE_B64 is defined in js/data/GovTemplate.js

  try {
    const wb = XLSX.read(GOV_TEMPLATE_B64, { type: 'base64' });
    const ws = wb.Sheets['טבלת סקר עצים'];

    // Clear user-input columns in rows 3-1497
    const USER_COLS = ['A','B','C','E','G','H','I','J','L','M','N','P','Q','R','S','T'];
    for (let row = 3; row <= 1497; row++) {
      USER_COLS.forEach(col => { ws[col + row] = { t: 'z' }; });
    }

    const setCell = (col, row, val) => {
      if (val === '' || val === null || val === undefined) return;
      const addr = col + row;
      const num = parseFloat(val);
      ws[addr] = (!isNaN(num) && String(val).trim() !== '') ? { t: 'n', v: num } : { t: 's', v: String(val) };
    };

    rows.forEach((r, idx) => {
      const excelRow = idx + 3;
      if (excelRow > 1497) return;
      const sp = r.species || '';
      const commaIdx = sp.indexOf(',');
      const heName = commaIdx > -1 ? sp.slice(0, commaIdx).trim() : sp;
      const nv = v => { const p = parseFloat(v); return isNaN(p) ? '' : p; };

      setCell('A', excelRow, r.treeType || '');
      setCell('B', excelRow, r.num || '');
      setCell('C', excelRow, nv(r.count) || 1);
      setCell('E', excelRow, heName);
      setCell('G', excelRow, nv(r.height));
      setCell('H', excelRow, nv(r.diam1));
      setCell('I', excelRow, nv(r.diam2));
      setCell('J', excelRow, nv(r.diam3));
      setCell('L', excelRow, nv(r.canopy));
      setCell('M', excelRow, nv(r.health));
      setCell('N', excelRow, nv(r.location));
      setCell('P', excelRow, nv(r.rootRad));
      setCell('Q', excelRow, nv(r.value) || '');
      setCell('R', excelRow, r.notes || '');
      setCell('S', excelRow, r.status || '');
      setCell('T', excelRow, r.explain || '');
    });

    ws['!ref'] = 'A1:AE' + Math.min(rows.length + 2, 1497);

    const projName = (proj ? proj.name : 'סקר_עצים').replace(/[^\u0590-\u05FFa-zA-Z0-9_-]/g, '_');
    const date = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, projName + '_ממשלתי_' + date + '.xlsx');

  } catch(e) {
    console.error('Export error:', e);
    alert('שגיאה בייצוא: ' + e.message);
  }
}


function exportExcel() {
  const allRows = collectRows();
  const rows = allRows
    .filter(r => (r.species && r.species.trim()) || (r.num && (parseFloat(r.diam1)>0 || parseFloat(r.health)>0)))
    .sort((a,b) => cmpTreeNum(a.num, b.num));
  if (!rows.length) { alert('אין נתונים לייצוא'); return; }

  const wsData = [
    ['האם עץ/פוליגון', 'מספר העץ/פוליגון', 'מין העץ/תיאור הפוליגון', 'כמות עצים',
     "גובה העץ (מ')", 'קוטר גזע ראשי (ס"מ)', 'קוטר גזע 2 (ס"מ)', 'קוטר גזע 3 (ס"מ)',
     'מצב בריאותי (0-5)', 'מיקום העץ (0-5)', 'ערך מין העץ (0-5)', 'חופת העץ (0-5)',
     'סך ערכיות העץ/פוליגון (0-20)', 'ערכיות העץ',
     "אזור שורשים מוגן רדיוס במ'",
     'שווי העץ (₪)',
     'הערות אגרונום', 'סטטוס מוצע', 'הערות מתכנן']
  ];

  rows.forEach(r => {
    wsData.push([
      r.treeType||'', r.num, r.species, r.count, r.height,
      r.diam1||'', r.diam2||'', r.diam3||'',
      r.health, r.location, r.specVal, r.canopy,
      r.totalScore, r.valClass, r.rootRad,
      parseInt(r.value) || '',
      r.notes, r.status, r.explain
    ]);
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  if (!ws['!cols']) ws['!cols'] = [];
  ws['!cols'] = wsData[0].map((_, i) => ({ wch: [10,10,25,8,8,10,10,10,10,8,10,8,12,16,12,14,30,12,20][i] || 12 }));
  XLSX.utils.book_append_sheet(wb, ws, 'סיכום נתוני סקר עצים בטבלה');
  const proj = getProject(currentProjectId);
  const fname = (proj?.name || 'סקר_עצים').replace(/\s+/g,'_') + '_' + new Date().toISOString().slice(0,10) + '.xlsx';
  XLSX.writeFile(wb, fname);
}

function exportTableCsv() {
  const allRows = collectRows();
  const rows = allRows
    .filter(r => (r.species && r.species.trim()) || (r.num && (parseFloat(r.diam1)>0 || parseFloat(r.health)>0)))
    .sort((a,b) => cmpTreeNum(a.num, b.num));
  if (!rows.length) { alert('אין נתונים'); return; }
  const headers = ['עץ/פוליגון','מספר','מין','כמות','גובה','קוטר_ראשי','קוטר_2','קוטר_3','בריאות','מיקום','ערך_מין','חופת','סך_ערכיות','ערכיות','רדיוס_שורשים','שווי_₪','הערות','סטטוס','הערות_מתכנן'];
  const csv = '\uFEFF' + headers.join(',') + '\n' +
    rows.map(r => [r.treeType||'',r.num,r.species,r.count,r.height,r.diam1||'',r.diam2||'',r.diam3||'',r.health,r.location,r.specVal,r.canopy,r.totalScore,r.valClass,r.rootRad,r.value,r.notes,r.status,r.explain].map(v=>`"${String(v||'').replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'tree_survey.csv';
  a.click();
}

// ═══════════════════════════════════════════════════════════════
//  IMAGES
// ═══════════════════════════════════════════════════════════════

// Compress image to max 1400px and 0.75 quality
function compressImage(file, maxW, maxH, quality, callback) {
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let w = img.width, h = img.height;
      const ratio = Math.min(maxW/w, maxH/h, 1);
      canvas.width = Math.round(w*ratio);
      canvas.height = Math.round(h*ratio);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      callback(canvas.toDataURL('image/jpeg', quality));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}
function handleCoverImg(input) {
  const file = input.files[0];
  if (!file) return;
  compressImage(file, 1400, 1000, 0.8, src => {
    const proj = getProject(currentProjectId) || {};
    proj.coverImg = src;
    putProject(currentProjectId, proj);
    document.getElementById('cover-preview').src = src;
    document.getElementById('cover-preview').style.display = 'block';
    document.getElementById('cover-icon').style.display = 'none';
    document.getElementById('cover-label').style.display = 'none';
    markUnsaved();
  });
}

function handleAerialImg(input) {
  const file = input.files[0];
  if (!file) return;
  compressImage(file, 1400, 1000, 0.8, src => {
    const proj = getProject(currentProjectId) || {};
    proj.aerialImg = src;
    putProject(currentProjectId, proj);
    document.getElementById('aerial-preview').src = src;
    document.getElementById('aerial-preview').style.display = 'block';
    document.getElementById('aerial-icon').style.display = 'none';
    document.getElementById('aerial-label').style.display = 'none';
    markUnsaved();
  });
}
function handleSitePlanImg(input) {
  const file = input.files[0];
  if (!file) return;
  compressImage(file, 1400, 1000, 0.8, src => {
    const proj = getProject(currentProjectId) || {};
    proj.sitePlanImg = src;
    putProject(currentProjectId, proj);
    document.getElementById('siteplan-preview').src = src;
    document.getElementById('siteplan-preview').style.display = 'block';
    document.getElementById('siteplan-icon').style.display = 'none';
    document.getElementById('siteplan-label').style.display = 'none';
    markUnsaved();
  });
}

function addPhotos(input) {
  const files = Array.from(input.files);
  if (!files.length) return;
  let loaded = 0;
  const newPhotos = [];
  files.forEach(file => {
    compressImage(file, 1200, 900, 0.65, src => {
      newPhotos.push({ src, label: file.name.replace(/\.[^.]+$/, '') });
      loaded++;
      if (loaded === files.length) {
        idbLoad(currentProjectId).then(existing => {
          const all = (existing || []).concat(newPhotos);
          idbSave(currentProjectId, all).then(() => {
            renderPhotos(all);
            markUnsaved();
          });
        });
      }
    });
  });
  input.value = '';
}

function renderPhotos(photos) {
  const grid = document.getElementById('tree-photo-grid');
  const addBtn = grid.querySelector('.add-img-btn') || (() => {
    const d = document.createElement('div');
    d.className = 'add-img-btn';
    d.innerHTML = `<input type="file" accept="image/*" multiple onchange="addPhotos(this)"><span style="font-size:1.8rem">＋</span><span>הוסף תמונות</span>`;
    return d;
  })();

  grid.innerHTML = '';
  (photos || []).forEach((p, i) => {
    const div = document.createElement('div');
    div.className = 'img-card';
    div.innerHTML = `
      <div class="img-card-lbl">
        <input type="text" value="${esc(p.label)}" onchange="updatePhotoLabel(${i},this.value)" placeholder="תיאור">
      </div>
      <img src="${p.src}" alt="${p.label}">
      <button class="img-del" onclick="deletePhoto(${i})">✕</button>`;
    grid.appendChild(div);
  });

  // Add button
  const ab = document.createElement('div');
  ab.className = 'add-img-btn';
  ab.innerHTML = `<input type="file" accept="image/*" multiple onchange="addPhotos(this)"><span style="font-size:1.8rem">＋</span><span>הוסף תמונות</span>`;
  grid.appendChild(ab);
}

function updatePhotoLabel(i, val) {
  idbLoad(currentProjectId).then(photos => {
    if (photos && photos[i] !== undefined) {
      photos[i].label = val;
      idbSave(currentProjectId, photos).then(() => markUnsaved());
    }
  });
}

function deletePhoto(i) {
  idbLoad(currentProjectId).then(photos => {
    photos = photos || [];
    pushUndo({ type: 'deletePhoto', index: i, photo: photos[i] });
    photos.splice(i, 1);
    idbSave(currentProjectId, photos).then(() => {
      renderPhotos(photos);
      markUnsaved();
    });
  });
}

/* ── Namespace ── */
const TreeManager = {
  addRow, removeRow, clearAllRows, calcRow,
  collectRows, getAllRows, filterTable, clearFilter,
  pushUndo, performUndo, updateUndoHint,
  importExcel, exportGovExcel, exportTableCsv, exportExcel,
  applyBulkEdit, executeBulkDelete,
  getSpeciesData, getSpeciesK, parseDiamSumSq, getBaseValue,
};
