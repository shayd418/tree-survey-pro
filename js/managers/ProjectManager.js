/**
 * ProjectManager.js
 * =================================================================
 * מסך הבית ועורך הפרויקט:
 *   renderHomeScreen()     — הצגת רשימת פרויקטים
 *   openNewProjectModal()  — מודאל פרויקט חדש
 *   createProject()        — יצירה ומעבר לעורך
 *   openProject(id)        — טעינת פרויקט קיים
 *   saveProject()          — שמירת כל נתוני הפרויקט
 *   backToHome()           — חזרה לרשימה
 *   switchTab(name)        — מעבר בין לשוניות
 *   markUnsaved()          — סימון שינוי לא שמור
 *
 * State: currentProjectId, unsaved — מוגדרים ב-SpeciesData.js (טוען ראשון)
 *
 * להוספת שדה פרויקט: ערוך collectDetails() + loadDetails()
 * להוספת לשונית: הוסף ב-switchTab() + ב-HTML (.tab-nav)
 * =================================================================
 */

//  HOME SCREEN
// ═══════════════════════════════════════════════════════════════
function renderHomeScreen() {
  _updateHomeLogoBtn();
  const _unel=document.getElementById("home-uname"); if(_unel&&CU){const _u=gUsers()[CU];_unel.textContent="שלום, "+(_u&&_u.name?_u.name:CU);}
  const projects = getProjects();
  const list = document.getElementById('proj-list');
  const ids = Object.keys(projects).sort((a, b) =>
    (projects[b].lastModified || 0) - (projects[a].lastModified || 0)
  );

  if (ids.length === 0) {
    list.innerHTML = `<div class="empty-state">
      <span class="ei">🗂️</span>
      <p>אין פרויקטים עדיין<br>לחץ על "פרויקט חדש" להתחלה</p>
    </div>`;
    return;
  }

  list.innerHTML = ids.map(id => {
    const p = projects[id];
    const rows = p.trees || [];
    const total = rows.reduce((s, r) => s + (parseInt(r.count) || 1), 0);
    const cut = rows.filter(r => r.status === 'כריתה').reduce((s, r) => s + (parseInt(r.count) || 1), 0);
    const pres = rows.filter(r => r.status === 'שימור').reduce((s, r) => s + (parseInt(r.count) || 1), 0);
    const totalVal = rows.reduce((s, r) => s + (parseFloat(r.value) || 0), 0);
    const date = p.lastModified ? new Date(p.lastModified).toLocaleDateString('he-IL') : '—';
    return `
    <div class="proj-card" onclick="openProject('${id}')">
      <div class="proj-icon">🌲</div>
      <div class="proj-info">
        <div class="proj-name">${p.name || 'ללא שם'}</div>
        <div class="proj-meta">${[p.details?.city, p.details?.address].filter(Boolean).join(' | ')} &nbsp;·&nbsp; עודכן: ${date}</div>
        <div class="proj-stats">
          <span class="proj-stat trees">🌳 ${total} עצים</span>
          ${cut > 0 ? `<span class="proj-stat cut">✂️ ${cut} כריתה</span>` : ''}
          ${pres > 0 ? `<span class="proj-stat pres">✅ ${pres} שימור</span>` : ''}
          ${totalVal > 0 ? `<span class="proj-stat" style="background:#f4ecf7;color:#6c3483">💰 ${Math.round(totalVal).toLocaleString('he-IL')} ₪</span>` : ''}
        </div>
      </div>
      <div class="proj-actions" onclick="event.stopPropagation()">
        <button class="proj-btn open" onclick="openProject('${id}')">פתח</button>
        <button class="proj-btn del" onclick="confirmDelete('${id}', '${(p.name||'').replace(/'/g, "\\'")}')">מחק</button>
      </div>
    </div>`;
  }).join('');
}

function openNewProjectModal() {
  document.getElementById('new-proj-modal').classList.add('open');
  setTimeout(() => document.getElementById('np-name').focus(), 100);
}

function closeModal() {
  document.getElementById('new-proj-modal').classList.remove('open');
  ['np-name','np-city','np-address','np-client'].forEach(id => {
    document.getElementById(id).value = '';
  });
}

