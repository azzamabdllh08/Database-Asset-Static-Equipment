/* Report navigation from Inspection History cards.
 * The actual Report/OneDrive URL can be connected later without changing the year cards.
 */
(function () {
  function showReportPage(year) {
    const pages = document.querySelectorAll('.page');
    const navButtons = document.querySelectorAll('.nav button');
    const reportPage = document.getElementById('reports');
    if (!reportPage) return;

    navButtons.forEach(btn => {
      const active = btn.dataset.page === 'reports';
      btn.classList.toggle('active', active);
    });
    pages.forEach(page => page.classList.toggle('active', page.id === 'reports'));

    const title = reportPage.querySelector('h2');
    if (title) title.textContent = year ? `Report ${year}` : 'Report';

    const note = reportPage.querySelector('.report-selection-note');
    if (note) {
      note.textContent = year
        ? `Tahun report yang dipilih: ${year}. Database Report/OneDrive belum dihubungkan.`
        : 'Belum ada tahun report yang dipilih.';
    }

    const link = document.getElementById('reportLink');
    if (link) {
      const base = (window.CONFIG && CONFIG.reportUrl) ? CONFIG.reportUrl : '';
      if (base) {
        const separator = base.includes('?') ? '&' : '?';
        link.href = `${base}${separator}year=${encodeURIComponent(year || '')}`;
        link.removeAttribute('aria-disabled');
        link.classList.remove('disabled');
      } else {
        link.href = '#';
        link.setAttribute('aria-disabled', 'true');
        link.classList.add('disabled');
      }
    }

    window.history.replaceState({}, document.title, `${window.location.pathname}${year ? `?reportYear=${encodeURIComponent(year)}` : ''}`);
  }

  document.addEventListener('click', event => {
    const card = event.target.closest('.year-card');
    if (!card) return;
    event.preventDefault();
    showReportPage(card.dataset.year || '');
  });

  window.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const year = params.get('reportYear');
    if (year) showReportPage(year);
  });
})();
