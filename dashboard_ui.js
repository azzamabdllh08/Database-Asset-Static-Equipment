function initDashboardUI(){
 const d=document.getElementById('dashboard'); if(!d)return;
 d.innerHTML=`<div class="dash-hero"><div><div class="dash-kicker">ASSET INTEGRITY MANAGEMENT</div><h1>Asset Database</h1><p>Central monitoring dashboard untuk Static Equipment, Inspection dan Risk Based Inspection.</p></div><div class="hero-status"><span class="live-dot"></span><div><b>System Online</b><small>Database & services available</small></div></div></div>
 <div class="dash-welcome"><div><span class="eyebrow">OVERVIEW</span><h2>Operational Asset Overview</h2><p>Pantau kondisi database dan akses modul utama dari satu halaman.</p></div><div class="dash-date">Assessment Period <b>24 Months (1AP)</b></div></div>
 <div class="dash-kpis"><div class="dash-kpi"><div class="kpi-icon blue">▦</div><div><small>Total Asset</small><b id="dashTotalAsset">-</b><span>Static equipment terdaftar</span></div></div><div class="dash-kpi"><div class="kpi-icon teal">◫</div><div><small>Inspection Records</small><b id="dashInspection">-</b><span>Riwayat inspection</span></div></div><div class="dash-kpi"><div class="kpi-icon amber">◉</div><div><small>RBI Assessment</small><b id="dashRbi">-</b><span>Asset dengan assessment</span></div></div><div class="dash-kpi risk"><div class="kpi-icon red">!</div><div><small>High Risk</small><b id="dashHighRisk">-</b><span>Unsatisfactory + Critical</span></div></div></div>
 <div class="dash-section-title"><div><h2>Quick Access</h2><p>Modul utama Asset Database</p></div></div>
 <div class="dash-modules"><button class="dash-module" data-page="assets"><span class="module-icon blue">▦</span><span><b>Asset Register</b><small>Kelola dan telusuri seluruh static equipment berdasarkan Wilayah Kerja dan Location.</small></span><strong>→</strong></button><button class="dash-module" data-page="inspection"><span class="module-icon teal">◫</span><span><b>Inspection</b><small>Lihat inspection history dan data inspeksi yang tersedia.</small></span><strong>→</strong></button><button class="dash-module" data-page="rbi"><span class="module-icon amber">◉</span><span><b>RBI Assessment</b><small>Risk Matrix 1AP, Risk Summary dan Inspection Due Planning.</small></span><strong>→</strong></button><button class="dash-module" data-page="import"><span class="module-icon red">⇧</span><span><b>Import Data</b><small>Import asset, inspection dan RBI data secara bertahap.</small></span><strong>→</strong></button></div>
 <div class="dash-bottom-grid"><div class="panel dash-composition"><div class="panel-title"><div><h2>Asset Composition</h2><p>Distribusi static equipment berdasarkan object type.</p></div><span class="panel-caption">Top categories</span></div><div id="assetComposition"></div></div><div class="panel dash-coverage"><div class="panel-title"><div><h2>Data Coverage</h2><p>Perbandingan data utama terhadap total asset.</p></div><span class="panel-caption">Database health</span></div><div class="coverage-list"><div class="coverage-row"><div><span>Inspection Coverage</span><b id="coverageInspection">-</b></div><div class="coverage-track"><i id="coverageInspectionBar"></i></div><small>Inspection records / Total asset</small></div><div class="coverage-row"><div><span>RBI Assessment Coverage</span><b id="coverageRbi">-</b></div><div class="coverage-track"><i id="coverageRbiBar"></i></div><small>RBI assessment / Total asset</small></div><div class="coverage-row"><div><span>Regional Database</span><b id="coverageRegions">-</b></div><div class="coverage-track"><i id="coverageRegionsBar"></i></div><small>Wilayah kerja aktif dalam database</small></div></div></div></div>`;
 const nav=p=>document.querySelector('.nav-item[data-page="'+p+'"]')?.click();
 d.querySelectorAll('.dash-module,.dashboard-link').forEach(b=>b.addEventListener('click',()=>nav(b.dataset.page)));
 fetch('data/manifest.json',{cache:'no-store'}).then(r=>r.json()).then(x=>{
  const n=id=>document.getElementById(id),fmt=v=>Number(v||0).toLocaleString('id-ID');
  const total=Number(x.totalAssets||0), inspections=Number(x.totalInspections||0), rbi=Number(x.totalRbi||0);
  if(n('dashTotalAsset'))n('dashTotalAsset').textContent=fmt(total);
  if(n('dashInspection'))n('dashInspection').textContent=fmt(inspections);
  if(n('dashRbi'))n('dashRbi').textContent=fmt(rbi);
  const rc=x.riskCounts||{};
  const high=Object.entries(rc).filter(([k])=>['5D','5E','4E','3E'].includes(k)).reduce((s,[,v])=>s+Number(v||0),0);
  if(n('dashHighRisk'))n('dashHighRisk').textContent=fmt(high);
  const pct=(v,max)=>Math.min(100,max?Math.round((v/max)*100):0);
  const ip=pct(inspections,total),rp=pct(rbi,total),regions=(x.regions||[]).length;
  if(n('coverageInspection'))n('coverageInspection').textContent=ip+'%';
  if(n('coverageInspectionBar'))n('coverageInspectionBar').style.width=ip+'%';
  if(n('coverageRbi'))n('coverageRbi').textContent=rp+'%';
  if(n('coverageRbiBar'))n('coverageRbiBar').style.width=rp+'%';
  if(n('coverageRegions'))n('coverageRegions').textContent=regions+' Wilayah';
  if(n('coverageRegionsBar'))n('coverageRegionsBar').style.width=Math.min(100,regions*14.3)+'%';
  const types=Object.entries(x.typeCounts||{}).sort((a,b)=>b[1]-a[1]).slice(0,6),maxType=types[0]?.[1]||1;
  if(n('assetComposition'))n('assetComposition').innerHTML=types.map(([name,count])=>`<div class="composition-row"><div><span>${name}</span><b>${fmt(count)}</b></div><div class="composition-track"><i style="width:${Math.max(3,(count/maxType)*100)}%"></i></div><small>${total?((count/total)*100).toFixed(1):'0.0'}%</small></div>`).join('');
 }).catch(console.warn);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initDashboardUI);else initDashboardUI();