function createProject() {
  const name = document.getElementById('np-name').value.trim();
  if (!name) { alert('יש להזין שם לפרויקט'); return; }
  const id = genId();
  const proj = {
    id,
    name,
    lastModified: Date.now(),
    details: {
      city: document.getElementById('np-city').value.trim(),
      address: document.getElementById('np-address').value.trim(),
      client: document.getElementById('np-client').value.trim(),
    },
    trees: [],
    photos: [],
    coverImg: null,
    aerialImg: null,
    sitePlanImg: null
  };
  putProject(id, proj);
  closeModal();
  openProject(id);
}

function confirmDelete(id, name) {
  if (confirm(`למחוק את הפרויקט "${name}"?\nפעולה זו אינה ניתנת לביטול.`)) {
    deleteProject(id);
    renderHomeScreen();
  }
}

// ═══════════════════════════════════════════════════════════════
//  PROJECT EDITOR
// ═══════════════════════════════════════════════════════════════
function openProject(id) {
  currentProjectId = id;
  const proj = getProject(id);
  if (!proj) return;

  // Load details
  document.getElementById('editor-title').textContent = proj.name;
  document.getElementById('d-proj-name').value = proj.details?.projName || proj.name || '';
  document.getElementById('d-survey-num').value = proj.details?.surveyNum || '';
  document.getElementById('d-year').value = proj.details?.year || new Date().getFullYear();
  document.getElementById('d-city').value = proj.details?.city || '';
  document.getElementById('d-neighborhood').value = proj.details?.neighborhood || '';
  document.getElementById('d-address').value = proj.details?.address || '';
  document.getElementById('d-street').value = proj.details?.street || '';
  document.getElementById('d-streetnum').value = proj.details?.streetnum || '';
  document.getElementById('d-client').value = proj.details?.client || '';
  document.getElementById('d-contact').value = proj.details?.contact || '';
  document.getElementById('d-phone').value = proj.details?.phone || '';
  document.getElementById('d-email').value = proj.details?.email || '';
  (()=>{ const raw=proj.details?.docdate||''; if(raw&&raw.includes('/')){const [dd,mm,yyyy]=raw.split('/');document.getElementById('d-docdate').value=yyyy+'-'+mm+'-'+dd;}else{document.getElementById('d-docdate').value=raw;} })();
  document.getElementById('d-expert').value = proj.details?.expert || '';
  const eeEl = document.getElementById('d-expert-email'); if(eeEl) eeEl.value = proj.details?.expertEmail || '';
  document.getElementById('d-intro').value = proj.details?.intro || '';
  document.getElementById('d-scope').value = proj.details?.scope || '';
  document.getElementById('d-notes').value = proj.details?.notes || '';
  const spTitle = proj.details?.sitePlanTitle || 'תכנית העמדה כללית ע"ג בינוי מתוכנן';
  setTimeout(() => setSitePlanTitle(spTitle), 80);

  // Load images
  if (proj.coverImg) {
    document.getElementById('cover-preview').src = proj.coverImg;
    document.getElementById('cover-preview').style.display = 'block';
    document.getElementById('cover-icon').style.display = 'none';
    document.getElementById('cover-label').style.display = 'none';
  } else {
    document.getElementById('cover-preview').style.display = 'none';
    document.getElementById('cover-icon').style.display = '';
    document.getElementById('cover-label').style.display = '';
  }
  if (proj.aerialImg) {
    document.getElementById('aerial-preview').src = proj.aerialImg;
    document.getElementById('aerial-preview').style.display = 'block';
    document.getElementById('aerial-icon').style.display = 'none';
    document.getElementById('aerial-label').style.display = 'none';
  }
  if (proj.sitePlanImg) {
    document.getElementById('siteplan-preview').src = proj.sitePlanImg;
    document.getElementById('siteplan-preview').style.display = 'block';
    document.getElementById('siteplan-icon').style.display = 'none';
    document.getElementById('siteplan-label').style.display = 'none';
  } else {
    document.getElementById('aerial-preview').style.display = 'none';
    document.getElementById('aerial-icon').style.display = '';
    document.getElementById('aerial-label').style.display = '';
  }

  // Render tree rows
  document.getElementById('tree-tbody').innerHTML = '';
  rowCounter = 0;
  (proj.trees || []).forEach(t => addRow(t));

  // טען תמונות מ-IndexedDB (עם מיגרציה אוטומטית מ-localStorage)
  idbLoad(id).then(idbPhotos => {
    if (idbPhotos !== null) {
      // תמונות כבר ב-IDB
      renderPhotos(idbPhotos);
    } else if (proj.photos && proj.photos.length > 0) {
      // מיגרציה: העבר תמונות ישנות מ-localStorage ל-IDB
      idbSave(id, proj.photos).then(() => {
        renderPhotos(proj.photos);
        // נקה מ-localStorage
        const allProj = getProjects();
        if (allProj[id]) { delete allProj[id].photos; saveProjects(allProj); }
      });
    } else {
      renderPhotos([]);
    }
  }).catch(() => renderPhotos(proj.photos || []));

  // Switch to editor
  showScreen('screen-editor');
  setTimeout(_loadAgriImgs, 50);
  // Load overlay name
  setTimeout(() => {
    const p = getProject(currentProjectId);
    const el = document.getElementById('siteplan-overlay-name');
    if (el) el.textContent = p?.sitePlanOverlay ? 'תמונה נטענת ✓' : 'לא נבחרה תמונה';
  }, 60);
  switchTab('details');
  markSaved();
}

