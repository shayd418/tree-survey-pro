/**
 * app.js — נקודת כניסה ראשית
 * =================================================================
 * נטען אחרון — כל ה-managers כבר זמינים.
 *
 * State globals מוגדרים בקבצים שלהם:
 *   currentProjectId, rowCounter, unsaved, autoSaveTimer — SpeciesData.js
 *   CU, selPlanVal, regDisc — AuthManager.js
 *   undoStack — TreeManager.js
 *   _autoSaveDirHandle — BackupManager.js
 *   _ovState, _imgState — ImageManager.js
 *
 * להוספת feature חדש:
 *   1. צור קובץ XxxManager.js
 *   2. הוסף אותו ב-index.html לפני app.js
 *   3. הוסף alias גלובלי אם צריך
 * =================================================================
 */

// init via DOMContentLoaded → resumeSession;

// Warn before leaving if unsaved
window.addEventListener('beforeunload', e => {
  if (unsaved) {
    e.preventDefault();
    e.returnValue = 'יש שינויים שלא נשמרו';
  }
});

// ════════════════════════════════════════════════════════════════

/* ── Init on page load ── */
document.addEventListener('DOMContentLoaded', () => {
  resumeSession();
});

/* ── showS: קיצור ל-showScreen (משמש ב-HTML onclick) ── */
function showS(id) { showScreen(id); }
