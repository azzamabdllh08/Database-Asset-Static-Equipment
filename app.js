document.addEventListener('DOMContentLoaded', () => {
  const assets = Array.isArray(window.ASSETS) ? window.ASSETS : ASSETS;
  const inspections = Array.isArray(window.INSPECTIONS) ? window.INSPECTIONS : INSPECTIONS;
  const PAGE_SIZE = 50;

  document.getElementById('brand').textContent = CONFIG.brand;
  document.title = CONFIG.title;
  const reportLink = document.getElementById('reportLink');
  if (CONFIG.reportUrl) reportLink.href = CONFIG.reportUrl;

  const pages = document.querySelectorAll('.page');
  const navButtons = document.querySelectorAll('.nav button');
  let rbiRendered = false;

  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      navButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      pages.forEach(p => p.classList.toggle('active', p.id === btn.dataset.page));
      if (btn.dataset.page === 'assets') renderAssetTable(assets);
      if (btn.dataset.page === 'inspection') renderInspectionByYear(inspections);
      if (btn.dataset.page === 'rbi' && !rbiRendered) { renderRbiTable(assets); rbiRendered = true; }
    });
  });

  const by = key => assets.reduce((m, x) => { const v = x[key] || 'Unknown'; m[v] = (m[v] || 0) + 1; return m; }, {});
  document.getElementById('totalAssets').textContent = assets.length.toLocaleString('id-ID');
  document.getElementById('totalInspections').textContent = inspections.length.toLocaleString('id-ID');
  document.getElementById('totalRbi').textContent = assets.filter(x => x.risk).length.toLocaleString('id-ID');
  document.getElementById('highRisk').textContent = assets.filter(x => ['4A','4B','4C','4D','4E','5A','5B','5C','5D','5E'].includes(String(x.risk))).length.toLocaleString('id-ID');
  renderBars('typeChart', by('type'));
  renderBars('riskChart', by('risk'));
  renderRecent(assets.slice(0, 8));
  fillFilters(assets);

  const search = document.getElementById('assetSearch');
  const typeFilter = document.getElementById('typeFilter');
  const areaFilter = document.getElementById('areaFilter');
  [search, typeFilter, areaFilter].forEach(el => el.addEventListener('input', filterAssets));
  const inspectionYear = document.getElementById('inspectionYear');
  inspectionYear.addEventListener('change', () => renderInspectionByYear(inspections, inspectionYear.value));

  function filterAssets() {
    const q = search.value.toLowerCase(), type = typeFilter.value, area = areaFilter.value;
    renderAssetTable(assets.filter(x => {
      const hay = `${x.tag} ${x.name} ${x.service}`.toLowerCase();
      return (!q || hay.includes(q)) && (!type || x.type === type) && (!area || x.area === area);
    }));
  }

  function fillFilters(list) {
    [...new Set(list.map(x => x.type).filter(Boolean))].sort().forEach(v => typeFilter.insertAdjacentHTML('beforeend', `<option>${esc(v)}</option>`));
    [...new Set(list.map(x => x.area).filter(Boolean))].sort().forEach(v => areaFilter.insertAdjacentHTML('beforeend', `<option>${esc(v)}</option>`));
  }
});

function inspectionYearValue(item) {
  const raw = item?.date ?? item?.inspectionDate ?? item?.inspection_date ?? item?.year ?? '';
  const match = String(raw).match(/(?:19|20)\d{2}/);
  return match ? match[0] : 'Unknown';
}

function renderInspectionByYear(list, selectedYear = '') {
  const summary = document.getElementById('inspectionYearSummary');
  const table = document.getElementById('inspectionTable');
  const yearSelect = document.getElementById('inspectionYear');
  const grouped = list.reduce((m, item) => { const year = inspectionYearValue(item); (m[year] ||= []).push(item); return m; }, {});
  const years = Object.keys(grouped).filter(y => y !== 'Unknown').sort((a,b) => Number(b) - Number(a));
  const current = yearSelect.value;
  yearSelect.innerHTML = '<option value="">All Years</option>' + years.map(y => `<option value="${y}">${y}</option>`).join('');
  if (selectedYear || years.includes(current)) yearSelect.value = selectedYear || current;
  if (!list.length) { summary.innerHTML = '<div class="empty">Belum ada inspection report.</div>'; table.innerHTML = ''; return; }

  summary.innerHTML = years.length ? years.map(year => `<button class="year-card ${selectedYear === year ? 'selected' : ''}" data-year="${year}"><b>${year}</b><span>${grouped[year].length.toLocaleString('id-ID')} inspection</span><small>View report →</small></button>`).join('') : '<div class="empty">Tahun inspeksi belum tersedia.</div>';
  summary.querySelectorAll('.year-card').forEach(card => card.addEventListener('click', () => {
    const year = card.dataset.year; yearSelect.value = year; renderInspectionByYear(list, year);
  }));
  const filtered = selectedYear ? (grouped[selectedYear] || []) : list;
  renderInspectionPage(filtered, selectedYear, 1);
}

