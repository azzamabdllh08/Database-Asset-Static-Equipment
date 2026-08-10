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
  renderRiskDashboard(MANIFEST.riskCounts || {});
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

/* RiskWise 1AP matrix categories, matching the supplied 5x5 risk matrix colors. */
const RISK_MATRIX = {
  5: { A: 'Unsatisfactory', B: 'Unsatisfactory', C: 'Unsatisfactory', D: 'Critical', E: 'Critical' },
  4: { A: 'Tolerable', B: 'Tolerable', C: 'Tolerable', D: 'Tolerable', E: 'Critical' },
  3: { A: 'Acceptable', B: 'Acceptable', C: 'Tolerable', D: 'Tolerable', E: 'Critical' },
  2: { A: 'Favourable', B: 'Acceptable', C: 'Tolerable', D: 'Tolerable', E: 'Unsatisfactory' },
  1: { A: 'Favourable', B: 'Favourable', C: 'Tolerable', D: 'Tolerable', E: 'Tolerable' }
};

const RISK_COLORS = {
  Favourable: '#00b050',
  Acceptable: '#92d050',
  Tolerable: '#fff200',
  Unsatisfactory: '#ffc000',
  Critical: '#ff0000',
  'No AP Detected': '#d9dde3'
};

const RISK_ORDER = ['Favourable', 'Acceptable', 'Tolerable', 'Unsatisfactory', 'Critical', 'No AP Detected'];

function riskCellCategory(risk) {
  const match = String(risk || '').trim().toUpperCase().match(/^([1-5])([A-E])$/);
  if (!match) return 'No AP Detected';
  return RISK_MATRIX[Number(match[1])]?.[match[2]] || 'No AP Detected';
}

function normaliseRiskCounts(data) {
  const counts = {};
  RISK_ORDER.forEach(k => counts[k] = 0);
  Object.entries(data || {}).forEach(([risk, value]) => {
    const n = Number(value) || 0;
    if (/^[1-5][A-E]$/i.test(String(risk).trim())) counts[risk.toUpperCase()] = (counts[risk.toUpperCase()] || 0) + n;
    else counts['No AP Detected'] += n;
  });
  return counts;
}

function categoryCountsFromRiskCounts(riskCounts) {
  const out = {};
  RISK_ORDER.forEach(k => out[k] = 0);
  Object.entries(riskCounts || {}).forEach(([risk, value]) => {
    out[riskCellCategory(risk)] += Number(value) || 0;
  });
  return out;
}

function renderRiskDashboard(rawRiskCounts) {
  const riskCounts = {};
  Object.entries(rawRiskCounts || {}).forEach(([risk, value]) => {
    const key = String(risk || '').trim();
    const n = Number(value) || 0;
    if (/^[1-5][A-E]$/i.test(key)) riskCounts[key.toUpperCase()] = n;
    else riskCounts['Unknown'] = (riskCounts['Unknown'] || 0) + n;
  });

  renderRiskMatrix(riskCounts);
  const categories = categoryCountsFromRiskCounts(riskCounts);
  renderRiskSummary(categories);
  renderRiskDiagram(categories);
}

function renderRiskMatrix(riskCounts) {
  const el = $('riskMatrix');
  const rows = [5,4,3,2,1];
  const cols = ['A','B','C','D','E'];
  el.innerHTML = `
    <div class="risk-matrix-wrap">
      <div class="risk-matrix-ylabel">Likelihood</div>
      <div class="risk-matrix-box">
        <div class="risk-matrix-grid">
          <div class="risk-corner"></div>
          ${cols.map(c => `<div class="risk-axis risk-axis-x">${c}</div>`).join('')}
          ${rows.map(r => {
            return `<div class="risk-axis risk-axis-y">${r}</div>${cols.map(c => {
              const key = `${r}${c}`;
              const category = RISK_MATRIX[r][c];
              const count = Number(riskCounts[key] || 0);
              return `<div class="risk-cell" style="background:${RISK_COLORS[category]}" title="${key} — ${category}"><span>${count.toLocaleString('id-ID')}</span><small>${key}</small></div>`;
            }).join('')}`;
          }).join('')}
        </div>
        <div class="risk-matrix-xlabel">Consequence</div>
      </div>
    </div>`;
}

