/**
 * ReportManager.js
 * =================================================================
 * ניתוח נתונים ויצירת דוח:
 *   buildAnalysis()        — לשונית "ניתוח וסיכום"
 *   buildReportTables()    — טבלאות הדוח בפורמט ממשרדי
 *   showReport()           — הצגת הדוח המלא כ-HTML
 *   printReport()          — הדפסה / PDF (html2pdf.js)
 *   _pgUp() / _pgDown()    — שליטה ב-page breaks
 *   backToEditor()         — חזרה לעורך
 *
 * להוספת עמוד בדוח:
 *   הוסף div.rpage ב-_doShowReport() בסדר הנכון
 * להוספת מטריקה בניתוח:
 *   הוסף חישוב + HTML ב-buildAnalysis()
 * לשינוי עיצוב הדוח:
 *   ערוך .rp, .rt, .rpage ב-css/styles.css
 * =================================================================
 */


// ═══════════════════════════════════════════════════════════════
//  ANALYSIS TAB
// ═══════════════════════════════════════════════════════════════
function buildAnalysis() {
  const allTreeRows = collectRows();
  // Filter out empty rows
  const rows = allTreeRows.filter(r => {
    const hasSpecies = r.species && r.species.trim() !== '';
    const hasNum = r.num && String(r.num).trim() !== '';
    const hasData = parseFloat(r.diam1) > 0 || parseFloat(r.health) > 0 || parseFloat(r.canopy) > 0;
    return hasSpecies || (hasNum && hasData);
  });
  const el = document.getElementById('analysis-content');

  if (!rows.length) {
    el.innerHTML = `<div style="text-align:center;padding:40px;color:var(--tl)"><div style="font-size:2.5rem;margin-bottom:10px">📊</div><div>הוסף עצים בטבלה כדי לראות ניתוח</div></div>`;
    return;
  }

  let total = 0, cut = 0, pres = 0, move = 0, notreq = 0;
  let cutVal = 0, presVal = 0, moveVal = 0, totalVal = 0;
  const bySpecies = {};

  rows.forEach(r => {
    const c = parseInt(r.count) || 1;
    const v = parseFloat(r.value) || 0;
    total += c; totalVal += v;
    if (r.status === 'כריתה') { cut += c; cutVal += v; }
    else if (r.status === 'שימור') { pres += c; presVal += v; }
    else if (r.status === 'העתקה') { move += c; moveVal += v; }
    else notreq += c;

    const sp = r.species || 'לא ידוע';
    if (!bySpecies[sp]) bySpecies[sp] = { total: 0, cut: 0, pres: 0, move: 0, notreq: 0, val: 0 };
    bySpecies[sp].total += c; bySpecies[sp].val += v;
    if (r.status === 'כריתה') bySpecies[sp].cut += c;
    else if (r.status === 'שימור') bySpecies[sp].pres += c;
    else if (r.status === 'העתקה') bySpecies[sp].move += c;
    else bySpecies[sp].notreq += c;
  });

  const pct = n => total > 0 ? Math.round(n / total * 100) : 0;
  const fmt = v => Math.round(v).toLocaleString('he-IL');

  // Species rows for analysis table
  const spRows = Object.entries(bySpecies).sort((a,b) => b[1].total - a[1].total);
  const spTableRows = spRows.map(([sp, v]) =>
    `<tr><td>${sp}</td><td>${v.total}</td><td>${v.cut||0}</td><td>${v.pres||0}</td><td>${v.move||0}</td><td>${fmt(v.val)} ₪</td></tr>`
  ).join('');

  el.innerHTML = `
    <div class="stat-grid">
      <div class="stat-card stat-pres">
        <div class="sn">${pres}</div>
        <div class="sl">שימור (${pct(pres)}%)</div>
        <div class="sv">${fmt(presVal)} ₪</div>
      </div>
      <div class="stat-card stat-cut">
        <div class="sn">${cut}</div>
        <div class="sl">כריתה (${pct(cut)}%)</div>
        <div class="sv">${fmt(cutVal)} ₪</div>
      </div>
      <div class="stat-card stat-move">
        <div class="sn">${move}</div>
        <div class="sl">העתקה (${pct(move)}%)</div>
        <div class="sv">${fmt(moveVal)} ₪</div>
      </div>
      <div class="stat-card stat-val">
        <div class="sn" style="font-size:1.3rem">${fmt(totalVal)}</div>
        <div class="sl">סה"כ שווי (₪)</div>
        <div class="sv">${total} עצים</div>
      </div>
    </div>

    <div class="scard">
      <div class="scard-title">🌿 ריכוז לפי מין עץ</div>
      <div class="at-wrap">
        <table class="at">
          <thead>
            <tr><th>מין העץ</th><th>סה"כ</th><th>כריתה</th><th>שימור</th><th>העתקה</th><th>שווי כולל (₪)</th></tr>
          </thead>
          <tbody>
            ${spTableRows}
          </tbody>
          <tfoot>
            <tr><td>סה"כ</td><td>${total}</td><td>${cut}</td><td>${pres}</td><td>${move}</td><td>${fmt(totalVal)} ₪</td></tr>
          </tfoot>
        </table>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <div class="scard">
        <div class="scard-title">✂️ ריכוז כריתות</div>
        <div class="at-wrap">
          <table class="at">
            <thead><tr><th>מין</th><th>כמות</th><th>שווי (₪)</th></tr></thead>
            <tbody>
              ${spRows.filter(([,v])=>v.cut>0).map(([sp,v])=>`<tr><td>${sp}</td><td>${v.cut}</td><td>${fmt(v.val * v.cut/v.total)} ₪</td></tr>`).join('')}
            </tbody>
            <tfoot><tr><td>סה"כ</td><td>${cut}</td><td>${fmt(cutVal)} ₪</td></tr></tfoot>
          </table>
        </div>
      </div>
      <div class="scard">
        <div class="scard-title">✅ ריכוז שימור</div>
        <div class="at-wrap">
          <table class="at">
            <thead><tr><th>מין</th><th>כמות</th><th>שווי (₪)</th></tr></thead>
            <tbody>
              ${spRows.filter(([,v])=>v.pres>0).map(([sp,v])=>`<tr><td>${sp}</td><td>${v.pres}</td><td>${fmt(v.val * v.pres/v.total)} ₪</td></tr>`).join('')}
            </tbody>
            <tfoot><tr><td>סה"כ</td><td>${pres}</td><td>${fmt(presVal)} ₪</td></tr></tfoot>
          </table>
        </div>
      </div>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════════
//  REPORT SUMMARY TABLES (matching PDF format)
// ═══════════════════════════════════════════════════════════════
function buildReportTables(rows) {
  const fmt = v => Math.round(v).toLocaleString('he-IL');

  // Aggregate by species
  const bySpecies = {};
  rows.forEach(r => {
    const sp = r.species || 'לא ידוע';
    const c = parseInt(r.count) || 1;
    const v = parseFloat(r.value) || 0;
    const vc = r.valClass || '';
    if (!bySpecies[sp]) bySpecies[sp] = {
      total: 0, cut: 0, pres: 0, move: 0,
      low: 0, mid: 0, high: 0, vhigh: 0,
      cutVal: 0, presVal: 0, moveVal: 0, val: 0
    };
    const b = bySpecies[sp];
    b.total += c; b.val += v;
    if (vc.includes('גבוהה מאוד')) b.vhigh += c;
    else if (vc.includes('גבוהה')) b.high += c;
    else if (vc.includes('בינונית')) b.mid += c;
    else if (vc.includes('נמוכה')) b.low += c;

    if (r.status === 'כריתה') { b.cut += c; b.cutVal += v; }
    else if (r.status === 'שימור') { b.pres += c; b.presVal += v; }
    else if (r.status === 'העתקה') { b.move += c; b.moveVal += v; }
  });

  // Totals
  let totTotal=0, totLow=0, totMid=0, totHigh=0, totVhigh=0;
  let totCut=0, totPres=0, totMove=0, totVal=0;
  let totCutVal=0, totPresVal=0, totMoveVal=0;
  Object.values(bySpecies).forEach(b => {
    totTotal+=b.total; totLow+=b.low; totMid+=b.mid; totHigh+=b.high; totVhigh+=b.vhigh;
    totCut+=b.cut; totPres+=b.pres; totMove+=b.move; totVal+=b.val;
    totCutVal+=b.cutVal; totPresVal+=b.presVal; totMoveVal+=b.moveVal;
  });
  const pct = (n, d) => d > 0 ? Math.round(n/d*100) : 0;

  const spList = Object.entries(bySpecies);

  // Table 1: ריכוז ערכים לפי מיני העצים
  const valRows = spList.map(([sp, b]) => `
    <tr>
      <td>${sp}</td>
      <td>${b.low || 0}</td>
      <td>${b.mid || 0}</td>
      <td>${b.high || 0}</td>
      <td>${b.vhigh || 0}</td>
      <td><strong>${b.total}</strong></td>
    </tr>`).join('');

  // Table 2: ריכוז סטטוס לפי מיני העצים
  // Only species with at least one cut/pres/move tree; total = cut+pres+move only (not "לא נדרש")
  const recSpList = spList.filter(([, b]) => (b.cut + b.pres + b.move) > 0);
  const totRec = recSpList.reduce((s, [, b]) => s + b.cut + b.pres + b.move, 0);
  const recRows = recSpList.map(([sp, b]) => {
    const recTotal = b.cut + b.pres + b.move;
    return `<tr>
      <td>${sp}</td>
      <td>${b.pres || 0}</td>
      <td>${b.cut || 0}</td>
      <td>${b.move || 0}</td>
      <td><strong>${recTotal}</strong></td>
    </tr>`;
  }).join('');

  // Table 3: סה"כ כריתות - פיצוי נופי
  const cutSpList = spList.filter(([,b]) => b.cut > 0);
  const cutValRows = cutSpList.map(([sp, b]) => `
    <tr><td>${sp}</td><td>${b.cut}</td><td>${fmt(b.cutVal)} ₪</td></tr>`).join('');

  // Table 4: סה"כ שווי שימור עצים
  const presSpList = spList.filter(([,b]) => b.pres > 0);
  const presValRows = presSpList.map(([sp, b]) => `
    <tr><td>${sp}</td><td>${b.pres}</td><td>${fmt(b.presVal)} ₪</td></tr>`).join('');

  // Table 5: סה"כ שווי העתקות
  const moveSpList = spList.filter(([,b]) => b.move > 0);
  const moveValRows = moveSpList.map(([sp, b]) => `
    <tr><td>${sp}</td><td>${b.move}</td><td>${fmt(b.moveVal)} ₪</td></tr>`).join('');

  return `
  <div class="ps-sum-values"><div class="rst">טבלת ריכוז ערכים לפי מיני העצים</div>
  <table class="rt">
    <thead><tr>
      <th>מין העץ/פוליגון</th>
      <th style="background:rgb(255,220,0);color:#222">ערכיות נמוכה</th>
      <th style="background:rgb(160,160,160);color:#fff">ערכיות בינונית</th>
      <th style="background:rgb(0,140,60);color:#fff">ערכיות גבוהה</th>
      <th style="background:rgb(200,0,0);color:#fff">ערכיות גבוהה מאוד</th>
      <th>סה"כ עצים</th>
    </tr></thead>
    <tbody>${valRows}</tbody>
    <tfoot>
      <tr style="font-weight:700">
        <td>סה"כ עצים</td>
        <td>${totLow}</td><td>${totMid}</td><td>${totHigh}</td><td>${totVhigh}</td>
        <td>${totTotal}</td>
      </tr>
      <tr>
        <td>אחוז מסה"כ</td>
        <td>${pct(totLow,totTotal)}%</td>
        <td>${pct(totMid,totTotal)}%</td>
        <td>${pct(totHigh,totTotal)}%</td>
        <td>${pct(totVhigh,totTotal)}%</td>
        <td>100%</td>
      </tr>
    </tfoot>
  </table>

  </div><div class="ps-sum-rec"><div class="rst" style="margin-top:16px">טבלת ריכוז המלצות לפי מיני העצים</div>
  <table class="rt">
    <thead><tr>
      <th>מין העץ/פוליגון</th>
      <th style="background:rgb(200,0,0);color:#fff">שימור</th>
      <th style="background:rgb(200,200,0);color:#222">כריתה</th>
      <th style="background:rgb(200,90,20);color:#fff">העתקה</th>
      <th>סה"כ עצים</th>
    </tr></thead>
    <tbody>${recRows}</tbody>
    <tfoot>
      <tr style="font-weight:700">
        <td>סה"כ עצים</td>
        <td>${totPres}</td>
        <td>${totCut}</td>
        <td>${totMove}</td>
        <td>${totRec}</td>
      </tr>
      <tr>
        <td>אחוז מסה"כ</td>
        <td>${pct(totPres,totTotal)}%</td>
        <td>${pct(totCut,totTotal)}%</td>
        <td>${pct(totMove,totTotal)}%</td>
        <td>${pct(totRec,totTotal)}%</td>
      </tr>
    </tfoot>
  </table>


  </div><div class="ps-sum-cut"><!-- ══ סה"כ כריתות - פיצוי נופי ══ -->
  <div class="rst rst-cut" style="margin-top:18px">✂️ סה"כ כריתות — פיצוי נופי</div>
  <table class="rt rt-summary">
    <thead><tr>
      <th style="width:60%">מין העץ / תיאור</th>
      <th style="width:15%">כמות</th>
      <th style="width:25%">שווי (₪)</th>
    </tr></thead>
    <tbody>${cutValRows || '<tr><td colspan="3" style="text-align:center;color:#aaa">—</td></tr>'}</tbody>
    <tfoot>
      <tr class="rt-total"><td>סה"כ</td><td>${totCut}</td><td>${fmt(totCutVal)} ₪</td></tr>
      <tr class="rt-pct"><td>אחוז מסה"כ</td><td>${pct(totCut,totTotal)}%</td><td>${pct(totCutVal,totVal)}%</td></tr>
    </tfoot>
  </table>

  </div><div class="ps-sum-pres"><!-- ══ סה"כ שווי שימור עצים ══ -->
  <div class="rst rst-pres" style="margin-top:18px">🌿 סה"כ שווי שימור עצים</div>
  <table class="rt rt-summary">
    <thead><tr>
      <th style="width:60%">מין העץ / תיאור</th>
      <th style="width:15%">כמות</th>
      <th style="width:25%">שווי (₪)</th>
    </tr></thead>
    <tbody>${presValRows || '<tr><td colspan="3" style="text-align:center;color:#aaa">—</td></tr>'}</tbody>
    <tfoot>
      <tr class="rt-total"><td>סה"כ</td><td>${totPres}</td><td>${fmt(totPresVal)} ₪</td></tr>
      <tr class="rt-pct"><td>אחוז מסה"כ</td><td>${pct(totPres,totTotal)}%</td><td>${pct(totPresVal,totVal)}%</td></tr>
    </tfoot>
  </table>

  </div><div class="ps-sum-move"><!-- ══ סה"כ שווי העתקות ══ -->
  <div class="rst rst-move" style="margin-top:18px">🚚 סה"כ שווי העתקות</div>
  <table class="rt rt-summary">
    <thead><tr>
      <th style="width:60%">מין העץ / תיאור</th>
      <th style="width:15%">כמות</th>
      <th style="width:25%">שווי (₪)</th>
    </tr></thead>
    <tbody>${moveValRows || '<tr><td colspan="3" style="text-align:center;color:#aaa">—</td></tr>'}</tbody>
    <tfoot>
      <tr class="rt-total"><td>סה"כ</td><td>${totMove}</td><td>${fmt(totMoveVal)} ₪</td></tr>
      <tr class="rt-pct"><td>אחוז מסה"כ</td><td>${pct(totMove,totTotal)}%</td><td>${pct(totMoveVal,totVal)}%</td></tr>
    </tfoot>
  </table></div>`;
}

// ═══════════════════════════════════════════════════════════════
//  REPORT GENERATION
// ═══════════════════════════════════════════════════════════════
// ── page break controls ──
function _pgDown(btn) {
  const tr = btn.closest('tr');
  if (!tr) return;
  // Don't add twice
  if (tr.previousElementSibling && tr.previousElementSibling.classList.contains('pg-break-tr')) return;
  const breakTr = document.createElement('tr');
  breakTr.className = 'pg-break-tr';
  breakTr.style.cssText = 'break-before:page;page-break-before:always;height:0;line-height:0;border:none';
  breakTr.innerHTML = '<td colspan="100" class="no-print" style="padding:0;border:none;height:0"><hr class="pg-sep show"></td>';
  tr.parentNode.insertBefore(breakTr, tr);
}

function _pgUp(btn) {
  const tr = btn.closest('tr');
  if (!tr) return;
  const prev = tr.previousElementSibling;
  if (prev && prev.classList.contains('pg-break-tr')) prev.remove();
}

function _shrinkLongCells() {
  document.querySelectorAll('.rt td').forEach(td => {
    const len = (td.textContent || '').trim().length;
    if (len > 80)       td.style.fontSize = '.52rem';
    else if (len > 40)  td.style.fontSize = '.58rem';
    else                td.style.fontSize = '';
  });
}

function showReport() {
  saveProject();
  idbLoad(currentProjectId).then(photos => _doShowReport(photos || []));
}
function _doShowReport(_reportPhotos) {
  saveProject();
  const proj = getProject(currentProjectId);
  const d = proj.details || {};
  const allRows = proj.trees || [];
  // Filter out empty/placeholder rows (no species and no meaningful data)
  const rows = allRows
    .filter(r => {
      const hasSpecies = r.species && r.species.trim() !== '';
      const hasNum = r.num && String(r.num).trim() !== '';
      const hasData = parseFloat(r.diam1) > 0 || parseFloat(r.health) > 0 || parseFloat(r.canopy) > 0;
      return hasSpecies || (hasNum && hasData);
    })
    // Sort numerically by tree number
    .sort((a, b) => cmpTreeNum(a.num, b.num));
  const photos = _reportPhotos || [];

  let total = 0, cut = 0, pres = 0, move = 0;
  let cutVal = 0, presVal = 0, moveVal = 0;
  rows.forEach(r => {
    const c = parseInt(r.count)||1, v = parseFloat(r.value)||0;
    total+=c;
    if(r.status==='כריתה'){cut+=c;cutVal+=v;}
    else if(r.status==='שימור'){pres+=c;presVal+=v;}
    else if(r.status==='העתקה'){move+=c;moveVal+=v;}
  });
  const totalVal = cutVal + presVal + moveVal;
  const pct = n => total>0?Math.round(n/total*100):0;
  const fmt = v => Math.round(v).toLocaleString('he-IL');
  const today = new Date().toLocaleDateString('he-IL');

  // Main table rows
  // פונקציית צבע לפי המלצה
  const stStyle = (st) => {
    if (st === 'שימור')              return 'background:rgb(255,0,0);color:#fff;font-weight:700;';
    if (st === 'כריתה')              return 'background:rgb(255,255,0);color:#222;font-weight:700;';
    if (st === 'העתקה')              return 'background:rgb(237,125,49);color:#fff;font-weight:700;';
    if (st === 'לא נדרש ברישיון')   return 'background:rgb(0,176,240);color:#fff;font-weight:700;';
    return '';
  };

  // פונקציית צבע לפי ערכיות
  const vcStyle = (vc) => {
    if (vc.includes('גבוהה מאוד')) return 'background:rgb(255,0,0);color:#fff;font-weight:700;';
    if (vc.includes('גבוהה'))      return 'background:rgb(0,176,80);color:#fff;font-weight:700;';
    if (vc.includes('בינונית'))    return 'background:rgb(191,191,191);color:#222;font-weight:700;';
    if (vc.includes('נמוכה'))      return 'background:rgb(255,255,0);color:#222;font-weight:700;';
    return '';
  };

  const mainRows = rows.map(r => {
    const cs = vcStyle(r.valClass || '');
    // Calculate average diameter from up to 3 values
    const diams = [r.diam1, r.diam2, r.diam3].map(v => parseFloat(v)).filter(v => v > 0);
    const avgDiam = diams.length > 0 ? (diams.reduce((s,v)=>s+v,0)/diams.length).toFixed(1) : '';
    const ri = rows.indexOf(r);
    return `<tr class="data-row" data-ri="${ri}">
      <td class="pg-ctrl no-print"><button class="pgd" onclick="_pgDown(this)" title="הורד לדף הבא">↓</button><button class="pgu" onclick="_pgUp(this)" title="החזר לדף הקודם">↑</button></td>
      <td>${r.num}</td><td>${r.count}</td><td>${r.species}</td>
      <td>${r.height||''}</td><td>${avgDiam}</td>
      <td>${r.health}</td><td>${r.location}</td><td>${r.specVal}</td><td>${r.canopy}</td>
      <td style="${cs}">${r.totalScore||''}</td><td style="${cs}">${r.valClass}</td>
      <td>${r.rootRad||''}</td>
      <td style="font-weight:700;color:#7d5a00">${parseFloat(r.value)>0?fmtVal(parseFloat(r.value))+' ₪':'0 ₪'}</td>
      <td style="font-size:.64rem">${r.notes||''}</td>
      <td style="${stStyle(r.status||'')}">${r.status||''}</td>
      <td style="font-size:.64rem">${r.explain||''}</td>
    </tr>`;
  }).join('');

  // By species table
  const bySpecies = {};
  rows.forEach(r => {
    const sp = r.species||'לא ידוע', c=parseInt(r.count)||1, v=parseFloat(r.value)||0;
    if(!bySpecies[sp]) bySpecies[sp]={total:0,cut:0,pres:0,move:0,val:0};
    bySpecies[sp].total+=c; bySpecies[sp].val+=v;
    if(r.status==='כריתה')bySpecies[sp].cut+=c;
    else if(r.status==='שימור')bySpecies[sp].pres+=c;
    else if(r.status==='העתקה')bySpecies[sp].move+=c;
  });
  const spRows2 = Object.entries(bySpecies).map(([sp,v])=>
    `<tr><td>${sp}</td><td>${v.total}</td><td>${v.cut||0}</td><td>${v.pres||0}</td><td>${v.move||0}</td><td>${fmt(v.val)} ₪</td></tr>`
  ).join('');

  // Photos HTML
  let phHtml = '';
  if (photos.length > 0) {
    // 12 photos per page (4x3 grid)
    for (let i = 0; i < photos.length; i += 10) {
      const chunk = photos.slice(i, i+10);
      phHtml += `<div class="rph">` + chunk.map(p =>
        `<div class="rph-i"><div class="rn">${p.label}</div><img src="${p.src}" alt="${p.label}"></div>`
      ).join('') + `</div>`;
      if (i + 10 < photos.length) phHtml += `<div class="pb"></div>`;
    }
  }

  document.getElementById('report-body').innerHTML = `
<div class="rp">

<!-- ══ עמוד 1: שער ══ -->
<div class="rpage rpage-cover" data-section="cover">
  <div class="rh" style="border:2px solid var(--gd);border-radius:10px;overflow:hidden;display:flex;flex-direction:column;flex:1;min-height:0;">

    <!-- כותרת -->
    <div class="rh-top">סקר עצים — ${d.projName || proj.name}</div>

    <!-- גוף -->
    <div style="display:flex;flex:1;min-height:0;overflow:hidden;">

      <!-- ימין: כל הטבלאות (55%) -->
      <div style="flex:0 0 47%;display:flex;flex-direction:column;overflow:hidden;padding:0;border-left:1px solid #c8e6c9;">

        <!-- פרטים כלליים -->
        <div style="padding:10px 16px 8px;border-bottom:1px solid #e8f5e9;overflow:hidden;">
          <div style="background:var(--gd);color:#fff;padding:3px 12px;border-radius:5px;font-size:.75rem;font-weight:700;margin-bottom:6px;text-align:right;">פרטים כלליים</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:3px 8px;">
            ${d.surveyNum?`<div class="dr" style="font-size:.71rem"><span class="dl">מספר סקר</span><span>${d.surveyNum}</span></div>`:'<div></div>'}
            <div class="dr" style="font-size:.71rem"><span class="dl">שם פרויקט</span><span>${d.projName||proj.name}</span></div>
            ${d.city?`<div class="dr" style="font-size:.71rem"><span class="dl">עיר</span><span>${d.city}</span></div>`:'<div></div>'}
            ${d.address?`<div class="dr" style="font-size:.71rem"><span class="dl">כתובת</span><span>${d.address}</span></div>`:'<div></div>'}
            ${d.client?`<div class="dr" style="font-size:.71rem"><span class="dl">מזמין</span><span>${d.client}</span></div>`:'<div></div>'}
            ${d.docdate?`<div class="dr" style="font-size:.71rem"><span class="dl">תאריך</span><span>${d.docdate}</span></div>`:'<div></div>'}
            ${d.expert?`<div class="dr" style="font-size:.71rem"><span class="dl">מומחה</span><span>${d.expert}</span></div>`:'<div></div>'}
          </div>
        </div>

        <!-- סיכום -->
        <div style="padding:8px 16px;border-bottom:1px solid #e8f5e9;overflow:hidden;">
          <div style="background:var(--gd);color:#fff;padding:3px 12px;border-radius:5px;font-size:.75rem;font-weight:700;margin-bottom:6px;text-align:right;">סיכום</div>
          <div style="font-size:.72rem;line-height:1.85;">
            <strong style="color:var(--gd)">סה"כ עצים שנסקרו: ${total}</strong><br>
            <span style="color:#1a5276">● שימור: ${pres} (${pct(pres)}%)</span> — ${fmt(presVal)} ₪<br>
            <span style="color:#c0392b">● כריתה: ${cut} (${pct(cut)}%)</span> — ${fmt(cutVal)} ₪<br>
            <span style="color:#d68910">● העתקה: ${move} (${pct(move)}%)</span> — ${fmt(moveVal)} ₪<br>
            <strong>סה"כ שווי: ${fmt(totalVal)} ₪</strong>
          </div>
        </div>

        <!-- מבוא -->
        <div style="padding:8px 16px;border-bottom:1px solid #e8f5e9;overflow:hidden;">
          <div style="background:var(--gd);color:#fff;padding:3px 12px;border-radius:5px;font-size:.75rem;font-weight:700;margin-bottom:5px;text-align:right;">מבוא</div>
          <div style="font-size:.71rem;line-height:1.6;color:#333;text-align:right;overflow:hidden;">${(d.intro||'').replace(/\n/g,'<br>')}</div>
        </div>

        <!-- תכולת הסקר -->
        <div style="padding:8px 16px;flex:1;overflow:hidden;">
          <div style="background:var(--gd);color:#fff;padding:3px 12px;border-radius:5px;font-size:.75rem;font-weight:700;margin-bottom:5px;text-align:right;">תכולת הסקר</div>
          <div style="font-size:.71rem;line-height:1.6;color:#333;text-align:right;overflow:hidden;">${(d.scope||'').replace(/\n/g,'<br>')}</div>
        </div>

      </div>

      <!-- שמאל: תמונה (45%) -->
      ${proj.coverImg ? `
      <div id="cover-img-wrap" style="flex:1;position:relative;overflow:hidden;background:#111;cursor:grab;">
        <img id="cover-main-img" src="${proj.coverImg}"
          style="position:absolute;top:50%;left:50%;width:100%;height:100%;object-fit:cover;transform:translate(-50%,-50%) scale(1);transform-origin:center;user-select:none;-webkit-user-drag:none;">
        <!-- פקדי זום -->
        <div class="no-print" style="position:absolute;bottom:10px;left:10px;display:flex;flex-direction:column;align-items:center;gap:4px;z-index:10;">
          <button onclick="changeCoverImgScale(1)" style="width:28px;height:28px;border:none;border-radius:50%;background:rgba(255,255,255,.92);font-size:1.1rem;cursor:pointer;font-weight:700;box-shadow:0 2px 6px rgba(0,0,0,.4);line-height:1;">+</button>
          <span id="cover-img-scale-label" style="font-size:.62rem;color:#fff;text-shadow:0 0 4px #000;font-weight:700;min-width:32px;text-align:center;">100%</span>
          <button onclick="changeCoverImgScale(-1)" style="width:28px;height:28px;border:none;border-radius:50%;background:rgba(255,255,255,.92);font-size:1.1rem;cursor:pointer;font-weight:700;box-shadow:0 2px 6px rgba(0,0,0,.4);line-height:1;">−</button>
        </div>
        <div class="no-print" style="position:absolute;top:6px;left:6px;font-size:.6rem;color:rgba(255,255,255,.7);text-shadow:0 0 4px #000;pointer-events:none;">גרור להזזה</div>
      </div>
      ` : ''}

    </div>
  </div>
</div>

<!-- ══ עמוד 2: תצ"א ══ -->
${proj.aerialImg?`<div class="rpage rpage-img" data-section="aerial" style="display:flex;flex-direction:column;">
  <div class="rst">תצ"א — מיקום האתר</div>
  <div id="aerial-img-wrap" style="flex:1;position:relative;overflow:hidden;background:#111;border-radius:5px;border:1px solid #ddd;cursor:grab;min-height:0;">
    <img id="aerial-main-img" src="${proj.aerialImg}"
      style="position:absolute;top:50%;left:50%;width:100%;height:100%;object-fit:contain;transform:translate(-50%,-50%) scale(1);transform-origin:center;user-select:none;-webkit-user-drag:none;">
    <div class="no-print" style="position:absolute;bottom:10px;left:10px;display:flex;flex-direction:column;align-items:center;gap:4px;z-index:10;">
      <button onclick="changeImgScale('aerial',1)" style="width:28px;height:28px;border:none;border-radius:50%;background:rgba(255,255,255,.92);font-size:1.1rem;cursor:pointer;font-weight:700;box-shadow:0 2px 6px rgba(0,0,0,.4);line-height:1;">+</button>
      <span id="aerial-img-scale-label" style="font-size:.62rem;color:#fff;text-shadow:0 0 4px #000;font-weight:700;min-width:32px;text-align:center;">100%</span>
      <button onclick="changeImgScale('aerial',-1)" style="width:28px;height:28px;border:none;border-radius:50%;background:rgba(255,255,255,.92);font-size:1.1rem;cursor:pointer;font-weight:700;box-shadow:0 2px 6px rgba(0,0,0,.4);line-height:1;">−</button>
    </div>
    <div class="no-print" style="position:absolute;top:6px;left:6px;font-size:.6rem;color:rgba(255,255,255,.7);text-shadow:0 0 4px #000;pointer-events:none;">גרור להזזה</div>
  </div>
</div>`:''}

<!-- ══ עמוד 3: תכנית העמדה ══ -->
${proj.sitePlanImg?`<div class="rpage rpage-img" data-section="siteplan" style="display:flex;flex-direction:column;">
  <div class="rst">${d.sitePlanTitle || 'תכנית העמדה כללית ע"ג בינוי מתוכנן'}</div>
  <p style="font-size:.72rem;color:#888;margin-bottom:6px">להגדלת פרטים ראה תכניות מצורפות בקנה מידה</p>
  <div id="siteplan-img-wrap" style="flex:1;position:relative;overflow:hidden;background:#111;border-radius:5px;border:1px solid #ddd;cursor:grab;min-height:0;">
    <img id="siteplan-main-img" src="${proj.sitePlanImg}"
      style="position:absolute;top:50%;left:50%;width:100%;height:100%;object-fit:contain;transform:translate(-50%,-50%) scale(1);transform-origin:center;user-select:none;-webkit-user-drag:none;">
    ${proj.sitePlanOverlay ? `<img id="siteplan-overlay-img" src="${proj.sitePlanOverlay}"
      style="position:absolute;top:50%;left:50%;width:30%;height:auto;transform:translate(-50%,-50%);cursor:move;user-select:none;-webkit-user-drag:none;z-index:5;"
      onmousedown="_overlayDragStart(event)" ontouchstart="_overlayDragStart(event)">
    <div class="no-print" id="siteplan-overlay-controls" style="position:absolute;top:8px;right:8px;display:flex;flex-direction:column;gap:4px;z-index:20;">
      <button onclick="changeOverlayScale(0.1)" style="width:28px;height:28px;background:rgba(0,0,0,.6);color:#fff;border:none;border-radius:50%;cursor:pointer;font-size:1rem;line-height:1;">+</button>
      <button onclick="changeOverlayScale(-0.1)" style="width:28px;height:28px;background:rgba(0,0,0,.6);color:#fff;border:none;border-radius:50%;cursor:pointer;font-size:1rem;line-height:1;">−</button>
    </div>` : ''}
    <div class="no-print" style="position:absolute;bottom:10px;left:10px;display:flex;flex-direction:column;align-items:center;gap:4px;z-index:10;">
      <button onclick="changeImgScale('siteplan',1)" style="width:28px;height:28px;border:none;border-radius:50%;background:rgba(255,255,255,.92);font-size:1.1rem;cursor:pointer;font-weight:700;box-shadow:0 2px 6px rgba(0,0,0,.4);line-height:1;">+</button>
      <span id="siteplan-img-scale-label" style="font-size:.62rem;color:#fff;text-shadow:0 0 4px #000;font-weight:700;min-width:32px;text-align:center;">100%</span>
      <button onclick="changeImgScale('siteplan',-1)" style="width:28px;height:28px;border:none;border-radius:50%;background:rgba(255,255,255,.92);font-size:1.1rem;cursor:pointer;font-weight:700;box-shadow:0 2px 6px rgba(0,0,0,.4);line-height:1;">−</button>
    </div>
    <div class="no-print" style="position:absolute;top:6px;left:6px;font-size:.6rem;color:rgba(255,255,255,.7);text-shadow:0 0 4px #000;pointer-events:none;">גרור להזזה</div>
  </div>
</div>`:''}

<!-- ══ עמוד 4+: טבלת סקר עצים — זורמת בין דפים ══ -->
${rows.length>0?`<div class="rpage rpage-table" data-section="table">
  <div class="rst">טבלת סקר עצים</div>
  <div style="overflow-x:auto">
  <table class="rt">
    <thead><tr>
      <th class="pg-ctrl no-print"></th><th>מספר</th><th>כמות</th><th>מין העץ</th><th>גובה העץ (מ')</th><th>קוטר גזע (ממוצע)</th>
      <th>בריאות</th><th>מיקום העץ</th><th>ערך מין העץ</th><th>חופת העץ</th>
      <th>סך ערכיות</th><th>ערכיות</th><th>רדיוס שורשים</th>
      <th>שווי העץ (₪)</th><th>הערות</th><th>סטטוס</th><th>הערות מתכנן</th>
    </tr></thead>
    <tbody>${mainRows}</tbody>
  </table></div>
</div>

<!-- ══ סיכום המלצות וטבלאות — זורמים ברצף ══ -->
<div class="rpage rpage-summary" data-section="summary">
  <div class="rst">סיכום המלצות</div>
  <div style="margin-bottom:10px;font-size:.8rem;line-height:1.9">
    <span style="display:inline-block;width:12px;height:12px;background:#c0392b;border-radius:50%;vertical-align:middle;margin-left:5px"></span><strong>ערכיות גבוהה מאוד</strong> – 17-20 נקודות, יש לשמרם בכל דרך אפשרית.<br>
    <span style="display:inline-block;width:12px;height:12px;background:#27ae60;border-radius:50%;vertical-align:middle;margin-left:5px"></span><strong>ערכיות גבוהה</strong> – 14-16 נקודות, יש לבחון שימורם במסגרת התכנון.<br>
    <span style="display:inline-block;width:12px;height:12px;background:#bdc3c7;border-radius:50%;vertical-align:middle;margin-left:5px"></span><strong>ערכיות בינונית</strong> – 7-13 נקודות, ניתן לשמרם בתנאי שאינם פוגעים בתכנית.<br>
    <span style="display:inline-block;width:12px;height:12px;background:#f39c12;border-radius:50%;vertical-align:middle;margin-left:5px"></span><strong>ערכיות נמוכה</strong> – 0-6 נקודות, עצים מתים/מסוכנים/בניוון — מומלץ לכרתם.
  </div>
  ${buildReportTables(rows)}
  <div data-section="notes"><div class="rst" style="margin-top:14px">הערות והנחיות</div>
  <ul style="font-size:.78rem;line-height:1.85;padding-right:18px">
    ${buildNotesList(d.notes)}
  </ul></div>
</div>`:''}

<!-- ══ תמונות משרד החקלאות ══ -->
${(()=>{const a1=proj.agriImg1,a2=proj.agriImg2;if(!a1&&!a2)return'';return`<div data-section="notes" style="break-inside:avoid;margin-top:20px;">
  <div class="rst">המידע מוצג בהתאם לקריטריונים שקבע משרד החקלאות</div>
  <div style="display:grid;grid-template-columns:${a1&&a2?'1fr 1fr':'1fr'};gap:20px;margin-top:16px;">
    ${a1?`<div><img src="${a1}" style="width:100%;max-height:38vh;object-fit:contain;border:1px solid #ddd;border-radius:6px;"></div>`:''}
    ${a2?`<div><img src="${a2}" style="width:100%;max-height:38vh;object-fit:contain;border:1px solid #ddd;border-radius:6px;"></div>`:''}
  </div>
</div>`;})()}

<!-- ══ תמונות עצים ══ -->
${photos.length>0?`<div class="rpage" data-section="photos">
  <div class="rst">תמונות עצים</div>
  ${phHtml}
</div>`:''}

</div>`

  document.getElementById('report-title-bar').textContent = 'דוח סקר עצים — ' + (d.projName || proj.name);
  // Inject logo box into every page
  _injectLogoBoxes();
  // Fill running footer
  document.getElementById('pf-center').textContent = (d.projName||proj.name) + (d.city ? ' | ' + d.city : '') + ' | ' + today;
  document.getElementById('pf-right').textContent = (d.expert||'') + (d.expertEmail ? ' · ' + d.expertEmail : '');
  showScreen('screen-report');
  requestAnimationFrame(() => setTimeout(_shrinkLongCells, 80));

  // Init image drag for cover, aerial, siteplan
  requestAnimationFrame(() => {
    setTimeout(() => {
      _initImgDrag('cover');
      _initImgDrag('aerial');
      _initImgDrag('siteplan');
    // Restore overlay position
    const _ov = getProject(currentProjectId)?.sitePlanOverlayPos;
    if (_ov) {
      _ovScale = _ov.scale || 1;
      setTimeout(() => {
        const _ovImg = document.getElementById('siteplan-overlay-img');
        if (_ovImg) {
          _ovImg.style.left = _ov.left || '50%';
          _ovImg.style.top  = _ov.top  || '50%';
          _ovImg.style.transform = `translate(-50%,-50%) scale(${_ovScale})`;
        }
      }, 50);
    }
    }, 300);
  });
}

function setSitePlanTitle(val) {
  document.getElementById('d-siteplan-title').value = val;
  const b1 = document.getElementById('spt-btn1');
  const b2 = document.getElementById('spt-btn2');
  const isB1 = val.includes('בינוי');
  if (b1) { b1.style.background = isB1 ? '#2d6a4f' : '#fff'; b1.style.color = isB1 ? '#fff' : '#444'; b1.style.borderColor = isB1 ? '#2d6a4f' : '#ccc'; }
  if (b2) { b2.style.background = !isB1 ? '#2d6a4f' : '#fff'; b2.style.color = !isB1 ? '#fff' : '#444'; b2.style.borderColor = !isB1 ? '#2d6a4f' : '#ccc'; }
  markUnsaved();
}


/* ── Namespace ── */
const ReportManager = {
  buildAnalysis, buildReportTables, showReport, printReport, backToEditor,
};
