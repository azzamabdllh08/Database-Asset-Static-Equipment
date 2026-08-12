const CONFIG = {
  brand: "DATABASE ASSET STATIC EQUIPMENT",
  title: "DATABASE ASSET STATIC EQUIPMENT",
  reportUrl: "https://1drv.ms/f/c/8dd2c5d0a467a39a/IgBGq-_P3IkZTYk2rsWBkd-VAb1oNTqVs2J6KM667FCvxqc?e=GYRHCX",
  databaseTemplate: "asset_template.csv"
};

(()=>{
  const css=document.createElement('link');css.rel='stylesheet';css.href='dashboard_theme.css';document.head.appendChild(css);
  const compact=document.createElement('link');compact.rel='stylesheet';compact.href='dashboard_compact.css';document.head.appendChild(compact);
  const inspectionCss=document.createElement('link');inspectionCss.rel='stylesheet';inspectionCss.href='rbi_due_ui.css';document.head.appendChild(inspectionCss);
  const js=document.createElement('script');js.src='dashboard_ui.js';document.head.appendChild(js);
  const inspection=document.createElement('script');inspection.src='inspection_ui.js';document.head.appendChild(inspection);
  const xlsx=document.createElement('script');
  xlsx.src='https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.js';
  xlsx.onload=()=>{const exp=document.createElement('script');exp.src='xlsx-export.js?v=20260812-final4';document.head.appendChild(exp)};
  document.head.appendChild(xlsx);
  setTimeout(()=>{const due=document.createElement('script');due.src='rbi_due_ui.js?v=20260812-final4';document.body.appendChild(due)},0);
})();
