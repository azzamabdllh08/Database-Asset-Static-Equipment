function initDashboardUI(){
 const d=document.getElementById('dashboard'); if(!d)return;
 d.innerHTML=`
 <div class="exec-head"><div><span class="exec-kicker">ASSET INTEGRITY MANAGEMENT</span><h1>Asset Database</h1><p>Executive overview of static equipment, inspection records and RBI readiness.</p></div><div class="exec-meta"><span class="live-dot"></span><div><b>System Online</b><small id="lastDataSync">Last data sync: -</small></div></div></div>
 <div class="exec-kpis">
  <div class="exec-kpi blue"><span class="exec-icon">▦</span><div><small>Total Asset</small><strong id="dashTotalAsset">-</strong><em>Static equipment</em></div></div>
  <div class="exec-kpi teal"><span class="exec-icon">◫</span><div><small>Inspection Records</small><strong id="dashInspection">-</strong><em>Inspection history</em></div></div>
  <div class="exec-kpi amber"><span class="exec-icon">◉</span><div><small>RBI Assessment</small><strong id="dashRbi">-</strong><em>Assessment records</em></div></div>
  <div class="exec-kpi red"><span class="exec-icon">!</span><div><small>High Risk</small><strong id="dashHighRisk">-</strong><em>Unsatisfactory + Critical</em></div></div>
 </div>
 <div class="exec-main">
  <div class="exec-panel regional"><div class="exec-title"><div><span>DATABASE DISTRIBUTION</span><h2>Wilayah Kerja</h2></div><b id="regionTotal">7 Wilayah</b></div><div id="regionBars" class="region-bars"></div></div>
  <div class="exec-panel readiness"><div class="exec-title"><div><span>DATA READINESS</span><h2>Database Coverage</h2></div><b>24 Months · 1AP</b></div><div class="readiness-list"><div><div><span>Inspection</span><strong id="coverageInspection">-</strong></div><i><b id="coverageInspectionBar"></b></i></div><div><div><span>RBI Assessment</span><strong id="coverageRbi">-</strong></div><i><b id="coverageRbiBar"></b></i></div><div><div><span>Regional Data</span><strong id="coverageRegions">-</strong></div><i><b id="coverageRegionsBar"></b></i></div></div><div class="readiness-foot">Database source <b>Regional JSON / Manifest</b></div></div>
 </div>
 <div class="exec-bottom"><div><div class="exec-section-head"><div><span>QUICK ACCESS</span><h2>Modules</h2></div><small>Access frequently used modules</small></div><div class="module-strip"><button data-page="assets"><span class="module-dot blue">▦</span><div><b>Asset Register</b><small>Browse equipment</small></div><strong>→</strong></button><button data-page="inspection"><span class="module-dot teal">◫</span><div><b>Inspection</b><small>Inspection history</small></div><strong>→</strong></button><button data-page="rbi"><span class="module-dot amber">◉</span><div><b>RBI Assessment</b><small>Risk & planning</small></div><strong>→</strong></button><button data-page="import"><span class="module-dot red">⇧</span><div><b>Import Data</b><small>Update database</small></div><strong>→</strong></button></div></div><div class="exec-composition"><div class="exec-section-head"><div><span>ASSET MIX</span><h2>Object Type</h2></div></div><div id="assetComposition" class="mix-list"></div></div></div>`;
 const nav=p=>document.querySelector('.nav-item[data-page="'+p+'"]')?.click(); d.querySelectorAll('[data-page]').forEach(b=>b.addEventListener('click',()=>nav(b.dataset.page)));
 fetch('data/manifest.json',{cache:'no-store'}).then(r=>r.json()).then(x=>{
  const n=id=>document.getElementById(id),fmt=v=>Number(v||0).toLocaleString('id-ID'); const total=+x.totalAssets||0,ins=+x.totalInspections||0,rbi=+x.totalRbi||0;
  if(n('lastDataSync')&&x.generatedAt){const dt=new Date(x.generatedAt);const syncFormatter=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Jakarta',day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false});n('lastDataSync').textContent='Last data sync: '+syncFormatter.format(dt)+' WIB';}
  n('dashTotalAsset').textContent=fmt(total);n('dashInspection').textContent=fmt(ins);n('dashRbi').textContent=fmt(rbi);
  const rc=x.riskCounts||{},high=Object.entries(rc).filter(([k])=>['5D','5E','4E','3E'].includes(k)).reduce((s,[,v])=>s+ +v,0);n('dashHighRisk').textContent=fmt(high);
  const pct=(v,m)=>Math.min(100,m?Math.round(v/m*100):0),ip=pct(ins,total),rp=pct(rbi,total),regions=x.regions||[];
  n('coverageInspection').textContent=ip+'%';n('coverageInspectionBar').style.width=ip+'%';n('coverageRbi').textContent=rp+'%';n('coverageRbiBar').style.width=rp+'%';n('coverageRegions').textContent=regions.length+' Wilayah';n('coverageRegionsBar').style.width=Math.min(100,regions.length/7*100)+'%';n('regionTotal').textContent=regions.length+' Wilayah';
  const max=Math.max(...regions.map(r=>+r.count||0),1);n('regionBars').innerHTML=regions.slice().sort((a,b)=>b.count-a.count).map(r=>`<div class="region-row"><div><span>${r.name}</span><b>${fmt(r.count)}</b></div><i><b style="width:${Math.max(3,(r.count/max)*100)}%"></b></i></div>`).join('');
  const types=Object.entries(x.typeCounts||{}).sort((a,b)=>b[1]-a[1]).slice(0,4),maxType=types[0]?.[1]||1;n('assetComposition').innerHTML=types.map(([name,count])=>`<div><span>${name}</span><b>${fmt(count)}</b><i><em style="width:${Math.max(4,count/maxType*100)}%"></em></i></div>`).join('');
 }).catch(console.warn);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initDashboardUI);else initDashboardUI();