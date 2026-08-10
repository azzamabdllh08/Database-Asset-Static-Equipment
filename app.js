let MANIFEST = null;
let currentRegion = null;
let currentRegionAssets = [];
let inspectionData = null;
let rbiRendered = false;
const PAGE_SIZE = 50;

const $ = id => document.getElementById(id);

window.addEventListener('DOMContentLoaded', async () => {
  try {
    const res = await fetch('data/manifest.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`manifest.json HTTP ${res.status}`);
    MANIFEST = await res.json();
    initApp();
  } catch (err) {
    document.querySelector('main').insertAdjacentHTML('afterbegin', `<div class="panel notice">Database belum tersedia. Jalankan sync_static.py terlebih dahulu. <small>${esc(err.message)}</small></div>`);
    console.error(err);
  }
});

function initApp() {
  $('brand').textContent = CONFIG.brand;
  document.title = CONFIG.title;
  if (CONFIG.reportUrl) $('reportLink').href = CONFIG.reportUrl;

  $('totalAssets').textContent = Number(MANIFEST.totalAssets || 0).toLocaleString('id-ID');
  $('totalInspections').textContent = Number(MANIFEST.totalInspections || 0).toLocaleString('id-ID');
  $('totalRbi').textContent = Number(MANIFEST.totalRbi || 0).toLocaleString('id-ID');
  $('highRisk').textContent = Number(MANIFEST.highRisk || 0).toLocaleString('id-ID');

  renderBars('regionChart', Object.fromEntries((MANIFEST.regions || []).map(r => [r.name, r.count])));
  renderBars('typeChart', MANIFEST.typeCounts || {});
  renderBars('riskChart', MANIFEST.riskCounts || {});
  renderRecent(MANIFEST.recentAssets || []);
  fillRegions();

  const pages = document.querySelectorAll('.page');
  const navButtons = document.querySelectorAll('.nav button');
  navButtons.forEach(btn => btn.addEventListener('click', async () => {
    navButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    pages.forEach(p => p.classList.toggle('active', p.id === btn.dataset.page));

    if (btn.dataset.page === 'assets') {
      if (!currentRegion) $('assetTable').innerHTML = '<div class="empty">Pilih Wilayah Kerja untuk memuat asset.</div>';
    }
    if (btn.dataset.page === 'inspection') await loadInspections();
    if (btn.dataset.page === 'rbi' && !rbiRendered) {
      if (!currentRegion) {
        $('rbiTable').innerHTML = '<div class="empty">Pilih Wilayah Kerja di Asset Register terlebih dahulu.</div>';
      } else {
        renderRbiTable(currentRegionAssets);
        rbiRendered = true;
      }
    }
  }));

  $('regionFilter').addEventListener('change', async e => {
    await selectRegion(e.target.value);
  });
  $('locationFilter').addEventListener('change', filterCurrentRegion);
  $('typeFilter').addEventListener('change', filterCurrentRegion);
  $('assetSearch').addEventListener('input', filterCurrentRegion);
  $('inspectionYear').addEventListener('change', () => renderInspectionByYear(inspectionData || [], $('inspectionYear').value));
}

function fillRegions() {
  const select = $('regionFilter');
  select.innerHTML = '<option value="">Pilih Wilayah Kerja</option>' +
    (MANIFEST.regions || []).map(r => `<option value="${escAttr(r.slug)}">${esc(r.name)} (${Number(r.count).toLocaleString('id-ID')})</option>`).join('');
}

async function selectRegion(slug) {
  currentRegion = null;
  currentRegionAssets = [];
  rbiRendered = false;
  const location = $('locationFilter');
  const type = $('typeFilter');
  const search = $('assetSearch');

  location.disabled = true;
  type.disabled = true;
  search.disabled = true;
  location.innerHTML = '<option value="">Loading Location...</option>';
  type.innerHTML = '<option value="">All Object Type</option>';

  if (!slug) {
    $('assetCount').textContent = 'Pilih Wilayah Kerja';
    $('assetTable').innerHTML = '<div class="empty">Pilih Wilayah Kerja untuk memuat asset.</div>';
    return;
  }

  $('assetTable').innerHTML = '<div class="empty">Memuat data wilayah...</div>';
  const res = await fetch(`data/regions/${encodeURIComponent(slug)}.json`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Region data HTTP ${res.status}`);
  const data = await res.json();
  currentRegion = data.wilayahKerja;
  currentRegionAssets = Array.isArray(data.assets) ? data.assets : [];

  const locations = [...new Set(currentRegionAssets.map(x => x.area).filter(Boolean))].sort((a,b) => String(a).localeCompare(String(b)));
  const types = [...new Set(currentRegionAssets.map(x => x.objectType).filter(Boolean))].sort((a,b) => String(a).localeCompare(String(b)));
  location.innerHTML = '<option value="">All Location</option>' + locations.map(v => `<option value="${escAttr(v)}">${esc(v)}</option>`).join('');
  type.innerHTML = '<option value="">All Object Type</option>' + types.map(v => `<option value="${escAttr(v)}">${esc(v)}</option>`).join('');
  location.disabled = false;
  type.disabled = false;
  search.disabled = false;
  search.value = '';

  $('assetCount').textContent = `${currentRegionAssets.length.toLocaleString('id-ID')} asset — ${currentRegion}`;
  renderAssetTable(currentRegionAssets, 1);
  if (document.getElementById('rbi').classList.contains('active')) {
    renderRbiTable(currentRegionAssets);
    rbiRendered = true;
  }
}

function filterCurrentRegion() {
  if (!currentRegion) return;
  const q = $('assetSearch').value.trim().toLowerCase();
  const location = $('locationFilter').value;
  const type = $('typeFilter').value;
  const filtered = currentRegionAssets.filter(x => {
    const hay = `${x.tag} ${x.name} ${x.objectType} ${x.service} ${x.area}`.toLowerCase();
    return (!q || hay.includes(q)) && (!location || x.area === location) && (!type || x.objectType === type);
  });
  renderAssetTable(filtered, 1);
}

async function loadInspections() {
  if (inspectionData) {
    renderInspectionByYear(inspectionData);
    return;
  }
  $('inspectionTable').innerHTML = '<div class="empty">Memuat inspection...</div>';
  const res = await fetch('data/inspections.json', { cache: 'no-store' });
  if (!res.ok) throw new Error(`inspections.json HTTP ${res.status}`);
  inspectionData = await res.json();
  renderInspectionByYear(inspectionData);
}

function inspectionYearValue(item) {
  const raw = item?.date ?? item?.inspectionDate ?? item?.inspection_date ?? item?.year ?? '';
  const match = String(raw).match(/(?:19|20)\d{2}/);
  return match ? match[0] : 'Unknown';
}

function renderInspectionByYear(list, selectedYear = '') {
  const summary = $('inspectionYearSummary');
  const table = $('inspectionTable');
  const yearSelect = $('inspectionYear');
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
  const table = $('inspectionTable');
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  page = Math.min(Math.max(1, page), totalPages);
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  if (!visible.length) { table.innerHTML = '<div class="empty">Tidak ada inspection pada tahun yang dipilih.</div>'; return; }
  table.innerHTML = `<div class="report-heading"><h3>Inspection Report ${selectedYear || 'All Years'}</h3><span class="badge">${filtered.length.toLocaleString('id-ID')} inspection</span></div><table><thead><tr><th>Tag No.</th><th>Date</th><th>Method</th><th>Finding</th><th>Remarks</th></tr></thead><tbody>${visible.map(x => `<tr><td><b>${esc(x.tag)}</b></td><td>${esc(x.date || '-')}</td><td>${esc(x.method || '-')}</td><td>${esc(x.finding || '-')}</td><td>${esc(x.remarks || '-')}</td></tr>`).join('')}</tbody></table>${paginationHtml(page, totalPages)}`;
  table.querySelectorAll('[data-page]').forEach(btn => btn.addEventListener('click', () => renderInspectionPage(filtered, selectedYear, Number(btn.dataset.page))));
}

function renderAssetTable(list, page = 1) {
  const table = $('assetTable');
  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  page = Math.min(Math.max(1, page), totalPages);
  const visible = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  $('assetCount').textContent = `${list.length.toLocaleString('id-ID')} asset — ${currentRegion || ''}`;
  if (!visible.length) { table.innerHTML = '<div class="empty">Tidak ada asset sesuai filter.</div>'; return; }
  table.innerHTML = `<table><thead><tr><th>Tag No.</th><th>Deskripsi Peralatan</th><th>Object Type</th><th>Location</th><th>Risk 1AP</th><th>Integrity Status</th></tr></thead><tbody>${visible.map(x => `<tr><td><b>${esc(x.tag)}</b></td><td>${esc(x.name || '-')}</td><td>${esc(x.objectType || '-')}</td><td>${esc(x.area || '-')}</td><td><span class="risk">${esc(x.risk1AP || '-')}</span></td><td>${esc(integrityDisplay(x.integrityStatus))}</td></tr>`).join('')}</tbody></table>${paginationHtml(page,totalPages)}`;
  table.querySelectorAll('[data-page]').forEach(btn => btn.addEventListener('click', () => renderAssetTable(list, Number(btn.dataset.page))));
}

function renderRbiTable(list, page = 1) {
  const table = $('rbiTable');
  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  page = Math.min(Math.max(1, page), totalPages);
  const visible = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  table.innerHTML = `<div class="report-heading"><h3>RBI — ${esc(currentRegion || '')}</h3><span class="badge">${list.length.toLocaleString('id-ID')} asset</span></div><table><thead><tr><th>Tag No.</th><th>Damage Mechanism</th><th>Corrosion Rate</th><th>Current Thickness</th><th>Risk 1AP</th><th>RBI Status</th></tr></thead><tbody>${visible.map(x => `<tr><td>${esc(x.tag)}</td><td>${esc(x.damageMechanism || '-')}</td><td>${x.corrosionRate ?? '-'} mm/y</td><td>${x.currentThickness ?? '-'} mm</td><td><span class="risk">${esc(x.risk1AP || '-')}</span></td><td>${esc(x.rbiStatus || '-')}</td></tr>`).join('')}</tbody></table>${paginationHtml(page,totalPages)}`;
  table.querySelectorAll('[data-page]').forEach(btn => btn.addEventListener('click', () => renderRbiTable(list, Number(btn.dataset.page))));
}

function integrityDisplay(value) {
  const v = String(value || '').trim();
  const key = v.toLowerCase();
  if (key === 'poor') return 'Poor';
  if (key === 'fair') return 'Fair';
  if (key === 'good') return 'Good';
  return v || '-';
}

function paginationHtml(page, totalPages) {
  if (totalPages <= 1) return '';
  return `<div class="pagination"><button data-page="${Math.max(1,page-1)}" ${page === 1 ? 'disabled' : ''}>‹ Prev</button><span>Page ${page.toLocaleString('id-ID')} / ${totalPages.toLocaleString('id-ID')}</span><button data-page="${Math.min(totalPages,page+1)}" ${page === totalPages ? 'disabled' : ''}>Next ›</button></div>`;
}

function renderBars(id, data) {
  const el = $(id);
  const entries = Object.entries(data || {});
  const max = Math.max(1, ...entries.map(([,v]) => Number(v) || 0));
  el.innerHTML = entries.length ? entries.map(([k,v]) => `<div class="bar-row"><span>${esc(k)}</span><div class="bar"><i style="width:${((Number(v)||0)/max)*100}%"></i></div><b>${Number(v).toLocaleString('id-ID')}</b></div>`).join('') : '<p class="muted">No data</p>';
}

function renderRecent(list) {
  $('recentAssets').innerHTML = list.length ? `<div class="mini-table">${list.map(x => `<div><b>${esc(x.tag)}</b><span>${esc(x.name)}</span><em>${esc(x.wilayahKerja || '-')}</em></div>`).join('')}</div>` : '<p class="muted">No asset data.</p>';
}

function esc(v) { return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c])); }
function escAttr(v) { return esc(v).replace(/`/g, '&#096;'); }
