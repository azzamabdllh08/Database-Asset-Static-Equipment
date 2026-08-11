let MANIFEST = null;
let currentRegion = null;
let currentRegionAssets = [];
let inspectionData = null;
let rbiRendered = false;
const PAGE_SIZE = 50;

const $ = id => document.getElementById(id);

window.addEventListener('DOMContentLoaded', async () => {
  try {
    const res = await fetch('data/manifest.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`manifest.json HTTP ${res.status}`);
    MANIFEST = await res.json();
    initApp();
  } catch (err) {
    document.querySelector('main').insertAdjacentHTML('afterbegin', `<div class="panel notice">Database belum tersedia. Jalankan sync_static.py terlebih dahulu. <small>${esc(err.message)}</small></div>`);
    console.error(err);
  }
});

function initApp() {
  $('brand').textContent = CONFIG.brand;
  document.title = CONFIG.title;
  if (CONFIG.reportUrl) $('reportLink').href = CONFIG.reportUrl;

  $('totalAssets').textContent = Number(MANIFEST.totalAssets || 0).toLocaleString('id-ID');
  $('totalInspections').textContent = Number(MANIFEST.totalInspections || 0).toLocaleString('id-ID');
  $('totalRbi').textContent = Number(MANIFEST.totalRbi || 0).toLocaleString('id-ID');
  $('highRisk').textContent = Number(MANIFEST.highRisk || 0).toLocaleString('id-ID');

  renderBars('regionChart', Object.fromEntries((MANIFEST.regions || []).map(r => [r.name, r.count])));
  renderBars('typeChart', MANIFEST.typeCounts || {});
  renderRiskDashboard(MANIFEST.riskCounts || {});
  renderRecent(MANIFEST.recentAssets || []);
  fillRegions();

  const pages = document.querySelectorAll('.page');
  const navButtons = document.querySelectorAll('.nav button');
  navButtons.forEach(btn => btn.addEventListener('click', async () => {
    navButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    pages.forEach(p => p.classList.toggle('active', p.id === btn.dataset.page));

    if (btn.dataset.page === 'assets') {
      if (!currentRegion) $('assetTable').innerHTML = '<div class="empty">Pilih Wilayah Kerja untuk memuat asset.</div>';
    }
    if (btn.dataset.page === 'inspection') await loadInspections();
    if (btn.dataset.page === 'rbi' && !rbiRendered) {
      if (!currentRegion) {
        $('rbiTable').innerHTML = '<div class="empty">Pilih Wilayah Kerja di Asset Register terlebih dahulu.</div>';
      } else {
        renderRbiTable(currentRegionAssets);
        rbiRendered = true;
      }
    }
  }));

  $('regionFilter').addEventListener('change', async e => {
    await selectRegion(e.target.value);
  });
  $('locationFilter').addEventListener('change', filterCurrentRegion);
  $('typeFilter').addEventListener('change', filterCurrentRegion);
  $('assetSearch').addEventListener('input', filterCurrentRegion);
  $('inspectionYear').addEventListener('change', () => {
    if (typeof window.renderInspectionByYear === 'function') window.renderInspectionByYear(inspectionData || [], $('inspectionYear').value);
  });
}

/* RiskWise 1AP matrix categories, matching the supplied 5x5 risk matrix colors. */
const RISK_MATRIX = {
  5: { A: 'Unsatisfactory', B: 'Unsatisfactory', C: 'Unsatisfactory', D: 'Critical', E: 'Critical' },
  4: { A: 'Tolerable', B: 'Tolerable', C: 'Tolerable', D: 'Tolerable', E: 'Critical' },
  3: { A: 'Acceptable', B: 'Acceptable', C: 'Tolerable', D: 'Tolerable', E: 'Critical' },
  2: { A: 'Favourable', B: 'Acceptable', C: 'Tolerable', D: 'Tolerable', E: 'Unsatisfactory' },
  1: { A: 'Favourable', B: 'Favourable', C: 'Tolerable', D: 'Tolerable', E: 'Tolerable' }
};

const RISK_COLORS = {
  Favourable: '#00b050', Acceptable: '#92d050', Tolerable: '#fff200',
  Unsatisfactory: '#ffc000', Critical: '#ff0000', 'No AP Detected': '#d9dde3'
};
const RISK_ORDER = ['Favourable', 'Acceptable', 'Tolerable', 'Unsatisfactory', 'Critical', 'No AP Detected'];
function riskCellCategory(risk) { const match = String(risk || '').trim().toUpperCase().match(/^([1-5])([A-E])$/); if (!match) return 'No AP Detected'; return RISK_MATRIX[Number(match[1])]?.[match[2]] || 'No AP Detected'; }
function categoryCountsFromRiskCounts(riskCounts) { const out = {}; RISK_ORDER.forEach(k => out[k] = 0); Object.entries(riskCounts || {}).forEach(([risk, value]) => { out[riskCellCategory(risk)] += Number(value) || 0; }); return out; }
function renderRiskDashboard(rawRiskCounts) { const riskCounts = {}; Object.entries(rawRiskCounts || {}).forEach(([risk, value]) => { const key = String(risk || '').trim(); const n = Number(value) || 0; if (/^[1-5][A-E]$/i.test(key)) riskCounts[key.toUpperCase()] = n; else riskCounts['Unknown'] = (riskCounts['Unknown'] || 0) + n; }); renderRiskMatrix(riskCounts); const categories = categoryCountsFromRiskCounts(riskCounts); renderRiskSummary(categories); renderRiskDiagram(categories); }
function renderRiskMatrix(riskCounts) { const el = $('riskMatrix'); const rows = [5,4,3,2,1], cols = ['A','B','C','D','E']; el.innerHTML = `<div class="risk-matrix-wrap"><div class="risk-matrix-ylabel">Likelihood</div><div class="risk-matrix-box"><div class="risk-matrix-grid"><div class="risk-corner"></div>${cols.map(c => `<div class="risk-axis risk-axis-x">${c}</div>`).join('')}${rows.map(r => `<div class="risk-axis risk-axis-y">${r}</div>${cols.map(c => { const key = `${r}${c}`, category = RISK_MATRIX[r][c], count = Number(riskCounts[key] || 0); return `<div class="risk-cell" style="background:${RISK_COLORS[category]}" title="${key} — ${category}"><span>${count.toLocaleString('id-ID')}</span><small>${key}</small></div>`; }).join('')}`).join('')}</div><div class="risk-matrix-xlabel">Consequence</div></div></div>`; }
function renderRiskSummary(categories) { const total = RISK_ORDER.reduce((s,k) => s + Number(categories[k] || 0), 0); $('riskSummary').innerHTML = `<div class="risk-summary-table-wrap"><table class="risk-summary-table"><thead><tr><th>Integrity Category</th><th>Jumlah</th><th>%</th></tr></thead><tbody>${RISK_ORDER.map(k => `<tr><td><span class="category-dot" style="background:${RISK_COLORS[k]}"></span>${k}</td><td><b>${Number(categories[k] || 0).toLocaleString('id-ID')}</b></td><td>${total ? ((Number(categories[k] || 0)/total)*100).toFixed(1) : '0.0'}%</td></tr>`).join('')}<tr class="total-row"><td>TOTAL</td><td>${total.toLocaleString('id-ID')}</td><td>100%</td></tr></tbody></table></div>`; }
function renderRiskDiagram(categories) { const total = RISK_ORDER.reduce((s,k) => s + Number(categories[k] || 0), 0); const entries = RISK_ORDER.map(k => ({key:k,value:Number(categories[k]||0)})).filter(x=>x.value>0); let start=0; const segments=entries.map(({key,value})=>{const end=total?start+(value/total)*360:start; const segment=`${RISK_COLORS[key]} ${start}deg ${end}deg`; start=end; return segment;}); const gradient=segments.length?`conic-gradient(${segments.join(',')})`:`conic-gradient(#d9dde3 0 360deg)`; $('riskTotalBadge').textContent=`${total.toLocaleString('id-ID')} asset`; $('riskDiagram').innerHTML=`<div class="risk-diagram"><div class="risk-donut" style="background:${gradient}"><div class="risk-donut-center"><b>${total.toLocaleString('id-ID')}</b><span>Total</span></div></div><div class="risk-legend">${RISK_ORDER.map(k=>`<div class="risk-legend-row"><span class="category-dot" style="background:${RISK_COLORS[k]}"></span><span>${k}</span><b>${Number(categories[k]||0).toLocaleString('id-ID')}</b><small>${total?((Number(categories[k]||0)/total)*100).toFixed(1):'0.0'}%</small></div>`).join('')}</div></div>`; }

function fillRegions() { const select=$('regionFilter'); select.innerHTML='<option value="">Pilih Wilayah Kerja</option>'+(MANIFEST.regions||[]).map(r=>`<option value="${escAttr(r.slug)}">${esc(r.name)} (${Number(r.count).toLocaleString('id-ID')})</option>`).join(''); }
async function selectRegion(slug) { currentRegion=null; currentRegionAssets=[]; rbiRendered=false; const location=$('locationFilter'), type=$('typeFilter'), search=$('assetSearch'); location.disabled=true; type.disabled=true; search.disabled=true; location.innerHTML='<option value="">Loading Location...</option>'; type.innerHTML='<option value="">All Object Type</option>'; if(!slug){$('assetCount').textContent='Pilih Wilayah Kerja';$('assetTable').innerHTML='<div class="empty">Pilih Wilayah Kerja untuk memuat asset.</div>';return;} $('assetTable').innerHTML='<div class="empty">Memuat data wilayah...</div>'; const res=await fetch(`data/regions/${encodeURIComponent(slug)}.json`,{cache:'no-store'}); if(!res.ok) throw new Error(`Region data HTTP ${res.status}`); const data=await res.json(); currentRegion=data.wilayahKerja; currentRegionAssets=Array.isArray(data.assets)?data.assets:[]; const locations=[...new Set(currentRegionAssets.map(x=>x.area).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b))); const types=[...new Set(currentRegionAssets.map(x=>x.objectType).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b))); location.innerHTML='<option value="">All Location</option>'+locations.map(v=>`<option value="${escAttr(v)}">${esc(v)}</option>`).join(''); type.innerHTML='<option value="">All Object Type</option>'+types.map(v=>`<option value="${escAttr(v)}">${esc(v)}</option>`).join(''); location.disabled=false; type.disabled=false; search.disabled=false; search.value=''; $('assetCount').textContent=`${currentRegionAssets.length.toLocaleString('id-ID')} asset — ${currentRegion}`; renderAssetTable(currentRegionAssets,1); if(document.getElementById('rbi').classList.contains('active')){renderRbiTable(currentRegionAssets);rbiRendered=true;} }
function filterCurrentRegion(){ if(!currentRegion)return; const q=$('assetSearch').value.trim().toLowerCase(), location=$('locationFilter').value, type=$('typeFilter').value; const filtered=currentRegionAssets.filter(x=>{const hay=`${x.tag} ${x.name} ${x.objectType} ${x.service} ${x.area} ${x.remarks}`.toLowerCase(); return(!q||hay.includes(q))&&(!location||x.area===location)&&(!type||x.objectType===type);}); renderAssetTable(filtered,1); }

