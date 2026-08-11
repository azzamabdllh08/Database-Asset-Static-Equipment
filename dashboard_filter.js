(() => {
  const state = { regionAssets: [], regionName: '', regionSlug: '' };

  const esc = value => String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[c]));

  function riskCountsFor(list) {
    const counts = {};
    list.forEach(asset => {
      const risk = String(asset?.risk1AP ?? asset?.risk ?? '').trim().toUpperCase();
      if (/^[1-5][A-E]$/.test(risk)) counts[risk] = (counts[risk] || 0) + 1;
      else counts.Unknown = (counts.Unknown || 0) + 1;
    });
    return counts;
  }

  function renderFromCounts(counts, total, label) {
    renderRiskMatrix(counts);
    const categories = categoryCountsFromRiskCounts(counts);
    renderRiskSummary(categories);
    renderRiskDiagram(categories);

    const badge = document.querySelector('#riskMatrixPanel .badge');
    if (badge) badge.textContent = `${Number(total).toLocaleString('id-ID')} asset`;
    const diagramBadge = document.getElementById('riskTotalBadge');
    if (diagramBadge) diagramBadge.textContent = `${Number(total).toLocaleString('id-ID')} asset`;
    const status = document.getElementById('dashboardRiskFilterStatus');
    if (status) status.textContent = `${Number(total).toLocaleString('id-ID')} asset — ${label}`;
  }

  function updateLocationOptions() {
    const regionSelect = document.getElementById('dashboardRegionFilter');
    const select = document.getElementById('dashboardLocationFilter');
    if (!select) return;
    const region = regionSelect?.value || '';
    if (!region) {
      select.disabled = true;
      select.innerHTML = '<option value="">All Location</option>';
      return;
    }
    const locations = [...new Set(state.regionAssets
      .map(asset => String(asset.area || '').trim())
      .filter(Boolean))]
      .sort((a, b) => a.localeCompare(b));
    const current = select.value;
    select.disabled = false;
    select.innerHTML = '<option value="">All Location</option>' + locations.map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join('');
    if (locations.includes(current)) select.value = current;
  }

  function updateSelectedRegionView() {
    const regionSelect = document.getElementById('dashboardRegionFilter');
    const locationSelect = document.getElementById('dashboardLocationFilter');
    const region = regionSelect?.value || '';
    const location = locationSelect?.value || '';

    if (!region) {
      const counts = MANIFEST?.riskCounts || {};
      const total = Number(MANIFEST?.totalAssets || 0);
      renderFromCounts(counts, total, 'All Wilayah Kerja / All Location');
      return;
    }

    const filtered = state.regionAssets.filter(asset => !location || String(asset.area || '') === location);
    const counts = riskCountsFor(filtered);
    const label = location ? `${state.regionName} / ${location}` : `${state.regionName} / All Location`;
    renderFromCounts(counts, filtered.length, label);
  }

  async function selectDashboardRegion() {
    const regionSelect = document.getElementById('dashboardRegionFilter');
    const locationSelect = document.getElementById('dashboardLocationFilter');
    const status = document.getElementById('dashboardRiskFilterStatus');
    const region = regionSelect?.value || '';

    if (!region) {
      state.regionAssets = [];
      state.regionName = '';
      state.regionSlug = '';
      updateLocationOptions();
      updateSelectedRegionView();
      return;
    }

    const meta = (MANIFEST?.regions || []).find(item => String(item.name) === region);
    if (!meta) return;
    status.textContent = `Memuat ${region}...`;
    regionSelect.disabled = true;
    locationSelect.disabled = true;

    try {
      const res = await fetch(`data/regions/${encodeURIComponent(meta.slug)}.json`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`Region data HTTP ${res.status}`);
      const data = await res.json();
      state.regionAssets = Array.isArray(data.assets) ? data.assets : [];
      state.regionName = data.wilayahKerja || region;
      state.regionSlug = meta.slug;
      updateLocationOptions();
      locationSelect.value = '';
      updateSelectedRegionView();
    } catch (error) {
      console.error('Dashboard risk filter:', error);
      status.textContent = 'Gagal memuat wilayah';
    } finally {
      regionSelect.disabled = false;
      if (region) locationSelect.disabled = false;
    }
  }

  function injectStyles() {
    if (document.getElementById('dashboardRiskFilterStyles')) return;
    const style = document.createElement('style');
    style.id = 'dashboardRiskFilterStyles';
    style.textContent = `
      .dashboard-risk-filters{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:0 0 14px;padding:10px 12px;background:#f7f9fc;border:1px solid #e2e8f0;border-radius:10px}
      .dashboard-risk-filters select{min-width:190px;padding:8px 10px;border:1px solid #cbd5e1;border-radius:7px;background:#fff;font:inherit;color:#17324d}
      .dashboard-risk-filters select:disabled{background:#f1f5f9;color:#94a3b8}
      .dashboard-risk-filter-status{font-size:12px;color:#64748b;margin-left:auto}
      @media(max-width:700px){.dashboard-risk-filter-status{width:100%;margin-left:0}.dashboard-risk-filters select{width:100%}}
    `;
    document.head.appendChild(style);
  }

  function injectControls() {
    const matrix = document.getElementById('riskMatrix');
    if (!matrix || document.getElementById('dashboardRiskFilters')) return false;
    injectStyles();
    const host = matrix.parentElement;
    const controls = document.createElement('div');
    controls.id = 'dashboardRiskFilters';
    controls.className = 'dashboard-risk-filters';
    controls.innerHTML = `
      <select id="dashboardRegionFilter" aria-label="Filter Wilayah Kerja">
        <option value="">All Wilayah Kerja</option>
        ${(MANIFEST?.regions || []).map(r => `<option value="${esc(r.name)}">${esc(r.name)}</option>`).join('')}
      </select>
      <select id="dashboardLocationFilter" aria-label="Filter Location" disabled>
        <option value="">All Location</option>
      </select>
      <span id="dashboardRiskFilterStatus" class="dashboard-risk-filter-status">All Wilayah Kerja / All Location</span>
    `;
    host.insertBefore(controls, matrix);
    document.getElementById('dashboardRegionFilter').addEventListener('change', selectDashboardRegion);
    document.getElementById('dashboardLocationFilter').addEventListener('change', updateSelectedRegionView);
    return true;
  }

  function initDashboardFilters(attempt = 0) {
    if (typeof MANIFEST === 'undefined' || typeof renderRiskMatrix !== 'function' || !document.getElementById('riskMatrix')) {
      if (attempt < 50) setTimeout(() => initDashboardFilters(attempt + 1), 100);
      return;
    }
    if (!injectControls()) return;
    updateSelectedRegionView();
  }

  window.addEventListener('DOMContentLoaded', () => initDashboardFilters());
})();