function backToHome() {
  if (unsaved) {
    if (!confirm('יש שינויים שלא נשמרו. לצאת בלי לשמור?')) return;
  }
  currentProjectId = null;
  showScreen('screen-home');
  renderHomeScreen();
}

function showS(id) { showScreen(id); }
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  if (id==='screen-register') { regDisc=0; refreshPlanPrices(); }
  if (id==='ap-settings') admLoadSettings();
}

function switchTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === 'tab-' + name));
  if (name === 'analysis') buildAnalysis();
}

// ═══════════════════════════════════════════════════════════════
//  SAVE / UNSAVED
// ═══════════════════════════════════════════════════════════════
function markUnsaved() {
  unsaved = true;
  document.getElementById('save-dot').classList.add('unsaved');
  document.getElementById('save-text').textContent = 'לא נשמר';
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => saveProject(), 8000); // auto-save after 8 sec idle
}

function markSaved() {
  unsaved = false;
  document.getElementById('save-dot').classList.remove('unsaved');
  document.getElementById('save-text').textContent = 'נשמר';
}

function saveProject() {
  if (!currentProjectId) return;
  const proj = getProject(currentProjectId) || {};

  // Collect details
  proj.name = document.getElementById('d-proj-name').value || proj.name;
  proj.lastModified = Date.now();
  proj.details = {
    projName: document.getElementById('d-proj-name').value,
    surveyNum: document.getElementById('d-survey-num').value,
    year: document.getElementById('d-year').value,
    city: document.getElementById('d-city').value,
    neighborhood: document.getElementById('d-neighborhood').value,
    street: document.getElementById('d-street').value,
    streetnum: document.getElementById('d-streetnum').value,
    address: document.getElementById('d-address').value,
    client: document.getElementById('d-client').value,
    contact: document.getElementById('d-contact').value,
    phone: document.getElementById('d-phone').value,
    email: document.getElementById('d-email').value,
    docdate: (()=>{ const v=document.getElementById('d-docdate').value; if(!v)return ''; const [y,m,d]=v.split('-'); return d+'/'+m+'/'+y; })(),
    expert: document.getElementById('d-expert').value,
    expertEmail: document.getElementById('d-expert-email')?.value || '',
    intro: document.getElementById('d-intro').value,
    scope: document.getElementById('d-scope').value,
      notes: document.getElementById('d-notes').value,
    sitePlanTitle: document.getElementById('d-siteplan-title')?.value || '',
  };

  // Collect tree rows
  proj.trees = collectRows();

  // תמונות עצים ב-IndexedDB — לא צריך לשמור כאן
  const existing = getProject(currentProjectId) || {};
  proj.coverImg = existing.coverImg || null;
  proj.aerialImg = existing.aerialImg || null;
  proj.sitePlanImg = existing.sitePlanImg || null;
  proj.agriImg1 = existing.agriImg1 || null;
  proj.agriImg2 = existing.agriImg2 || null;
  proj.sitePlanOverlay = existing.sitePlanOverlay || null;

  putProject(currentProjectId, proj);
  document.getElementById('editor-title').textContent = proj.name;
  markSaved();
}

// ═══════════════════════════════════════════════════════════════

/* ── Namespace ── */
const ProjectManager = {
  renderHomeScreen, openNewProjectModal, closeModal, createProject,
  openProject, saveProject, backToHome, switchTab, markUnsaved, markSaved,
};