async function loadInspections() {
  if (inspectionData) { if (typeof window.renderInspectionByYear === 'function') window.renderInspectionByYear(inspectionData); return; }
  $('inspectionTable').innerHTML = '<div class="empty">Memuat inspection...</div>';
  const res = await fetch('data/inspections.json', { cache: 'no-store' });
  if (!res.ok) throw new Error(`inspections.json HTTP ${res.status}`);
  inspectionData = await res.json();
  if (typeof window.renderInspectionByYear === 'function') window.renderInspectionByYear(inspectionData);
}

/* Legacy renderer retained for compatibility only. The active inspection UI is inspection_filter.js. */
function inspectionYearValue(item) { const raw=item?.date??item?.inspectionDate??item?.inspection_date??item?.year??''; const match=String(raw).match(/(?:19|20)\d{2}/); return match?match[0]:'Unknown'; }
function formatInspectionDate(value) { if(!value)return '-'; const raw=String(value).trim(); const match=raw.match(/^(\d{4})-(\d{2})-(\d{2})/); if(!match)return raw; const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; const month=Number(match[2]); return month>=1&&month<=12?`${match[3]}/${months[month-1]}/${match[1]}`:raw; }

function renderAssetTable(list,page=1){const table=$('assetTable');const totalPages=Math.max(1,Math.ceil(list.length/PAGE_SIZE));page=Math.min(Math.max(1,page),totalPages);const visible=list.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE);$('assetCount').textContent=`${list.length.toLocaleString('id-ID')} asset — ${currentRegion||''}`;if(!visible.length){table.innerHTML='<div class="empty">Tidak ada asset sesuai filter.</div>';return;}table.innerHTML=`<table class="asset-table"><thead><tr><th>Tag No.</th><th>Deskripsi Peralatan</th><th>Object Type</th><th>Location</th><th>Risk 1AP</th><th>Integrity Status</th><th>Remarks</th></tr></thead><tbody>${visible.map(x=>`<tr><td><b>${esc(x.tag)}</b></td><td>${esc(x.name||'-')}</td><td>${esc(x.objectType||'-')}</td><td>${esc(x.area||'-')}</td><td><span class="risk">${esc(x.risk1AP||'-')}</span></td><td>${esc(integrityDisplay(x.integrityStatus))}</td><td class="asset-remarks-cell">${esc(x.remarks||'-')}</td></tr>`).join('')}</tbody></table>${paginationHtml(page,totalPages)}`;enableAssetColumnResize();table.querySelectorAll('[data-page]').forEach(btn=>btn.addEventListener('click',()=>renderAssetTable(list,Number(btn.dataset.page))));}

