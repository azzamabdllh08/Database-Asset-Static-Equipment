(() => {
  const PAGE_SIZE = 50;
  let data = [];
  let ready = false;
  let regionIndex = new Map();

  const esc = v => String(v ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const yearOf = v => { const m = String(v ?? '').match(/(?:19|20)\d{2}/); return m ? m[0] : 'Unknown'; };
  const formatDate = v => {
    const s = String(v ?? '').trim();
    if (!s) return '-';
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : s;
  };

  async function buildRegionIndex() {
    if (regionIndex.size) return;
    const manifest = window.MANIFEST || {};
    const regions = Array.isArray(manifest.regions) ? manifest.regions : [];
    const chunks = await Promise.all(regions.map(async r => {
      try {
        const res = await fetch(`data/regions/${encodeURIComponent(r.slug)}.json`, {cache:'no-store'});
        if (!res.ok) return [];
        const json = await res.json();
        return (json.assets || []).map(a => ({
          tag: String(a.tag ?? '').trim(),
          wilayahKerja: String(json.wilayahKerja ?? r.name ?? '').trim(),
          location: String(a.area ?? '').trim()
        }));
      } catch (_) { return []; }
    }));
    chunks.flat().forEach(x => { if (x.tag && !regionIndex.has(x.tag)) regionIndex.set(x.tag, x); });
  }

  function enrich() {
    data = data.map(x => {
      const hit = regionIndex.get(String(x.tag ?? '').trim());
      return {...x, wilayahKerja: hit?.wilayahKerja || x.wilayahKerja || '', location: hit?.location || x.location || ''};
    });
  }

  function controls() {
    const panel = document.querySelector('#inspection .panel');
    const summary = document.getElementById('inspectionYearSummary');
    if (!panel || !summary) return;
    let box = document.getElementById('inspectionFinalFilters');
    if (!box) {
      box = document.createElement('div');
      box.id = 'inspectionFinalFilters';
      box.className = 'inspection-filters';
      box.innerHTML = `<select id="finalRegion"><option value="">All Wilayah Kerja</option></select><select id="finalLocation" disabled><option value="">All Location</option></select><input id="finalSearch" placeholder="Search Tag No / Finding / Remarks"><span id="finalCount" class="inspection-filter-status"></span>`;
      summary.insertAdjacentElement('afterend', box);
      box.querySelector('#finalRegion').addEventListener('change', () => { updateLocations(); render(); });
      box.querySelector('#finalLocation').addEventListener('change', render);
      box.querySelector('#finalSearch').addEventListener('input', render);
    }
    const region = document.getElementById('finalRegion');
    const current = region.value;
    const values = [...new Set(data.map(x => x.wilayahKerja).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
    region.innerHTML = '<option value="">All Wilayah Kerja</option>' + values.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');
    if (values.includes(current)) region.value = current;
    updateLocations();
  }

  function updateLocations() {
    const region = document.getElementById('finalRegion');
    const loc = document.getElementById('finalLocation');
    if (!region || !loc) return;
    const old = loc.value;
    const r = region.value;
    const values = [...new Set(data.filter(x => !r || x.wilayahKerja === r).map(x => x.location).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
    loc.innerHTML = '<option value="">All Location</option>' + values.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');
    loc.disabled = !r || !values.length;
    if (values.includes(old)) loc.value = old;
  }

  function selectedYear() { return document.getElementById('inspectionYear')?.value || ''; }

  function filtered() {
    const y = selectedYear();
    const r = document.getElementById('finalRegion')?.value || '';
    const l = document.getElementById('finalLocation')?.value || '';
    const q = (document.getElementById('finalSearch')?.value || '').trim().toLowerCase();
    return data.filter(x => {
      const hay = `${x.tag} ${x.finding || ''} ${x.remarks || ''} ${x.method || ''}`.toLowerCase();
      return (!y || yearOf(x.date) === y) && (!r || x.wilayahKerja === r) && (!l || x.location === l) && (!q || hay.includes(q));
    });
  }

  function cards() {
    const summary = document.getElementById('inspectionYearSummary');
    if (!summary) return;
    const groups = {};
    data.forEach(x => { const y=yearOf(x.date); if(y!=='Unknown') (groups[y] ||= []).push(x); });
    const years = Object.keys(groups).sort((a,b)=>Number(b)-Number(a));
    const active = selectedYear();
    summary.innerHTML = years.map(y => `<button type="button" class="year-card ${active===y?'selected':''}" data-year="${y}"><b>${y}</b><span>${groups[y].length.toLocaleString('id-ID')} inspection</span><small>Show inspection →</small></button>`).join('');
  }

  function render() {
    const table = document.getElementById('inspectionTable');
    if (!table) return;
    const list = filtered();
    const y = selectedYear();
    const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    const visible = list.slice(0, PAGE_SIZE);
    const status = document.getElementById('finalCount');
    if (status) status.textContent = `${list.length.toLocaleString('id-ID')} inspection`;
    if (!visible.length) { table.innerHTML = `<div class="empty">Tidak ada inspection untuk ${y || 'filter'} yang dipilih.</div>`; return; }
    table.innerHTML = `<div class="report-heading"><h3>Inspection ${y || 'All Years'}</h3><span class="badge">${list.length.toLocaleString('id-ID')} inspection</span></div><table><thead><tr><th>Tag No.</th><th>Wilayah Kerja</th><th>Location</th><th>Date</th><th>Method</th><th>Finding</th><th>Remarks</th></tr></thead><tbody>${visible.map(x=>`<tr><td><b>${esc(x.tag)}</b></td><td>${esc(x.wilayahKerja||'-')}</td><td>${esc(x.location||'-')}</td><td>${formatDate(x.date)}</td><td>${esc(x.method||'-')}</td><td>${esc(x.finding||'-')}</td><td>${esc(x.remarks||'-')}</td></tr>`).join('')}</tbody></table>${pages>1?`<div class="pagination"><span>Showing ${visible.length} of ${list.length}</span></div>`:''}`;
  }

  async function initialize() {
    const inspection = window.inspectionData;
    if (!Array.isArray(inspection) || !inspection.length) return false;
    data = inspection.slice();
    await buildRegionIndex();
    enrich();
    ready = true;
    controls();
    cards();
    render();
    return true;
  }

  document.addEventListener('click', async e => {
    const card = e.target.closest('#inspectionYearSummary .year-card');
    if (!card) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const select = document.getElementById('inspectionYear');
    if (select) select.value = card.dataset.year;
    if (!ready) await initialize();
    cards();
    controls();
    render();
    document.getElementById('inspectionFinalFilters')?.scrollIntoView({behavior:'smooth', block:'nearest'});
  }, true);

  document.addEventListener('change', e => {
    if (e.target.id !== 'inspectionYear') return;
    if (!ready) initialize().then(()=>{cards();render();});
    else { cards(); controls(); render(); }
  }, true);

  window.addEventListener('DOMContentLoaded', () => {
    const style = document.createElement('style');
    style.textContent = `.inspection-filters{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:14px 0;padding:12px;background:#f7f9fc;border:1px solid #e2e8f0;border-radius:10px}.inspection-filters select,.inspection-filters input{padding:9px 11px;border:1px solid #cbd5e1;border-radius:7px;background:#fff;color:#17324d;font:inherit;min-width:190px}.inspection-filters input{flex:1;min-width:280px}.inspection-filters select:disabled{background:#f1f5f9;color:#94a3b8}.inspection-filter-status{margin-left:auto;font-size:12px;color:#64748b}.year-card{cursor:pointer}.year-card small{display:block}`;
    document.head.appendChild(style);
  });
})();