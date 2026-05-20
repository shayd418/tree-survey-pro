/**
 * BackupManager.js
 * =================================================================
 * גיבוי ושחזור נתונים:
 *   saveToJsonFile()     — הורדת JSON (גיבוי ידני)
 *   loadFromJsonFile()   — טעינת JSON מקובץ
 *   pickAutoSaveFolder() — שמירה אוטומטית לתיקייה (Chrome/Edge)
 *   manualAutoSave()     — שמירה ידנית לתיקייה שנבחרה
 *   disconnectAutoSave() — ניתוק תיקייה
 *   _buildBackupData()   — בניית אובייקט גיבוי
 *   _scheduleAutoSave()  — debounce 2 שניות
 *
 * File System Access API — Chrome ו-Edge בלבד.
 * הגיבוי כולל: פרויקטים, משתמשים, קופונים, הגדרות.
 *
 * להוספת גיבוי לענן: הוסף saveToCloud() עם sbDB()
 * =================================================================
 */

//  JSON BACKUP & AUTO-SAVE TO FILE SYSTEM
// ═══════════════════════════════════════════════════════════════

let _autoSaveDirHandle = null;
let _autoSaveFileName = 'tree-survey-backup.json';
let _autoSaveDebounce = null;
const AUTOSAVE_KEY = 'tsm_autosave_fname';

// ── ממשק פאנל ──
function toggleBackupPanel() {
  const body = document.getElementById('backup-panel-body');
  const lbl  = document.getElementById('backup-toggle-lbl');
  const open = body.style.display === 'none';
  body.style.display = open ? 'block' : 'none';
  lbl.textContent = open ? 'הסתר ▴' : 'הצג ▾';
}

function _updateAutoSaveUI() {
  const lbl  = document.getElementById('autosave-folder-label');
  const btnS = document.getElementById('btn-manual-save');
  const btnD = document.getElementById('btn-disconnect');
  const badge= document.getElementById('backup-file-badge');
  if (_autoSaveDirHandle) {
    const fname = localStorage.getItem(AUTOSAVE_KEY) || _autoSaveFileName;
    lbl.textContent  = '✓ מחובר — ' + fname;
    lbl.style.color  = '#a8d5ba';
    btnS.style.display = 'inline-block';
    btnD.style.display = 'inline-block';
    badge.style.display = 'inline-block';
  } else {
    lbl.textContent  = 'לא מחובר — לחץ "בחר תיקייה" להגדרה';
    lbl.style.color  = 'rgba(255,255,255,.5)';
    btnS.style.display = 'none';
    btnD.style.display = 'none';
    badge.style.display = 'none';
  }
}

function _setAutoSaveStatus(msg, ok) {
  const el = document.getElementById('autosave-status');
  if (!el) return;
  el.textContent = msg;
  el.style.color = ok ? '#a8d5ba' : '#f1948a';
  clearTimeout(el._t);
  if (msg) el._t = setTimeout(() => { el.textContent = ''; }, 4000);
}

// ── בחירת תיקייה לשמירה אוטומטית ──
async function pickAutoSaveFolder() {
  if (!window.showDirectoryPicker) {
    alert('⚠️ דפדפן זה לא תומך בשמירה לתיקייה.\nנסה Chrome או Edge.');
    return;
  }
  try {
    _autoSaveDirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
    const uname = CU || 'data';
    _autoSaveFileName = 'tree-survey-' + uname + '.json';
    localStorage.setItem(AUTOSAVE_KEY, _autoSaveFileName);
    _updateAutoSaveUI();
    await _doAutoSaveToFile();
    _setAutoSaveStatus('✓ תיקייה נבחרה — הנתונים נשמרו', true);
    // פתח את הפאנל אם סגור
    document.getElementById('backup-panel-body').style.display = 'block';
    document.getElementById('backup-toggle-lbl').textContent = 'הסתר ▴';
  } catch(e) {
    if (e.name !== 'AbortError') _setAutoSaveStatus('שגיאה: ' + e.message, false);
  }
}

