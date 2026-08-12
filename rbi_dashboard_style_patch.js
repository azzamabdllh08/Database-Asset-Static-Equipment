(() => {
  function applyRbiDashboardStyle() {
    const ui = document.getElementById('rbiDirectUi');
    if (!ui) return;
    const sections = ui.querySelectorAll('.rbi-direct-section');
    const risk = sections[0];
    if (!risk || risk.dataset.dashboardStyled === '1') return;
    risk.dataset.dashboardStyled = '1';

    const head = risk.querySelector('.section-head');
    const matrix = document.getElementById('rbiDirectMatrix');
    const summary = document.getElementById('rbiDirectSummary');
    const diagram = document.getElementById('rbiDirectDiagram');
    if (!head || !matrix || !diagram) return;

    const left = document.createElement('div');
    left.className = 'rbi-dashboard-card rbi-dashboard-matrix-card';
    const leftHead = document.createElement('div');
    leftHead.className = 'section-head';
    leftHead.innerHTML = '<h3>RBI Risk Matrix 1AP</h3><span class="badge">Risk 1AP</span>';
    left.appendChild(leftHead);
    left.appendChild(matrix);
    if (summary) left.appendChild(summary);

    const right = document.createElement('div');
    right.className = 'rbi-dashboard-card rbi-dashboard-diagram-card';
    const rightHead = document.createElement('div');
    rightHead.className = 'section-head';
    rightHead.innerHTML = '<h3>Diagram Risiko 1AP</h3><span id="rbiDashboardRiskTotal" class="badge">0 asset</span>';
    right.appendChild(rightHead);
    right.appendChild(diagram);

    risk.innerHTML = '';
    risk.appendChild(left);
    risk.appendChild(right);

    const style = document.createElement('style');
    style.id = 'rbiDashboardStyle';
    style.textContent = `
      #rbiDirectUi .rbi-direct-section[data-dashboard-styled="1"] {
        border: 0 !important;
        padding: 0 !important;
        margin: 18px 0 0 !important;
        background: transparent !important;
        display: grid !important;
        grid-template-columns: minmax(0,1fr) minmax(0,1fr) !important;
        gap: 14px !important;
      }
      #rbiDirectUi .rbi-dashboard-card {
        background: #fff !important;
        border: 1px solid #e2e8f0 !important;
        border-radius: 12px !important;
        padding: 18px !important;
        min-width: 0 !important;
        box-sizing: border-box !important;
        box-shadow: none !important;
      }
      #rbiDirectUi .rbi-dashboard-card .section-head { margin: 0 0 14px !important; }
      #rbiDirectUi .rbi-dashboard-card h3 { margin: 0 !important; font-size: 16px !important; }
      #rbiDirectUi .rbi-dashboard-matrix-card #rbiDirectMatrix { background: transparent !important; border: 0 !important; padding: 0 !important; }
      #rbiDirectUi .risk-matrix-wrap { width: 100% !important; max-width: 680px !important; margin: 8px auto 0 !important; }
      #rbiDirectUi .risk-matrix-box { width: 100% !important; max-width: 560px !important; margin: 0 auto !important; }
      #rbiDirectUi .risk-matrix-grid { width: 100% !important; grid-template-columns: 42px repeat(5,minmax(55px,1fr)) !important; grid-template-rows: 30px repeat(5,58px) !important; }
      #rbiDirectUi .risk-cell { font-size: 16px !important; }
      #rbiDirectUi .risk-cell span { font-size: 16px !important; font-weight: 700 !important; }
      #rbiDirectUi .risk-cell small { font-size: 9px !important; }
      #rbiDirectUi .risk-matrix-ylabel { font-size: 12px !important; }
      #rbiDirectUi .risk-matrix-xlabel { font-size: 12px !important; }
      #rbiDirectUi .rbi-dashboard-diagram-card #rbiDirectDiagram { min-height: 0 !important; background: transparent !important; border: 0 !important; padding: 0 !important; }
      #rbiDirectUi .rbi-dashboard-diagram-card .risk-diagram { min-height: 310px !important; display: grid !important; grid-template-columns: 260px minmax(0,1fr) !important; align-items: center !important; gap: 18px !important; }
      #rbiDirectUi .rbi-dashboard-diagram-card .risk-donut { width: 245px !important; height: 245px !important; margin: auto !important; }
      #rbiDirectUi .rbi-dashboard-diagram-card .risk-donut-center b { font-size: 25px !important; }
      #rbiDirectUi .rbi-dashboard-diagram-card .risk-legend { width: 100% !important; }
      #rbiDirectUi .rbi-dashboard-diagram-card .risk-legend-row { min-height: 32px !important; }
      #rbiDirectUi .rbi-direct-section:nth-child(2) { margin-top: 18px !important; }
      @media (max-width: 1000px) {
        #rbiDirectUi .rbi-direct-section[data-dashboard-styled="1"] { grid-template-columns: 1fr !important; }
        #rbiDirectUi .rbi-dashboard-diagram-card .risk-diagram { grid-template-columns: 1fr !important; }
        #rbiDirectUi .rbi-dashboard-diagram-card .risk-donut { width: 220px !important; height: 220px !important; }
      }
    `;
    document.head.appendChild(style);

    const total = document.getElementById('rbiDirectCount')?.textContent || '0 asset';
    const badge = document.getElementById('rbiDashboardRiskTotal');
    if (badge) badge.textContent = total;
  }

  function run() {
    applyRbiDashboardStyle();
    setTimeout(applyRbiDashboardStyle, 250);
    setTimeout(applyRbiDashboardStyle, 800);
    setTimeout(applyRbiDashboardStyle, 1800);
  }

  document.addEventListener('click', e => {
    if (e.target.closest('.nav button[data-page="rbi"]')) setTimeout(run, 100);
  }, true);
  window.addEventListener('DOMContentLoaded', run);
})();