function renderRiskSummary(categories) {
  const total = RISK_ORDER.reduce((s, k) => s + Number(categories[k] || 0), 0);
  $('riskSummary').innerHTML = `
    <div class="risk-summary-table-wrap">
      <table class="risk-summary-table">
        <thead><tr><th>Integrity Category</th><th>Jumlah</th><th>%</th></tr></thead>
        <tbody>
          ${RISK_ORDER.map(k => `<tr><td><span class="category-dot" style="background:${RISK_COLORS[k]}"></span>${k}</td><td><b>${Number(categories[k] || 0).toLocaleString('id-ID')}</b></td><td>${total ? ((Number(categories[k] || 0) / total) * 100).toFixed(1) : '0.0'}%</td></tr>`).join('')}
          <tr class="total-row"><td>TOTAL</td><td>${total.toLocaleString('id-ID')}</td><td>100%</td></tr>
        </tbody>
      </table>
    </div>`;
}

function renderRiskDiagram(categories) {
  const total = RISK_ORDER.reduce((s, k) => s + Number(categories[k] || 0), 0);
  const entries = RISK_ORDER.map(k => ({ key: k, value: Number(categories[k] || 0) })).filter(x => x.value > 0);
  let start = 0;
  const segments = entries.map(({ key, value }) => {
    const end = total ? start + (value / total) * 360 : start;
    const segment = `${RISK_COLORS[key]} ${start}deg ${end}deg`;
    start = end;
    return segment;
  });
  const gradient = segments.length ? `conic-gradient(${segments.join(',')})` : `conic-gradient(#d9dde3 0 360deg)`;
  $('riskTotalBadge').textContent = `${total.toLocaleString('id-ID')} asset`;
  $('riskDiagram').innerHTML = `
    <div class="risk-diagram">
      <div class="risk-donut" style="background:${gradient}"><div class="risk-donut-center"><b>${total.toLocaleString('id-ID')}</b><span>Total</span></div></div>
      <div class="risk-legend">
        ${RISK_ORDER.map(k => `<div class="risk-legend-row"><span class="category-dot" style="background:${RISK_COLORS[k]}"></span><span>${k}</span><b>${Number(categories[k] || 0).toLocaleString('id-ID')}</b><small>${total ? ((Number(categories[k] || 0) / total) * 100).toFixed(1) : '0.0'}%</small></div>`).join('')}
      </div>
    </div>`;
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
    const hay = `${x.tag} ${x.name} ${x.objectType} ${x.service} ${x.area} ${x.remarks}`.toLowerCase();
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

function formatInspectionDate(value) {
  if (!value) return '-';
  const raw = String(value).trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return raw;
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const month = Number(match[2]);
  return month >= 1 && month <= 12 ? `${match[3]}/${months[month - 1]}/${match[1]}` : raw;
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
  table.innerHTML = `<div class="report-heading"><h3>Inspection Report ${selectedYear || 'All Years'}</h3><span class="badge">${filtered.length.toLocaleString('id-ID')} inspection</span></div><table><thead><tr><th>Tag No.</th><th>Date</th><th>Method</th><th>Finding</th><th>Remarks</th></tr></thead><tbody>${visible.map(x => `<tr><td><b>${esc(x.tag)}</b></td><td>${esc(formatInspectionDate(x.date))}</td><td>${esc(x.method || '-')}</td><td>${esc(x.finding || '-')}</td><td>${esc(x.remarks || '-')}</td></tr>`).join('')}</tbody></table>${paginationHtml(page, totalPages)}`;
  table.querySelectorAll('[data-page]').forEach(btn => btn.addEventListener('click', () => renderInspectionPage(filtered, selectedYear, Number(btn.dataset.page))));
}

function renderAssetTable(list, page = 1) {
  const table = $('assetTable');
  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  page = Math.min(Math.max(1, page), totalPages);
  const visible = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  $('assetCount').textContent = `${list.length.toLocaleString('id-ID')} asset — ${currentRegion || ''}`;
  if (!visible.length) { table.innerHTML = '<div class="empty">Tidak ada asset sesuai filter.</div>'; return; }
  table.innerHTML = `<table class="asset-table"><thead><tr><th>Tag No.</th><th>Deskripsi Peralatan</th><th>Object Type</th><th>Location</th><th>Risk 1AP</th><th>Integrity Status</th><th>Remarks</th></tr></thead><tbody>${visible.map(x => `<tr><td><b>${esc(x.tag)}</b></td><td>${esc(x.name || '-')}</td><td>${esc(x.objectType || '-')}</td><td>${esc(x.area || '-')}</td><td><span class="risk">${esc(x.risk1AP || '-')}</span></td><td>${esc(integrityDisplay(x.integrityStatus))}</td><td>${esc(x.remarks || '-')}</td></tr>`).join('')}</tbody></table>${paginationHtml(page,totalPages)}`;
  enableAssetColumnResize();
  table.querySelectorAll('[data-page]').forEach(btn => btn.addEventListener('click', () => renderAssetTable(list, Number(btn.dataset.page))));
}

function enableAssetColumnResize() {
  const table = document.querySelector('#assetTable table.asset-table');
  if (!table || table.dataset.resizable === '1') return;
  table.dataset.resizable = '1';
  installAssetResizeStyles();
  const headers = Array.from(table.querySelectorAll('thead th'));
  const saved = JSON.parse(localStorage.getItem('assetTableColumnWidths') || '{}');
  const defaults = [145, 390, 125, 220, 95, 145, 480];
  const minWidths = [100, 220, 90, 150, 80, 110, 240];

  headers.forEach((th, index) => {
    const width = Number(saved[index]) || defaults[index];
    setAssetColumnWidth(table, index, Math.max(minWidths[index], width));
    th.classList.add('asset-resizable-header');
    const handle = document.createElement('span');
    handle.className = 'asset-column-resizer';
    handle.title = 'Geser untuk memperbesar / memperkecil kolom';
    th.appendChild(handle);
    handle.addEventListener('pointerdown', event => {
      event.preventDefault();
      event.stopPropagation();
      handle.setPointerCapture?.(event.pointerId);
      const startX = event.clientX;
      const startWidth = th.getBoundingClientRect().width;
      const onMove = moveEvent => {
        const next = Math.max(minWidths[index], startWidth + moveEvent.clientX - startX);
        setAssetColumnWidth(table, index, next);
      };
      const onUp = () => {
        document.body.classList.remove('asset-column-resizing');
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
        const widths = Array.from(table.querySelectorAll('thead th')).map(h => Math.round(h.getBoundingClientRect().width));
        localStorage.setItem('assetTableColumnWidths', JSON.stringify(widths));
      };
      document.body.classList.add('asset-column-resizing');
      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp, { once: true });
    });
  });
}

