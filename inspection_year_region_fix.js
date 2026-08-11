(() => {
  // Keep the Wilayah Kerja filter scoped to the currently selected inspection year.
  // The existing inspection renderer remains responsible for the table; this patch
  // only corrects the filter options so unrelated regions are not shown.
  const originalRender = window.renderInspectionByYear;
  if (typeof originalRender !== 'function') return;

  let latestInspectionList = [];
  let regionIndexPromise = null;
  let listenersInstalled = false;

  const esc = value => String(value ?? '').replace(/[&<>\"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'
  }[c]));

  const yearOf = value => {
    const m = String(value ?? '').match(/(?:19|20)\d{2}/);
    return m ? m[0] : 'Unknown';
  };

  function getRegionIndex() {
    if (regionIndexPromise) return regionIndexPromise;
    const manifest = window.MANIFEST || {};
    const regions = Array.isArray(manifest.regions) ? manifest.regions : [];
    regionIndexPromise = Promise.all(regions.map(async r => {
      try {
        const res = await fetch(`data/regions/${encodeURIComponent(r.slug)}.json`, { cache: 'no-store' });
        if (!res.ok) return [];
        const data = await res.json();
        return (Array.isArray(data.assets) ? data.assets : []).map(a => ({
          tag: String(a.tag ?? '').trim(),
          wilayahKerja: String(data.wilayahKerja ?? r.name ?? '').trim(),
          location: String(a.area ?? '').trim()
        }));
      } catch (_) { return []; }
    })).then(chunks => {
      const map = new Map();
      chunks.flat().forEach(x => { if (x.tag) map.set(x.tag, x); });
      return map;
    });
    return regionIndexPromise;
  }

  function syncYearRegions() {
    const regionSelect = document.getElementById('inspectionRegionFilter');
    const locationSelect = document.getElementById('inspectionLocationFilter');
    const yearSelect = document.getElementById('inspectionYear');
    if (!regionSelect || !locationSelect || !yearSelect || !latestInspectionList.length) return;

    getRegionIndex().then(index => {
      const year = yearSelect.value || '';
      const enriched = latestInspectionList.map(item => {
        const found = index.get(String(item.tag ?? '').trim());
        return { ...item, wilayahKerja: found?.wilayahKerja || '', location: found?.location || '' };
      });
      const scoped = year ? enriched.filter(x => yearOf(x.date) === year) : enriched;
      const availableRegions = [...new Set(scoped.map(x => x.wilayahKerja).filter(Boolean))]
        .sort((a,b) => a.localeCompare(b));

      const oldRegion = regionSelect.value;
      const validRegion = availableRegions.includes(oldRegion) ? oldRegion : '';
      regionSelect.innerHTML = '<option value="">All Wilayah Kerja</option>' +
        availableRegions.map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join('');
      regionSelect.value = validRegion;

      // Location must also be limited to the selected year and selected region.
      const availableLocations = [...new Set(scoped
        .filter(x => !validRegion || x.wilayahKerja === validRegion)
        .map(x => x.location).filter(Boolean))]
        .sort((a,b) => a.localeCompare(b));
      const oldLocation = locationSelect.value;
      const validLocation = availableLocations.includes(oldLocation) ? oldLocation : '';
      locationSelect.innerHTML = '<option value="">All Location</option>' +
        availableLocations.map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join('');
      locationSelect.value = validLocation;
      locationSelect.disabled = !validRegion || !availableLocations.length;

      // Re-run the original renderer's filter handler so the table matches the
      // corrected filter state after a year is selected.
      regionSelect.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  window.renderInspectionByYear = function(list, selectedYearValue = '') {
    latestInspectionList = Array.isArray(list) ? list : [];
    originalRender(list, selectedYearValue);
    // The original renderer enriches regions asynchronously. Re-apply this patch
    // after that work has had time to finish.
    getRegionIndex().then(() => {
      syncYearRegions();
      setTimeout(syncYearRegions, 250);
    });

    if (!listenersInstalled) {
      listenersInstalled = true;
      const yearSelect = document.getElementById('inspectionYear');
      if (yearSelect) yearSelect.addEventListener('change', () => {
        setTimeout(syncYearRegions, 0);
      });

      // Year cards set the select value directly instead of firing change.
      document.addEventListener('click', event => {
        if (event.target.closest('#inspectionYearSummary .year-card')) {
          setTimeout(syncYearRegions, 0);
        }
      });
    }
  };
})();
