/**
 * ImageManager.js
 * =================================================================
 * ניהול כל התמונות באפליקציה:
 *   compressImage()         — דחיסה ל-canvas (max 1400px)
 *   handleCoverImg()        — תמונת כריכה
 *   handleAerialImg()       — תצלום אוויר
 *   handleSitePlanImg()     — תכנית מגרש
 *   addPhotos(input)        — העלאה קבוצתית + IndexedDB
 *   renderPhotos(photos)    — גלריית תמונות עצים
 *   handleSitePlanOverlay() — שכבת overlay עם drag+scale
 *   onAgriImgChange()       — תמונות אישור משרד החקלאות
 *   openLogoModal()         — מודאל לוגו חברה
 *   saveLogo() / clearLogo() — שמירה/הסרת לוגו
 *   _initImgDrag()          — zoom+drag לתמונות בדוח
 *
 * להוספת סוג תמונה חדש:
 *   הוסף handleXxxImg() + שמור base64 ב-putProject()
 * =================================================================
 */

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

/* ── Site-plan overlay + Logo + Agri images ── */

// ══ SITEPLAN OVERLAY ══
function handleSitePlanOverlay(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const data = e.target.result;
    const proj = getProject(currentProjectId);
    if (!proj) return;
    proj.sitePlanOverlay = data;
    putProject(currentProjectId, proj);
    document.getElementById('siteplan-overlay-name').textContent = file.name;
    markUnsaved();
  };
  reader.readAsDataURL(file);
}

function clearSitePlanOverlay() {
  const proj = getProject(currentProjectId);
  if (!proj) return;
  delete proj.sitePlanOverlay;
  putProject(currentProjectId, proj);
  document.getElementById('siteplan-overlay-name').textContent = 'לא נבחרה תמונה';
  document.getElementById('siteplan-overlay-inp').value = '';
  markUnsaved();
}

// Overlay drag
let _ovState = null;
function _overlayDragStart(e) {
  e.preventDefault();
  e.stopPropagation();
  const img = document.getElementById('siteplan-overlay-img');
  if (!img) return;
  const wrap = img.parentElement;
  const wRect = wrap.getBoundingClientRect();
  const iRect = img.getBoundingClientRect();
  const startX = e.touches ? e.touches[0].clientX : e.clientX;
  const startY = e.touches ? e.touches[0].clientY : e.clientY;
  // Current position as % of wrap
  const startLeft = ((iRect.left + iRect.width/2 - wRect.left) / wRect.width) * 100;
  const startTop  = ((iRect.top  + iRect.height/2 - wRect.top)  / wRect.height) * 100;
  _ovState = { startX, startY, startLeft, startTop, wRect };
  const onMove = ev => {
    const cx = ev.touches ? ev.touches[0].clientX : ev.clientX;
    const cy = ev.touches ? ev.touches[0].clientY : ev.clientY;
    const dx = ((cx - _ovState.startX) / _ovState.wRect.width)  * 100;
    const dy = ((cy - _ovState.startY) / _ovState.wRect.height) * 100;
    img.style.left = Math.max(0, Math.min(100, _ovState.startLeft + dx)) + '%';
    img.style.top  = Math.max(0, Math.min(100, _ovState.startTop  + dy)) + '%';
    img.style.transform = `translate(-50%,-50%) scale(${_ovScale||1})`;
  };
  const onUp = () => {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    document.removeEventListener('touchmove', onMove);
    document.removeEventListener('touchend', onUp);
    _saveOverlayState();
  };
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
  document.addEventListener('touchmove', onMove, {passive:false});
  document.addEventListener('touchend', onUp);
}

let _ovScale = 1;
function changeOverlayScale(delta) {
  _ovScale = Math.max(0.1, Math.min(5, (_ovScale||1) + delta));
  const img = document.getElementById('siteplan-overlay-img');
  if (img) img.style.transform = `translate(-50%,-50%) scale(${_ovScale})`;
  _saveOverlayState();
}

function _saveOverlayState() {
  const img = document.getElementById('siteplan-overlay-img');
  if (!img || !currentProjectId) return;
  const proj = getProject(currentProjectId);
  if (!proj) return;
  proj.sitePlanOverlayPos = {
    left: img.style.left,
    top:  img.style.top,
    scale: _ovScale || 1
  };
  putProject(currentProjectId, proj);
}

