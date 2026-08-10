document.addEventListener('DOMContentLoaded', () => {
  const assets = Array.isArray(window.ASSETS) ? window.ASSETS : ASSETS;
  const inspections = Array.isArray(window.INSPECTIONS) ? window.INSPECTIONS : INSPECTIONS;

  document.getElementById('brand').textContent = CONFIG.brand;
  document.title = CONFIG.title;
  const reportLink = document.getElementById('reportLink');
  if (CONFIG.reportUrl) reportLink.href = CONFIG.reportUrl;

  const pages = document.querySelectorAll('.page');
  document.querySelectorAll('.nav button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      pages.forEach(p => p.classList.toggle('active', p.id === btn.dataset.page));
    });
  });

  const by = (key) => assets.reduce((m, x) => { const v = x[key] || 'Unknown'; m[v] = (m[v] || 0) + 1; return m; }, {});
  const types = by('type');
  const risks = by('risk');

  document.getElementById('totalAssets').textContent = assets.length.toLocaleString('id-ID');
  document.getElementById('totalInspections').textContent = inspections.length.toLocaleString('id-ID');
  document.getElementById('totalRbi').textContent = assets.filter(x => x.risk).length.toLocaleString('id-ID');
  document.getElementById('highRisk').textContent = assets.filter(x => ['4A','4B','4C','4D','4E','5A','5B','5C','5D','5E'].includes(String(x.risk))).length.toLocaleString('id-ID');

  renderBars('typeChart', types);
  renderBars('riskChart', risks);
  renderRecent(assets.slice(0, 8));
  renderAssetTable(assets);
  renderInspectionTable(inspections);
  renderRbiTable(assets);
  fillFilters(assets);

  const search = document.getElementById('assetSearch');
  const typeFilter = document.getElementById('typeFilter');
  const areaFilter = document.getElementById('areaFilter');
  [search, typeFilter, areaFilter].forEach(el => el.addEventListener('input', filterAssets));

  function filterAssets() {
    const q = search.value.toLowerCase();
    const type = typeFilter.value;
    const area = areaFilter.value;
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

function renderBars(id, data) {
  const el = document.getElementById(id); const max = Math.max(1, ...Object.values(data));
  el.innerHTML = Object.entries(data).map(([k,v]) => `<div class="bar-row"><span>${esc(k)}</span><div class="bar"><i style="width:${(v/max)*100}%"></i></div><b>${v}</b></div>`).join('') || '<p class="muted">No data</p>';
}
function renderRecent(list) {
  document.getElementById('recentAssets').innerHTML = list.length ? `<div class="mini-table">${list.map(x => `<div><b>${esc(x.tag)}</b><span>${esc(x.name)}</span><em>${esc(x.risk || '-')}</em></div>`).join('')}</div>` : '<p class="muted">No asset data.</p>';
}
function renderAssetTable(list) {
  document.getElementById('assetCount').textContent = `${list.length} asset`;
  document.getElementById('assetTable').innerHTML = `<table><thead><tr><th>Tag No.</th><th>Equipment</th><th>Type</th><th>Area</th><th>Service</th><th>Material</th><th>Risk</th></tr></thead><tbody>${list.map(x => `<tr><td><b>${esc(x.tag)}</b></td><td>${esc(x.name)}</td><td>${esc(x.type)}</td><td>${esc(x.area)}</td><td>${esc(x.service)}</td><td>${esc(x.material)}</td><td><span class="risk">${esc(x.risk || '-')}</span></td></tr>`).join('')}</tbody></table>`;
}
function renderInspectionTable(list) {
  document.getElementById('inspectionTable').innerHTML = list.length ? '<table><thead><tr><th>Tag No.</th><th>Date</th><th>Method</th><th>Finding</th></tr></thead><tbody>' + list.map(x => `<tr><td>${esc(x.tag)}</td><td>${esc(x.date)}</td><td>${esc(x.method)}</td><td>${esc(x.finding)}</td></tr>`).join('') + '</tbody></table>' : '<div class="empty">Belum ada inspection history.</div>';
}
function renderRbiTable(list) {
  document.getElementById('rbiTable').innerHTML = `<table><thead><tr><th>Tag No.</th><th>Damage Mechanism</th><th>Corrosion Rate</th><th>Current Thickness</th><th>Risk</th><th>RBI Status</th></tr></thead><tbody>${list.map(x => `<tr><td>${esc(x.tag)}</td><td>${esc(x.damageMechanism || '-')}</td><td>${x.corrosionRate ?? '-'} mm/y</td><td>${x.currentThickness ?? '-'} mm</td><td><span class="risk">${esc(x.risk || '-')}</span></td><td>${esc(x.rbiStatus || '-')}</td></tr>`).join('')}</tbody></table>`;
}
function esc(v) { return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c])); }