function enableAssetColumnResize(){const table=document.querySelector('#assetTable table.asset-table');if(!table||table.dataset.resizable==='1')return;table.dataset.resizable='1';installAssetResizeStyles();const headers=Array.from(table.querySelectorAll('thead th'));const saved=JSON.parse(localStorage.getItem('assetTableColumnWidths')||'{}');const defaults=[145,390,125,220,95,145,480];const minWidths=[100,220,90,150,80,110,240];headers.forEach((th,index)=>{const width=Number(saved[index]||defaults[index]);th.style.width=`${Math.max(minWidths[index],width)}px`;const grip=document.createElement('span');grip.className='column-resize-grip';th.appendChild(grip);let startX=0,startWidth=0;grip.addEventListener('mousedown',e=>{e.preventDefault();startX=e.clientX;startWidth=th.getBoundingClientRect().width;const move=ev=>{const next=Math.max(minWidths[index],startWidth+(ev.clientX-startX));th.style.width=`${next}px`;};const up=()=>{const widths={};headers.forEach((h,i)=>widths[i]=Math.round(h.getBoundingClientRect().width));localStorage.setItem('assetTableColumnWidths',JSON.stringify(widths));document.removeEventListener('mousemove',move);document.removeEventListener('mouseup',up);};document.addEventListener('mousemove',move);document.addEventListener('mouseup',up);});});}
