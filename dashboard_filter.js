(() => {
  const state = {
    regions: [],
    assets: [],
    loaded: false,
    loading: null
  };

  const esc = value => String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[c]));

  async function loadAllAssets() {
    if (state.loaded) return state.assets;
    if (state.loading) return state.loading;
    state.loading = Promise.all((MANIFEST?.regions || []).map(async region => {
      const res = await fetch(`data/regions/${encodeURIComponent(region.slug)}.json`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`Region data HTTP ${res.status}`);
      return res.json();
    })).then(groups => {
      state.assets = groups.flatMap(group => Array.isArray(group.assets) ? group.assets : []);
      state.regions = groups.map(group => group.wilayahKerja).filter(Boolean);
      state.loaded = true;
      return state.assets;
    });
    return state.loading;
  }

  function riskCountsFor(list) {
    const counts = {};
    list.forEach(asset => {
      const risk = String(asset?.risk1AP ?? asset?.risk ?? '').trim().toUpperCase();
      if (/^[1-5][A-E]$/.test(risk)) counts[risk] = (counts[risk] || 0) + 1;
      else counts.Unknown = (counts.Unknown || 0) + 1;
    });
    return counts;
  }

  function filteredAssets() {
    const region = document.getElementById('dashboardRegionFilter')?.value || '';
    const location = document.getElementById('dashboardLocationFilter')?.value || '';
    return state.assets.filter(asset => {
      const regionOk = !region || String(asset.wilayahKerja || '') === region;
      const locationOk = !location || String(asset.area || '') === location;
      return regionOk && locationOk;
    });
  }

  function updateLocationOptions() {
    const region = document.getElementById('dashboardRegionFilter')?.value || '';
    const select = document.getElementById('dashboardLocationFilter');
    if (!select) return;
    const locations = [...new Set(state.assets
      .filter(asset => !region || String(asset.wilayahKerja || '') === region)
      .map(asset => String(asset.area || '').trim())
      .filter(Boolean))]
      .sort((a, b) => a.localeCompare(b));
    const current = select.value;
    select.innerHTML = '<option value="">All Location</option>' + locations.map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join('');
    if (locations.includes(current)) select.value = current;
  }

  function updateRiskViews() {
    const assets = filteredAssets();
    const counts = riskCountsFor(assets);
    renderRiskMatrix(counts);
    const categories = categoryCountsFromRiskCounts(counts);
    renderRiskSummary(categories);
    renderRiskDiagram(categories);

    const badge = document.querySelector('#riskMatrixPanel .badge');
    if (badge) badge.textContent = `${assets.length.toLocaleString('id-ID')} asset`;
    const diagramBadge = document.getElementById('riskTotalBadge');
    if (diagramBadge) diagramBadge.textContent = `${assets.length.toLocaleString('id-ID')} asset`;

    const region = document.getElementById('dashboardRegionFilter')?.value || '';
    const location = document.getElementById('dashboardLocationFilter')?.value || '';
    const status = document.getElementById('dashboardRiskFilterStatus');
    if (status) {
      const parts = [];
      if (region) parts.push(region);
      if (location) parts.push(location);
      status.textContent = parts.length ? `${assets.length.toLocaleString('id-ID')} asset — ${parts.join(' / ')}` : `${assets.length.toLocaleString('id-ID')} asset — All Wilayah Kerja / All Location`;
    }
  }

  function injectControls() {
    const matrix = document.getElementById('riskMatrix');
    if (!matrix || document.getElementById('dashboardRiskFilters')) return;
    const host = matrix.parentElement;
    const controls = document.createElement('div');
    controls.id = 'dashboardRiskFilters';
    controls.className = 'dashboard-risk-filters';
    controls.innerHTML = `
      <select id="dashboardRegionFilter" aria-label="Filter Wilayah Kerja">
        <option value="">All Wilayah Kerja</option>
        ${(MANIFEST?.regions || []).map(r => `<option value="${esc(r.name)}">${esc(r.name)}</option>`).join('')}
      </select>
      <select id="dashboardLocationFilter" aria-label="Filter Location">
        <option value="">All Location</option>
      </select>
      <span id="dashboardRiskFilterStatus" class="dashboard-risk-filter-status">Loading data...</span>
    `;
    host.insertBefore(controls, matrix);

    document.getElementById('dashboardRegionFilter').addEventListener('change', () => {
      updateLocationOptions();
      updateRiskViews();
    });
    document.getElementById('dashboardLocationFilter').addEventListener('change', updateRiskViews);
  }

  async function initDashboardFilters() {
    injectControls();
    try {
      await loadAllAssets();
      updateLocationOptions();
      updateRiskViews();
    } catch (error) {
      console.error('Dashboard risk filter:', error);
      const status = document.getElementById('dashboardRiskFilterStatus');
      if (status) status.textContent = 'Gagal memuat filter risk';
    }
  }

  window.addEventListener('DOMContentLoaded', () => {
    const start = () => setTimeout(initDashboardFilters, 0);
    if (window.MANIFEST) start();
    else setTimeout(initDashboardFilters, 300);
  });
})();