function setAssetColumnWidth(table, index, width) {
  const th = table.querySelectorAll('thead th')[index];
  if (!th) return;
  th.style.width = `${width}px`;
  th.style.minWidth = `${width}px`;
  th.style.maxWidth = `${width}px`;
  table.querySelectorAll('tbody tr').forEach(row => {
    const cell = row.children[index];
    if (cell) {
      cell.style.width = `${width}px`;
      cell.style.minWidth = `${width}px`;
      cell.style.maxWidth = `${width}px`;
    }
  });
}

function installAssetResizeStyles() {
  if (document.getElementById('asset-resize-styles')) return;
  const style = document.createElement('style');
  style.id = 'asset-resize-styles';
  style.textContent = `
    #assetTable { overflow-x: auto; }
    #assetTable table.asset-table { table-layout: fixed; min-width: 1600px; }
    #assetTable table.asset-table th,
    #assetTable table.asset-table td { overflow-wrap: anywhere; vertical-align: top; }
    #assetTable table.asset-table th { position: sticky; top: 0; z-index: 2; }
    #assetTable .asset-resizable-header { position: sticky; }
    #assetTable .asset-column-resizer { position:absolute; top:0; right:-3px; width:7px; height:100%; cursor:col-resize; z-index:5; }
    #assetTable .asset-column-resizer:hover { background:rgba(23,105,213,.25); }
    body.asset-column-resizing, body.asset-column-resizing * { cursor:col-resize !important; user-select:none !important; }
  `;
  document.head.appendChild(style);
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