// ══ AGRI IMAGES ══
function onAgriImgChange(n, input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const data = e.target.result;
    const thumb = document.getElementById('agri-img'+n+'-thumb');
    const ph = document.getElementById('agri-img'+n+'-placeholder');
    if (thumb) { thumb.src = data; thumb.style.display = 'block'; }
    if (ph) ph.style.display = 'none';
    putProject(currentProjectId, Object.assign(getProjects()[currentProjectId]||{}, {['agriImg'+n]: data}));
    markUnsaved();
  };
  reader.readAsDataURL(file);
}

function clearAgriImg(n) {
  const thumb = document.getElementById('agri-img'+n+'-thumb');
  const ph = document.getElementById('agri-img'+n+'-placeholder');
  if (thumb) thumb.style.display = 'none';
  if (ph) ph.style.display = 'block';
  document.getElementById('agri-img'+n+'-input').value = '';
  const proj = getProjects()[currentProjectId];
  if (proj) { delete proj['agriImg'+n]; putProject(currentProjectId, proj); markUnsaved(); }
}

function saveAgriImgsToAllProjects() {
  const all = getProjects();
  const proj = all[currentProjectId];
  if (!proj) return;
  const a1 = proj.agriImg1, a2 = proj.agriImg2;
  Object.values(all).forEach(p => {
    if (a1) p.agriImg1 = a1; else delete p.agriImg1;
    if (a2) p.agriImg2 = a2; else delete p.agriImg2;
  });
  saveProjects(all);
  const msg = document.getElementById('agri-save-msg');
  if (msg) { msg.style.display='inline-block'; setTimeout(()=>{ msg.style.display='none'; }, 2500); }
}

function _loadAgriImgs() {
  const proj = getProjects()[currentProjectId];
  if (!proj) return;
  [1,2].forEach(n => {
    const img = proj['agriImg'+n];
    const thumb = document.getElementById('agri-img'+n+'-thumb');
    const ph = document.getElementById('agri-img'+n+'-placeholder');
    if (!thumb) return;
    if (img) { thumb.src = img; thumb.style.display='block'; if(ph) ph.style.display='none'; }
    else { thumb.style.display='none'; if(ph) ph.style.display='block'; }
  });
}

// ══ LOGO SYSTEM ══
function openLogoModal() {
  const logo = _loadLogo();
  document.getElementById('logo-tagline').value = logo.tagline || '';
  const prev = document.getElementById('logo-preview-area');
  const prevImg = document.getElementById('logo-preview-img');
  const prevText = document.getElementById('logo-preview-text');
  if (logo.img) {
    prevImg.src = logo.img;
    prevText.textContent = logo.tagline || '';
    prev.style.display = 'block';
  } else {
    prev.style.display = 'none';
  }
  window._logoNewImg = null;
  document.getElementById('logo-modal').style.display = 'flex';
}

function closeLogoModal() {
  document.getElementById('logo-modal').style.display = 'none';
}

function onLogoFileChange(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    window._logoNewImg = ev.target.result;
    const prevImg = document.getElementById('logo-preview-img');
    const prevText = document.getElementById('logo-preview-text');
    const prev = document.getElementById('logo-preview-area');
    prevImg.src = window._logoNewImg;
    prevText.textContent = document.getElementById('logo-tagline').value;
    prev.style.display = 'block';
  };
  reader.readAsDataURL(file);
}

function saveLogo() {
  const tagline = document.getElementById('logo-tagline').value.trim();
  const img = window._logoNewImg || _loadLogo().img || '';
  const logo = {img, tagline};
  localStorage.setItem('tsm_user_logo', JSON.stringify(logo));
  _updateHomeLogoBtn();
  closeLogoModal();
}

function clearLogo() {
  localStorage.removeItem('tsm_user_logo');
  window._logoNewImg = null;
  document.getElementById('logo-preview-area').style.display = 'none';
  document.getElementById('logo-file-input').value = '';
  document.getElementById('logo-tagline').value = '';
  _updateHomeLogoBtn();
}

function _loadLogo() {
  try { return JSON.parse(localStorage.getItem('tsm_user_logo') || '{}'); } catch(e) { return {}; }
}