function renderInspectionPage(filtered, selectedYear, page) {
  const table = document.getElementById('inspectionTable');
  const pageSize = 50, totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  page = Math.min(Math.max(1, page), totalPages);
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
  if (!visible.length) { table.innerHTML = '<div class="empty">Tidak ada inspection pada tahun yang dipilih.</div>'; return; }
  table.innerHTML = `<div class="report-heading"><h3>Inspection Report ${selectedYear || 'All Years'}</h3><span class="badge">${filtered.length.toLocaleString('id-ID')} inspection</span></div><table><thead><tr><th>Tag No.</th><th>Date</th><th>Method</th><th>Finding</th><th>Remarks</th></tr></thead><tbody>${visible.map(x => `<tr><td><b>${esc(x.tag)}</b></td><td>${esc(x.date || x.inspectionDate || '-')}</td><td>${esc(x.method || '-')}</td><td>${esc(x.finding || '-')}</td><td>${esc(x.remarks || '-')}</td></tr>`).join('')}</tbody></table>${paginationHtml(page, totalPages)}`;
  table.querySelectorAll('[data-page]').forEach(btn => btn.addEventListener('click', () => renderInspectionPage(filtered, selectedYear, Number(btn.dataset.page))));
}

function paginationHtml(page, totalPages) {
  if (totalPages <= 1) return '';
  return `<div class="pagination"><button data-page="${Math.max(1,page-1)}" ${page === 1 ? 'disabled' : ''}>‹ Prev</button><span>Page ${page.toLocaleString('id-ID')} / ${totalPages.toLocaleString('id-ID')}</span><button data-page="${Math.min(totalPages,page+1)}" ${page === totalPages ? 'disabled' : ''}>Next ›</button></div>`;
}

function renderBars(id, data) {
  const el = document.getElementById(id), max = Math.max(1, ...Object.values(data));
  el.innerHTML = Object.entries(data).map(([k,v]) => `<div class="bar-row"><span>${esc(k)}</span><div class="bar"><i style="width:${(v/max)*100}%"></i></div><b>${v}</b></div>`).join('') || '<p class="muted">No data</p>';
}

function renderRecent(list) {
  document.getElementById('recentAssets').innerHTML = list.length ? `<div class="mini-table">${list.map(x => `<div><b>${esc(x.tag)}</b><span>${esc(x.name)}</span><em>${esc(x.risk || '-')}</em></div>`).join('')}</div>` : '<p class="muted">No asset data.</p>';
}

function renderAssetTable(list, page = 1) {
  const table = document.getElementById('assetTable'), pageSize = 50, totalPages = Math.max(1, Math.ceil(list.length / pageSize));
  page = Math.min(Math.max(1, page), totalPages);
  const visible = list.slice((page - 1) * pageSize, page * pageSize);
  document.getElementById('assetCount').textContent = `${list.length.toLocaleString('id-ID')} asset`;
  table.innerHTML = `<table><thead><tr><th>Tag No.</th><th>Equipment</th><th>Type</th><th>Area</th><th>Service</th><th>Material</th><th>Risk</th></tr></thead><tbody>${visible.map(x => `<tr><td><b>${esc(x.tag)}</b></td><td>${esc(x.name)}</td><td>${esc(x.type)}</td><td>${esc(x.area)}</td><td>${esc(x.service)}</td><td>${esc(x.material)}</td><td><span class="risk">${esc(x.risk || '-')}</span></td></tr>`).join('')}</tbody></table>${paginationHtml(page,totalPages)}`;
  table.querySelectorAll('[data-page]').forEach(btn => btn.addEventListener('click', () => renderAssetTable(list, Number(btn.dataset.page))));
}

function renderRbiTable(list, page = 1) {
  const table = document.getElementById('rbiTable'), pageSize = 50, totalPages = Math.max(1, Math.ceil(list.length / pageSize));
  page = Math.min(Math.max(1, page), totalPages);
  const visible = list.slice((page - 1) * pageSize, page * pageSize);
  table.innerHTML = `<table><thead><tr><th>Tag No.</th><th>Damage Mechanism</th><th>Corrosion Rate</th><th>Current Thickness</th><th>Risk</th><th>RBI Status</th></tr></thead><tbody>${visible.map(x => `<tr><td>${esc(x.tag)}</td><td>${esc(x.damageMechanism || '-')}</td><td>${x.corrosionRate ?? '-'} mm/y</td><td>${x.currentThickness ?? '-'} mm</td><td><span class="risk">${esc(x.risk || '-')}</span></td><td>${esc(x.rbiStatus || '-')}</td></tr>`).join('')}</tbody></table>${paginationHtml(page,totalPages)}`;
  table.querySelectorAll('[data-page]').forEach(btn => btn.addEventListener('click', () => renderRbiTable(list, Number(btn.dataset.page))));
}

function esc(v) { return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c])); }