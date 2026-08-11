(() => {
  // Recovery helpers for the current app shell. Keeps the existing dashboard/assets UI intact.
  if (typeof window.esc !== 'function') {
    window.esc = function (v) {
      return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
    };
  }
  if (typeof window.escAttr !== 'function') {
    window.escAttr = function (v) { return window.esc(v); };
  }
  if (typeof window.paginationHtml !== 'function') {
    window.paginationHtml = function (page, total) {
      if (total <= 1) return '';
      return `<div class="pagination"><button data-page="${Math.max(1,page-1)}" ${page===1?'disabled':''}>‹ Prev</button><span>Page ${page} / ${total}</span><button data-page="${Math.min(total,page+1)}" ${page===total?'disabled':''}>Next ›</button></div>`;
    };
  }
  if (typeof window.integrityDisplay !== 'function') {
    window.integrityDisplay = function (v) { return v || 'N/A'; };
  }
  if (typeof window.renderBars !== 'function') {
    window.renderBars = function (id, data) {
      const el = document.getElementById(id);
      if (!el) return;
      const entries = Object.entries(data || {});
      const max = Math.max(1, ...entries.map(([,v]) => Number(v) || 0));
      el.innerHTML = entries.map(([k,v]) => `<div class="bar-row"><span>${window.esc(k)}</span><div class="bar"><i style="width:${((Number(v)||0)/max)*100}%"></i></div><b>${Number(v||0).toLocaleString('id-ID')}</b></div>`).join('') || '<p class="muted">No data</p>';
    };
  }
  if (typeof window.renderRecent !== 'function') {
    window.renderRecent = function (list) {
      const el = document.getElementById('recentAssets');
      if (!el) return;
      el.innerHTML = Array.isArray(list) && list.length
        ? `<div class="mini-table">${list.map(x => `<div><b>${window.esc(x.tag)}</b><span>${window.esc(x.name || '-')}</span><em>${window.esc(x.risk1AP || x.risk || '-')}</em></div>`).join('')}</div>`
        : '<p class="muted">No asset data.</p>';
    };
  }
  if (typeof window.renderRbiTable !== 'function') {
    window.renderRbiTable = function (list) {
      const el = document.getElementById('rbiTable');
      if (!el) return;
      el.innerHTML = `<table><thead><tr><th>Tag No.</th><th>Damage Mechanism</th><th>Last Inspection Date</th><th>Inspection Due Date</th><th>Risk 1AP</th></tr></thead><tbody>${(list||[]).map(x => `<tr><td>${window.esc(x.tag)}</td><td>${window.esc(x.damageMechanism || '-')}</td><td>${window.esc(x.lastInspectionDate || '-')}</td><td>${window.esc(x.inspectionDueDate || '-')}</td><td><span class="risk">${window.esc(x.risk1AP || x.risk || '-')}</span></td></tr>`).join('')}</tbody></table>`;
    };
  }
  if (typeof window.installAssetResizeStyles !== 'function') {
    window.installAssetResizeStyles = function () {
      if (document.getElementById('asset-resize-styles')) return;
      const style = document.createElement('style');
      style.id = 'asset-resize-styles';
      style.textContent = '.asset-table{table-layout:fixed;width:max-content;min-width:100%}.asset-table th,.asset-table td{overflow-wrap:anywhere;vertical-align:top}.asset-table .asset-remarks-cell{text-align:justify;white-space:normal}.column-resize-grip{position:absolute;right:-3px;top:0;width:7px;height:100%;cursor:col-resize;z-index:2}.asset-table th{position:relative}';
      document.head.appendChild(style);
    };
  }

  // Year cards must select a year on the Inspection page, never navigate to Report.
  window.loadInspections = async function () {
    if (!window.inspectionData) {
      const res = await fetch('data/inspections.json', { cache: 'no-store' });
      if (!res.ok) throw new Error(`inspections.json HTTP ${res.status}`);
      window.inspectionData = await res.json();
      // app.js keeps the same global variable; assign through the global binding as well.
      try { inspectionData = window.inspectionData; } catch (_) {}
    }
    if (typeof window.renderInspectionByYear === 'function') {
      window.renderInspectionByYear(window.inspectionData, document.getElementById('inspectionYear')?.value || '');
    }
  };
})();
