/* RBI table layout override: use inspection dates from Excel columns AA and AB. */
(function () {
  function formatRbiDate(value) {
    if (!value) return '-';
    const raw = String(value).trim();
    const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return raw;
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const month = Number(match[2]);
    return month >= 1 && month <= 12 ? `${match[3]}/${months[month - 1]}/${match[1]}` : raw;
  }

  window.renderRbiTable = function (list, page = 1) {
    const table = document.getElementById('rbiTable');
    const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    page = Math.min(Math.max(1, page), totalPages);
    const visible = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    table.innerHTML = `<div class="report-heading"><h3>RBI — ${esc(currentRegion || '')}</h3><span class="badge">${list.length.toLocaleString('id-ID')} asset</span></div><table><thead><tr><th>Tag No.</th><th>Damage Mechanism</th><th>Last Inspection Date</th><th>Inspection Due Date</th><th>Risk 1AP</th></tr></thead><tbody>${visible.map(x => `<tr><td>${esc(x.tag)}</td><td>${esc(x.damageMechanism || '-')}</td><td>${esc(formatRbiDate(x.lastInspectionDate))}</td><td>${esc(formatRbiDate(x.inspectionDueDate))}</td><td><span class="risk">${esc(x.risk1AP || '-')}</span></td></tr>`).join('')}</tbody></table>${paginationHtml(page,totalPages)}`;
    table.querySelectorAll('[data-page]').forEach(btn => btn.addEventListener('click', () => renderRbiTable(list, Number(btn.dataset.page))));
  };

  // Load the inspection year/region/location filter patch without changing index.html.
  const script = document.createElement('script');
  script.src = 'inspection_filter.js?v=1';
  script.async = false;
  document.head.appendChild(script);
})();