async function _doAutoSaveToFile() {
  if (!_autoSaveDirHandle) return;
  try {
    const data = _buildBackupData();
    const json = JSON.stringify(data, null, 2);
    const fh = await _autoSaveDirHandle.getFileHandle(_autoSaveFileName, { create: true });
    const wr = await fh.createWritable();
    await wr.write(json);
    await wr.close();
    const now = new Date().toLocaleTimeString('he-IL');
    _setAutoSaveStatus('✓ נשמר אוטומטית ב-' + now, true);
  } catch(e) {
    if (e.name === 'NotAllowedError') {
      _setAutoSaveStatus('⚠️ הרשאה נדחתה — בחר תיקייה מחדש', false);
      _autoSaveDirHandle = null;
      _updateAutoSaveUI();
    } else {
      _setAutoSaveStatus('שגיאת שמירה: ' + e.message, false);
    }
  }
}

function _scheduleAutoSave() {
  if (!_autoSaveDirHandle) return;
  clearTimeout(_autoSaveDebounce);
  _autoSaveDebounce = setTimeout(_doAutoSaveToFile, 3000);
}

async function manualAutoSave() {
  await _doAutoSaveToFile();
}

function disconnectAutoSave() {
  _autoSaveDirHandle = null;
  _updateAutoSaveUI();
  _setAutoSaveStatus('', false);
}

// ── בניית אובייקט גיבוי ──
function _buildBackupData() {
  return {
    version: '3.0',
    exportedAt: new Date().toISOString(),
    username: CU,
    projects: getProjects()
  };
}

// ── הורדת JSON (גיבוי ידני) ──
function saveToJsonFile() {
  const data = _buildBackupData();
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  const now  = new Date().toISOString().slice(0,10);
  a.href     = url;
  a.download = 'tree-survey-' + (CU||'backup') + '-' + now + '.json';
  a.click();
  URL.revokeObjectURL(url);
}

// ── טעינת JSON מקובץ ──
function loadFromJsonFile(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.projects) throw new Error('קובץ לא תקין — אין שדה projects');
      const existing = getProjects();
      let imported = 0, skipped = 0;
      for (const id in data.projects) {
        const remote = data.projects[id];
        const local  = existing[id];
        // עדכן רק אם הגיבוי חדש יותר
        if (!local || (remote.lastModified||0) >= (local.lastModified||0)) {
          existing[id] = remote;
          imported++;
        } else {
          skipped++;
        }
      }
      saveProjects(existing);
      renderHomeScreen();
      // הצג סיכום
      const msg = '✅ טעינה הצליחה!\n' + imported + ' פרויקטים יובאו' +
                  (skipped ? '\n' + skipped + ' פרויקטים דולגו (יש גרסה חדשה יותר)' : '');
      alert(msg);
    } catch(err) {
      alert('❌ שגיאה בטעינת הקובץ:\n' + err.message);
    }
    input.value = '';
  };
  reader.readAsText(file);
}

// ── חיבור שמירה אוטומטית לשמירת פרויקט ──
// (נקרא מ-saveProject הקיים)
const _origSaveProject = typeof saveProject === 'function' ? saveProject : null;
function _hookAutoSaveOnProjectSave() {
  // hook into markUnsaved flow — _scheduleAutoSave נקרא כשיש שינוי
  const origMark = window.markUnsaved;
  if (origMark) {
    window.markUnsaved = function() {
      origMark.call(this);
      _scheduleAutoSave();
    };
  }
}

document.addEventListener('DOMContentLoaded', () => {
  _hookAutoSaveOnProjectSave();
  _updateAutoSaveUI();
});



/* ── Namespace ── */
const BackupManager = {
  saveToJsonFile, loadFromJsonFile, toggleBackupPanel,
  pickAutoSaveFolder, manualAutoSave, disconnectAutoSave,
};
