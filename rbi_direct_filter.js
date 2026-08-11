/* RBI direct mode: filters RBI data without requiring Asset Register selection. */
(() => {
  let allRbi = [];
  let loaded = false;
  const escR = v => String(v ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const yearR = v => { const m = String(v ?? '').match(/(?:19|20)\d{2}/); return m ? m[0] : ''; };
  const dateR = v => { const m = String(v ?? '').match(/^(\d{4})-(\d{2})-(\d{2})/); if (!m) return String(v ?? '-') || '-'; const mo=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; return `${m[3]}/${mo[Number(m[2])-1]||m[2]}/${m[1]}`; };

  async function loadAllRbi() {
    if (loaded) return;
    const manifest = window.MANIFEST || {};
    const regions = Array.isArray(manifest.regions) ? manifest.regions : [];
    const chunks = await Promise.all(regions.map(async r => {
      try {
        const res = await fetch(`data/regions/${encodeURIComponent(r.slug)}.json`, {cache:'no-store'});
        if (!res.ok) return [];
        const d = await res.json();
        return (Array.isArray(d.assets) ? d.assets : []).map(x => ({...x, wilayahKerja: String(d.wilayahKerja || r.name || ''), location: String(x.area || '')}));
      } catch (_) { return []; }
    }));
    allRbi = chunks.flat();
    loaded = true;
  }

  function source() {
    const region = document.getElementById('rbiDirectRegion')?.value || '';
    const loc = document.getElementById('rbiDirectLocation')?.value || '';
    return allRbi.filter(x => (!region || x.wilayahKerja === region) && (!loc || x.location === loc));
  }

  function riskKey(x) { const r = String(x.risk1AP || '').trim().toUpperCase(); return /^[1-5][A-E]$/.test(r) ? r : 'Unknown'; }
  function category(r) { return typeof riskCellCategory === 'function' ? riskCellCategory(r) : 'No AP Detected'; }
  function renderRisk(list) {
    const counts = {}; list.forEach(x => { const k=riskKey(x); counts[k]=(counts[k]||0)+1; });
    if (typeof renderRiskMatrix === 'function') renderRiskMatrix(counts);
    if (typeof categoryCountsFromRiskCounts === 'function' && typeof renderRiskSummary === 'function') renderRiskSummary(categoryCountsFromRiskCounts(counts));
    if (typeof categoryCountsFromRiskCounts === 'function' && typeof renderRiskDiagram === 'function') renderRiskDiagram(categoryCountsFromRiskCounts(counts));
  }

  function populateRegions() {
    const s=document.getElementById('rbiDirectRegion'); if(!s)return;
    const old=s.value; const vals=[...new Set(allRbi.map(x=>x.wilayahKerja).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
    s.innerHTML='<option value="">All Wilayah Kerja</option>'+vals.map(v=>`<option value="${escR(v)}">${escR(v)}</option>`).join(''); if(vals.includes(old))s.value=old;
    updateLocations();
  }
  function updateLocations() {
    const r=document.getElementById('rbiDirectRegion'), l=document.getElementById('rbiDirectLocation'); if(!r||!l)return;
    const old=l.value; const vals=[...new Set(allRbi.filter(x=>!r.value||x.wilayahKerja===r.value).map(x=>x.location).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
    l.innerHTML='<option value="">All Location</option>'+vals.map(v=>`<option value="${escR(v)}">${escR(v)}</option>`).join(''); l.disabled=!r.value||!vals.length; if(vals.includes(old))l.value=old;
  }

  function dueSummary() {
    const host=document.getElementById('rbiDueSummary'); if(!host)return;
    const list=source(); const groups={}; list.forEach(x=>{const y=yearR(x.inspectionDueDate); if(y)(groups[y] ||= []).push(x);});
    const years=Object.keys(groups).sort((a,b)=>Number(a)-Number(b));
    const overdue=list.filter(x=>{const y=yearR(x.inspectionDueDate); return y && Number(y)<new Date().getFullYear();});
    host.innerHTML=`<div class="rbi-due-cards">${overdue.length?`<button class="rbi-due-card overdue" data-due-year="OVERDUE"><b>Overdue</b><span>${overdue.length.toLocaleString('id-ID')} asset</span></button>`:''}${years.map(y=>`<button class="rbi-due-card" data-due-year="${y}"><b>${y}</b><span>${groups[y].length.toLocaleString('id-ID')} asset</span></button>`).join('')}</div>`;
    host.querySelectorAll('[data-due-year]').forEach(b=>b.addEventListener('click',()=>{ document.getElementById('rbiDueYear').value=b.dataset.dueYear; renderDueTable(); host.querySelectorAll('.rbi-due-card').forEach(x=>x.classList.remove('selected')); b.classList.add('selected'); }));
  }

  function renderDueTable() {
    const host=document.getElementById('rbiDueTable'); if(!host)return;
    const y=document.getElementById('rbiDueYear')?.value || '';
    const list=source().filter(x=>!y || (y==='OVERDUE' ? (yearR(x.inspectionDueDate) && Number(yearR(x.inspectionDueDate))<new Date().getFullYear()) : yearR(x.inspectionDueDate)===y));
    host.innerHTML=`<div class="report-heading"><h3>${y==='OVERDUE'?'Overdue':y?`Inspection Due ${y}`:'Inspection Due — All Years'}</h3><span class="badge">${list.length.toLocaleString('id-ID')} asset</span></div><div class="table-scroll"><table><thead><tr><th>Tag No.</th><th>Wilayah Kerja</th><th>Location</th><th>Risk 1AP</th><th>Integrity Status</th><th>Inspection Due Date</th></tr></thead><tbody>${list.slice(0,500).map(x=>`<tr><td><b>${escR(x.tag)}</b></td><td>${escR(x.wilayahKerja||'-')}</td><td>${escR(x.location||'-')}</td><td>${escR(x.risk1AP||'No AP Detected')}</td><td>${escR(x.integrityStatus||'-')}</td><td>${escR(dateR(x.inspectionDueDate))}</td></tr>`).join('')||'<tr><td colspan="6">Tidak ada asset sesuai filter.</td></tr>'}</tbody></table></div>`;
  }

  function renderAll() {
    const list=source(); renderRisk(list); dueSummary(); renderDueTable();
    const badge=document.getElementById('rbiDirectCount'); if(badge)badge.textContent=`${list.length.toLocaleString('id-ID')} asset`;
  }

  function buildUi() {
    const section=document.getElementById('rbi'); if(!section||document.getElementById('rbiDirectUi'))return;
    const panel=section.querySelector('.panel');
    const ui=document.createElement('div'); ui.id='rbiDirectUi';
    ui.innerHTML=`<div class="rbi-direct-filters"><select id="rbiDirectRegion"><option>Loading...</option></select><select id="rbiDirectLocation" disabled><option>All Location</option></select><span id="rbiDirectCount" class="badge">0 asset</span></div><div class="rbi-direct-section"><div class="section-head"><h3>RBI Risk Matrix 1AP</h3><span class="badge">Risk 1AP</span></div><div id="rbiDirectMatrix"></div><div id="rbiDirectSummary"></div><div id="rbiDirectDiagram"></div></div><div class="rbi-direct-section"><div class="section-head"><h3>Inspection Due Planning</h3><select id="rbiDueYear"><option value="">All Years</option></select></div><div id="rbiDueSummary"></div><div id="rbiDueTable"></div></div>`;
    panel.innerHTML='<div class="section-head"><h2>RBI Assessment</h2><span class="badge">Direct RBI Data</span></div>'+ui.innerHTML;
    document.getElementById('rbiDirectRegion').addEventListener('change',()=>{updateLocations();renderAll();});
    document.getElementById('rbiDirectLocation').addEventListener('change',renderAll);
    document.getElementById('rbiDueYear').addEventListener('change',renderDueTable);
  }

  async function init() { buildUi(); await loadAllRbi(); populateRegions(); renderAll(); }
  window.initDirectRbi = init;
  document.addEventListener('click', e => { const nav=e.target.closest('.nav button[data-page="rbi"]'); if(nav) setTimeout(()=>init(),0); }, true);
  const st=document.createElement('style'); st.textContent=`.rbi-direct-filters{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:14px 0;padding:12px;background:#f7f9fc;border:1px solid #e2e8f0;border-radius:10px}.rbi-direct-filters select{padding:9px 11px;border:1px solid #cbd5e1;border-radius:7px;background:#fff;min-width:220px}.rbi-direct-filters select:disabled{background:#f1f5f9}.rbi-direct-section{margin-top:18px;padding-top:16px;border-top:1px solid #e2e8f0}.rbi-due-cards{display:flex;gap:10px;flex-wrap:wrap;margin:12px 0}.rbi-due-card{min-width:125px;padding:14px;border:1px solid #d8dee8;border-radius:10px;background:#fff;cursor:pointer;text-align:left}.rbi-due-card b,.rbi-due-card span{display:block}.rbi-due-card span{margin-top:5px;font-size:12px;color:#64748b}.rbi-due-card.selected{outline:2px solid #17324d}.rbi-due-card.overdue{border-color:#dc2626}.table-scroll{overflow:auto}.rbi-direct-section table{width:100%;border-collapse:collapse}.rbi-direct-section th,.rbi-direct-section td{padding:9px;border-bottom:1px solid #e5e7eb;text-align:left;white-space:nowrap}`; document.head.appendChild(st);
})();