function _updateHomeLogoBtn() {
  const logo = _loadLogo();
  const preview = document.getElementById('home-logo-preview');
  const placeholder = document.getElementById('home-logo-placeholder');
  const img = document.getElementById('home-logo-img');
  if (logo.img) {
    img.src = logo.img;
    preview.style.display = 'inline';
    placeholder.style.display = 'none';
  } else {
    preview.style.display = 'none';
    placeholder.style.display = 'inline';
  }
}

function _injectLogoBoxes() {
  const logo = _loadLogo();
  const slot = document.getElementById('pf-logo-slot');
  if (!slot) return;
  slot.innerHTML = '';
  if (logo.img) {
    const img = document.createElement('img');
    img.src = logo.img;
    img.style.cssText = 'max-height:28px;max-width:70px;object-fit:contain;display:block;margin:0 auto;';
    slot.appendChild(img);
  }
  if (logo.tagline) {
    const tag = document.createElement('span');
    tag.style.cssText = 'font-size:.6rem;color:#555;display:block;text-align:center;margin-top:-2px;';
    tag.textContent = logo.tagline;
    slot.appendChild(tag);
  }
}

function backToEditor() {
  showScreen('screen-editor');
}

// ── Cover image height control + drag ──
// ── Generic image zoom+drag (cover, aerial, siteplan) ──
const _imgState = {};

function _applyImgTransform(id) {
  const img = document.getElementById(id + '-main-img');
  if (!img) return;
  const s = _imgState[id] || {tx:0, ty:0, z:1};
  img.style.transform = 'translate(calc(-50% + ' + s.tx + 'px), calc(-50% + ' + s.ty + 'px)) scale(' + s.z + ')';
}

function changeImgScale(id, delta) {
  if (!_imgState[id]) _imgState[id] = {tx:0, ty:0, z:1};
  _imgState[id].z = Math.max(0.2, Math.min(8, _imgState[id].z + delta * 0.15));
  _applyImgTransform(id);
  const lbl = document.getElementById(id + '-img-scale-label');
  if (lbl) lbl.textContent = Math.round(_imgState[id].z * 100) + '%';
}

function _initImgDrag(id) {
  const wrap = document.getElementById(id + '-img-wrap');
  if (!wrap || wrap._dragInit) return;
  wrap._dragInit = true;
  if (!_imgState[id]) _imgState[id] = {tx:0, ty:0, z:1};
  let dragging = false, sx, sy, sox, soy;
  wrap.addEventListener('mousedown', e => {
    if (e.target.tagName === 'BUTTON') return;
    dragging = true;
    sx = e.clientX; sy = e.clientY;
    sox = _imgState[id].tx; soy = _imgState[id].ty;
    wrap.style.cursor = 'grabbing';
    e.preventDefault();
  });
  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    _imgState[id].tx = sox + e.clientX - sx;
    _imgState[id].ty = soy + e.clientY - sy;
    _applyImgTransform(id);
  });
  document.addEventListener('mouseup', () => { dragging = false; wrap.style.cursor = 'grab'; });
  wrap.addEventListener('touchstart', e => {
    if (e.target.tagName === 'BUTTON') return;
    dragging = true;
    sx = e.touches[0].clientX; sy = e.touches[0].clientY;
    sox = _imgState[id].tx; soy = _imgState[id].ty;
    e.preventDefault();
  }, {passive:false});
  document.addEventListener('touchmove', e => {
    if (!dragging) return;
    _imgState[id].tx = sox + e.touches[0].clientX - sx;
    _imgState[id].ty = soy + e.touches[0].clientY - sy;
    _applyImgTransform(id);
    e.preventDefault();
  }, {passive:false});
  document.addEventListener('touchend', () => { dragging = false; });
}

// Backward compat: cover still uses old names
function changeCoverImgScale(delta) { changeImgScale('cover', delta); }

function _initCoverImgDrag() { _initImgDrag('cover'); }

// ═══════════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════════

/* ── Namespace ── */
const ImageManager = {
  compressImage, addPhotos, renderPhotos, deletePhoto, clearAllPhotos,
  handleCoverImg, handleAerialImg, handleSitePlanImg,
  handleSitePlanOverlay, changeOverlayScale,
  onAgriImgChange, clearAgriImg,
  openLogoModal, closeLogoModal, saveLogo, clearLogo,
  changeImgScale,
};
