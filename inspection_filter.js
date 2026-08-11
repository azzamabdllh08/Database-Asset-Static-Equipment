(() => {
  let inspectionEnriched = null;
  let regionIndexPromise = null;
  const PAGE_SIZE_INSPECTION = 50;

  const escI = value => String(value ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));

  function inspectionYear(value) {
    const match = String(value ?? '').match(/(?:19|20)\d{2}/);
    return match ? match[0] : 'Unknown';
  }

  function getManifest() {
    try {
      return typeof MANIFEST !== 'undefined' ? MANIFEST : (window.MANIFEST || {});
    } catch (_) {
      return window.MANIFEST || {};
    }
  }

  function loadRegionIndex() {
    if (regionIndexPromise) return regionIndexPromise;
    const manifest = getManifest();
    const regions = Array.isArray(manifest.regions) ? manifest.regions : [];
    regionIndexPromise = Promise.all(regions.map(async r => {
      try {
        const res = await fetch(`data/regions/${encodeURIComponent(r.slug)}.json`, { cache: 'no-store' });
        if (!res.ok) return [];
        const data = await res.json();
        return (Array.isArray(data.assets) ? data.assets : []).map(asset => ({
          tag: String(asset.tag ?? '').trim(),
          wilayahKerja: String(data.wilayahKerja ?? r.name ?? '').trim(),
          location: String(asset.area ?? '').trim()
        }));
      } catch (e) {
        console.error('Inspection region index:', e);
        return [];
      }
    })).then(chunks => {
      const index = new Map();
      chunks.flat().forEach(item => { if (item.tag) index.set(item.tag, item); });
      return index;
    });
    return regionIndexPromise;
  }

  function enrichInspections(list, index) {
    return list.map(item => {
      const found = index.get(String(item.tag ?? '').trim());
      return { ...item, wilayahKerja: found?.wilayahKerja || '', location: found?.location || '' };
    });
  }

  function injectInspectionControls() {
    const host = document.getElementById('inspectionTable')?.parentElement;
    if (!host || document.getElementById('inspectionFilters')) return;
    const controls = document.createElement('div');
    controls.id = 'inspectionFilters';
    controls.className = 'inspection-filters';
    controls.innerHTML = `
      <select id="inspectionRegionFilter"><option value="">All Wilayah Kerja</option></select>
      <select id="inspectionLocationFilter" disabled><option value="">All Location</option></select>
      <input id="inspectionAssetSearch" placeholder="Search Tag No / Finding / Remarks">
      <span id="inspectionFilterStatus" class="inspection-filter-status"></span>
    `;
    const summary = document.getElementById('inspectionYearSummary');
    host.insertBefore(controls, summary?.nextSibling || document.getElementById('inspectionTable'));

    document.getElementById('inspectionRegionFilter').addEventListener('change', () => {
      updateInspectionLocations();
      renderSelectedInspectionYear();
    });
    document.getElementById('inspectionLocationFilter').addEventListener('change', renderSelectedInspectionYear);
    document.getElementById('inspectionAssetSearch').addEventListener('input', renderSelectedInspectionYear);
  }

  function populateInspectionRegions(list, preserveValue = '') {
    const select = document.getElementById('inspectionRegionFilter');
    if (!select) return;
    const current = preserveValue || select.value || '';
    const regions = [...new Set(list.map(x => x.wilayahKerja).filter(Boolean))].sort((a,b) => a.localeCompare(b));
    select.innerHTML = '<option value="">All Wilayah Kerja</option>' + regions.map(v => `<option value="${escI(v)}">${escI(v)}</option>`).join('');
    if (regions.includes(current)) select.value = current;
    updateInspectionLocations();
  }

  function updateInspectionLocations() {
    const region = document.getElementById('inspectionRegionFilter');
    const location = document.getElementById('inspectionLocationFilter');
    if (!region || !location) return;
    const selected = region.value;
    const current = location.value;
    const source = inspectionEnriched || [];
    const locations = [...new Set(source.filter(x => !selected || x.wilayahKerja === selected).map(x => x.location).filter(Boolean))].sort((a,b) => a.localeCompare(b));
    location.innerHTML = '<option value="">All Location</option>' + locations.map(v => `<option value="${escI(v)}">${escI(v)}</option>`).join('');
    location.disabled = !selected || !locations.length;
    if (locations.includes(current)) location.value = current;
  }

  function selectedYear() {
    return document.getElementById('inspectionYear')?.value || '';
  }

  function filteredInspectionData() {
    const year = selectedYear();
    const region = document.getElementById('inspectionRegionFilter')?.value || '';
    const location = document.getElementById('inspectionLocationFilter')?.value || '';
    const q = (document.getElementById('inspectionAssetSearch')?.value || '').trim().toLowerCase();
    return (inspectionEnriched || []).filter(x => {
      const hay = `${x.tag} ${x.method || ''} ${x.finding || ''} ${x.remarks || ''}`.toLowerCase();
      return (!year || inspectionYear(x.date) === year) &&
        (!region || x.wilayahKerja === region) &&
        (!location || x.location === location) &&
        (!q || hay.includes(q));
    });
  }

  function renderYearCards(list, selectedYearValue) {
    const summary = document.getElementById('inspectionYearSummary');
    if (!summary) return;
    const grouped = list.reduce((m, item) => {
      const year = inspectionYear(item.date);
      (m[year] ||= []).push(item);
      return m;
    }, {});
    const years = Object.keys(grouped).filter(y => y !== 'Unknown').sort((a,b) => Number(b) - Number(a));
    summary.innerHTML = years.length
      ? years.map(year => `<button class="year-card ${selectedYearValue === year ? 'selected' : ''}" data-year="${year}"><b>${year}</b><span>${grouped[year].length.toLocaleString('id-ID')} inspection</span><small>View report →</small></button>`).join('')
      : '<div class="empty">Tahun inspeksi belum tersedia.</div>';

    summary.querySelectorAll('.year-card').forEach(card => card.addEventListener('click', () => {
      const year = card.dataset.year;
      const yearSelect = document.getElementById('inspectionYear');
      if (yearSelect) yearSelect.value = year;
      renderYearCards(list, year);
      renderSelectedInspectionYear();
      document.getElementById('inspectionFilters')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }));
  }

  function renderInspectionTable(list, year) {
    renderInspectionTablePage(list, year, 1);
  }

  function renderInspectionTablePage(list, year, page) {
    const table = document.getElementById('inspectionTable');
    if (!table) return;
    const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE_INSPECTION));
    page = Math.min(Math.max(1, page), totalPages);
    const visible = list.slice((page - 1) * PAGE_SIZE_INSPECTION, page * PAGE_SIZE_INSPECTION);
    const status = document.getElementById('inspectionFilterStatus');
    if (status) status.textContent = `${list.length.toLocaleString('id-ID')} inspection`;
    if (!visible.length) {
      table.innerHTML = '<div class="empty">Tidak ada asset/inspection sesuai filter.</div>';
      return;
    }
    table.innerHTML = `<div class="report-heading"><h3>Inspection ${year || 'All Years'}</h3><span class="badge">${list.length.toLocaleString('id-ID')} inspection</span></div><table><thead><tr><th>Tag No.</th><th>Wilayah Kerja</th><th>Location</th><th>Date</th><th>Method</th><th>Finding</th><th>Remarks</th></tr></thead><tbody>${visible.map(x => `<tr><td><b>${escI(x.tag)}</b></td><td>${escI(x.wilayahKerja || '-')}</td><td>${escI(x.location || '-')}</td><td>${escI(typeof formatInspectionDate === 'function' ? formatInspectionDate(x.date) : x.date)}</td><td>${escI(x.method || '-')}</td><td>${escI(x.finding || '-')}</td><td>${escI(x.remarks || '-')}</td></tr>`).join('')}</tbody></table>${paginationInspection(list, year, page)}`;
    table.querySelectorAll('[data-inspection-page]').forEach(btn => btn.addEventListener('click', () => renderInspectionTablePage(list, year, Number(btn.dataset.inspectionPage))));
  }

  function paginationInspection(list, year, page = 1) {
    const total = Math.max(1, Math.ceil(list.length / PAGE_SIZE_INSPECTION));
    if (total <= 1) return '';
    return `<div class="pagination"><button data-inspection-page="${Math.max(1,page-1)}" ${page===1?'disabled':''}>‹ Prev</button><span>Page ${page} / ${total}</span><button data-inspection-page="${Math.min(total,page+1)}" ${page===total?'disabled':''}>Next ›</button></div>`;
  }

  function renderSelectedInspectionYear() {
    if (!inspectionEnriched) return;
    renderInspectionTable(filteredInspectionData(), selectedYear());
  }

  function installStyles() {
    if (document.getElementById('inspection-filter-styles')) return;
    const style = document.createElement('style');
    style.id = 'inspection-filter-styles';
    style.textContent = `
      .inspection-filters{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:14px 0;padding:12px;background:#f7f9fc;border:1px solid #e2e8f0;border-radius:10px}
      .inspection-filters select,.inspection-filters input{padding:9px 11px;border:1px solid #cbd5e1;border-radius:7px;background:#fff;font:inherit;color:#17324d;min-width:190px}
      .inspection-filters input{flex:1;min-width:250px}
      .inspection-filters select:disabled{background:#f1f5f9;color:#94a3b8}
      .inspection-filter-status{margin-left:auto;font-size:12px;color:#64748b}
      #inspectionTable table{width:100%;table-layout:auto}
      #inspectionTable td:last-child{white-space:normal;overflow-wrap:anywhere;text-align:justify;line-height:1.45}
      @media(max-width:700px){.inspection-filter-status{width:100%;margin-left:0}.inspection-filters select,.inspection-filters input{width:100%;min-width:0}}
    `;
    document.head.appendChild(style);
  }

  window.renderInspectionByYear = function(list, selectedYearValue = '') {
    injectInspectionControls();
    installStyles();
    inspectionEnriched = list || [];
    const previousRegion = document.getElementById('inspectionRegionFilter')?.value || '';
    const previousLocation = document.getElementById('inspectionLocationFilter')?.value || '';
    const yearSelect = document.getElementById('inspectionYear');
    const years = [...new Set(inspectionEnriched.map(x => inspectionYear(x.date)).filter(y => y !== 'Unknown'))].sort((a,b) => Number(b)-Number(a));
    yearSelect.innerHTML = '<option value="">All Years</option>' + years.map(y => `<option value="${y}">${y}</option>`).join('');
    yearSelect.value = selectedYearValue || '';
    renderYearCards(inspectionEnriched, selectedYearValue || '');
    populateInspectionRegions(inspectionEnriched, previousRegion);
    const location = document.getElementById('inspectionLocationFilter');
    if (location && previousLocation) location.value = previousLocation;
    renderSelectedInspectionYear();

    loadRegionIndex().then(index => {
      if (!index.size) return;
      const currentRegion = document.getElementById('inspectionRegionFilter')?.value || previousRegion;
      inspectionEnriched = enrichInspections(inspectionEnriched, index);
      renderYearCards(inspectionEnriched, selectedYear());
      populateInspectionRegions(inspectionEnriched, currentRegion);
      renderSelectedInspectionYear();
    });
  };

  window.addEventListener('DOMContentLoaded', () => {
    const yearSelect = document.getElementById('inspectionYear');
    if (yearSelect) yearSelect.addEventListener('change', () => {
      renderYearCards(inspectionEnriched || [], selectedYear());
      renderSelectedInspectionYear();
    });
  });
})();