(() => {
  const state = { all: [], filtered: [], region: '', location: '', dueYear: '' };
  const escRbi = v => String(v ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const dateYear = v => { const m = String(v ?? '').match(/(19|20)\d{2}/); return m ? m[0] : ''; };
  const formatDate = v => { if (!v) return '-'; const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/); if (!m) return String(v); const mo=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; return `${m[3]}/${mo[Number(m[2])-1]}/${m[1]}`; };
  const riskCounts = list => { const c={}; list.forEach(x=>{const r=String(x.risk1AP||x.risk||'').trim().toUpperCase(); if(/^[1-5][A-E]$/.test(r)) c[r]=(c[r]||0)+1; else c.Unknown=(c.Unknown||0)+1;}); return c; };

  function injectStyles(){
    if(document.getElementById('rbiStandaloneStyles')) return;
    const s=document.createElement('style'); s.id='rbiStandaloneStyles';
    s.textContent=`
      #rbi .rbi-filterbar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:12px;background:#f7f9fc;border:1px solid #e2e8f0;border-radius:10px;margin:0 0 18px}
      #rbi .rbi-filterbar select,#rbi .rbi-filterbar input{padding:10px 12px;border:1px solid #d7e0e8;border-radius:7px;background:#fff;font:inherit;color:#17324d;min-width:190px}
      #rbi .rbi-filterbar input{flex:1;min-width:240px}
      #rbi .rbi-filterbar select:disabled{background:#f1f5f9;color:#94a3b8}
      #rbi .rbi-risk-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:20px;margin-bottom:20px}
      #rbi .rbi-risk-panel{background:#fff;border:1px solid #e5eaf0;border-radius:12px;padding:18px;box-shadow:0 3px 14px #26374610;min-width:0}
      #rbi .rbi-risk-panel h3{margin:0 0 14px}
      #rbi .rbi-matrix-wrap{display:flex;justify-content:center;align-items:center;gap:10px;margin:8px 0}
      #rbi .rbi-matrix-box{width:min(520px,100%)}
      #rbi .rbi-matrix-grid{display:grid;grid-template-columns:32px repeat(5,1fr);grid-template-rows:26px repeat(5,58px);border:1px solid #c7ced6;overflow:hidden}
      #rbi .rbi-axis,#rbi .rbi-corner{background:#f7f9fb;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:11px;border-right:1px solid #c7ced6;border-bottom:1px solid #c7ced6}
      #rbi .rbi-cell{display:flex;flex-direction:column;align-items:center;justify-content:center;border-right:1px solid rgba(0,0,0,.22);border-bottom:1px solid rgba(0,0,0,.22)}
      #rbi .rbi-cell span{font-size:16px;font-weight:800;line-height:1.05}.rbi-cell small{font-size:8px;margin-top:3px;font-weight:700;opacity:.75}
      #rbi .rbi-axis-y{border-right:1px solid #c7ced6}.rbi-xlabel{text-align:center;font-size:10px;font-weight:700;color:#657381;margin-top:5px}.rbi-ylabel{writing-mode:vertical-rl;transform:rotate(180deg);font-size:12px;font-weight:700;color:#657381}
      #rbi .rbi-diagram{display:grid;grid-template-columns:190px 1fr;gap:25px;align-items:center;min-height:285px}.rbi-donut{width:190px;height:190px;border-radius:50%;display:grid;place-items:center;position:relative;margin:auto;box-shadow:0 4px 18px rgba(23,33,43,.12)}.rbi-donut:after{content:"";position:absolute;inset:40px;background:#fff;border-radius:50%}.rbi-donut-center{position:relative;z-index:1;text-align:center;display:flex;flex-direction:column}.rbi-donut-center b{font-size:23px}.rbi-donut-center span{font-size:11px;color:#657381}.rbi-legend-row{display:grid;grid-template-columns:16px 1fr 62px 48px;gap:6px;align-items:center;padding:6px 0;border-bottom:1px solid #edf0f3;font-size:11px}.rbi-dot{width:9px;height:9px;border-radius:2px;border:1px solid rgba(0,0,0,.15)}.rbi-legend-row b{text-align:right}.rbi-legend-row small{text-align:right;color:#657381}
      #rbi .rbi-due{margin-top:20px}.rbi-due-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(135px,1fr));gap:10px;margin-bottom:14px}.rbi-due-card{border:1px solid #dce5ee;background:#f8fafc;border-radius:10px;padding:13px;text-align:left;cursor:pointer}.rbi-due-card.selected,.rbi-due-card:hover{border-color:#1769d5;background:#eef6ff}.rbi-due-card b{display:block;font-size:22px;color:#1769d5}.rbi-due-card span{font-size:12px;font-weight:700;color:#354554}.rbi-due-card small{display:block;color:#71808d;margin-top:3px}
      @media(max-width:900px){#rbi .rbi-risk-layout{grid-template-columns:1fr}#rbi .rbi-diagram{grid-template-columns:1fr}.rbi-donut{width:175px;height:175px}}
    `; document.head.appendChild(s);
  }

  function controls(){
    const host=document.querySelector('#rbi .panel'); if(!host || document.getElementById('rbiStandaloneFilters')) return;
    const bar=document.createElement('div'); bar.id='rbiStandaloneFilters'; bar.className='rbi-filterbar';
    bar.innerHTML=`<select id="rbiRegion"><option value="">All Wilayah Kerja</option>${(MANIFEST?.regions||[]).map(r=>`<option value="${escRbi(r.slug)}">${escRbi(r.name)}</option>`).join('')}</select><select id="rbiLocation" disabled><option value="">All Location</option></select><input id="rbiSearch" placeholder="Search Tag No / Risk 1AP"><span id="rbiFilterCount" class="badge">0 asset</span>`;
    const notice=host.querySelector('.notice'); if(notice) notice.after(bar); else host.querySelector('.section-head')?.after(bar);
    document.getElementById('rbiRegion').addEventListener('change',loadRegion); document.getElementById('rbiLocation').addEventListener('change',apply); document.getElementById('rbiSearch').addEventListener('input',apply);
  }

  async function loadRegion(){
    const slug=document.getElementById('rbiRegion').value, loc=document.getElementById('rbiLocation'); state.region=slug; state.location=''; loc.disabled=true; loc.innerHTML='<option value="">Loading Location...</option>';
    if(!slug){state.all=[]; loc.innerHTML='<option value="">All Location</option>'; render(); return;}
    const res=await fetch(`data/regions/${encodeURIComponent(slug)}.json?rbifilter=1`,{cache:'no-store'}); if(!res.ok)return;
    const data=await res.json(); state.all=Array.isArray(data.assets)?data.assets:[];
    const locations=[...new Set(state.all.map(x=>x.area).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b)));
    loc.innerHTML='<option value="">All Location</option>'+locations.map(v=>`<option value="${escRbi(v)}">${escRbi(v)}</option>`).join(''); loc.disabled=false; apply();
  }

  function baseFiltered(){ const loc=document.getElementById('rbiLocation')?.value||'', q=(document.getElementById('rbiSearch')?.value||'').trim().toLowerCase(); return state.all.filter(x=>(!loc||String(x.area||'')===loc)&&(!q||`${x.tag||''} ${x.risk1AP||''} ${x.name||''} ${x.area||''}`.toLowerCase().includes(q))); }
  function apply(){state.location=document.getElementById('rbiLocation')?.value||'';state.filtered=baseFiltered();render();}

  function renderMatrix(list){ const counts=riskCounts(list), rows=[5,4,3,2,1], cols=['A','B','C','D','E']; const matrix=document.getElementById('rbiMatrixStandalone'); if(!matrix)return; matrix.innerHTML=`<div class="rbi-matrix-wrap"><div class="rbi-ylabel">Likelihood</div><div class="rbi-matrix-box"><div class="rbi-matrix-grid"><div class="rbi-corner"></div>${cols.map(c=>`<div class="rbi-axis">${c}</div>`).join('')}${rows.map(r=>`<div class="rbi-axis">${r}</div>${cols.map(c=>{const k=`${r}${c}`,cat=RISK_MATRIX[r][c];return `<div class="rbi-cell" style="background:${RISK_COLORS[cat]}"><span>${Number(counts[k]||0).toLocaleString('id-ID')}</span><small>${k}</small></div>`}).join('')}`).join('')}</div><div class="rbi-xlabel">Consequence</div></div></div>`; }
  function renderDiagram(list){ const cats=categoryCountsFromRiskCounts(riskCounts(list)), total=list.length, entries=RISK_ORDER.map(k=>({k,v:Number(cats[k]||0)})).filter(x=>x.v>0); let start=0; const seg=entries.map(x=>{const end=start+(x.v/Math.max(total,1))*360,s=`${RISK_COLORS[x.k]} ${start}deg ${end}deg`;start=end;return s}); const el=document.getElementById('rbiDiagramStandalone'); if(!el)return; const grad=seg.length?`conic-gradient(${seg.join(',')})`:'conic-gradient(#d9dde3 0 360deg)'; el.innerHTML=`<div class="rbi-diagram"><div class="rbi-donut" style="background:${grad}"><div class="rbi-donut-center"><b>${total.toLocaleString('id-ID')}</b><span>Total</span></div></div><div><b style="display:block;margin-bottom:8px">RBI Risk Summary</b>${RISK_ORDER.map(k=>`<div class="rbi-legend-row"><span class="rbi-dot" style="background:${RISK_COLORS[k]}"></span><span>${k}</span><b>${Number(cats[k]||0).toLocaleString('id-ID')}</b><small>${total?((Number(cats[k]||0)/total)*100).toFixed(1):'0.0'}%</small></div>`).join('')}</div></div>`; }

  function duePlanning(){
    const years={}; state.filtered.forEach(x=>{const y=dateYear(x.inspectionDueDate||x.dueDate||x.inspection_due_date);if(y)years[y]=(years[y]||0)+1}); const host=document.getElementById('rbiDuePlanning'); if(!host)return; const keys=Object.keys(years).sort(); host.innerHTML=`<h3>Inspection Due Planning</h3><div class="rbi-due-cards">${keys.map(y=>`<button class="rbi-due-card ${state.dueYear===y?'selected':''}" data-due="${y}"><b>${y}</b><span>${years[y].toLocaleString('id-ID')} asset</span><small>Inspection Due</small></button>`).join('')||'<div class="empty">Tidak ada Inspection Due Date.</div>'}</div>`; host.querySelectorAll('[data-due]').forEach(b=>b.addEventListener('click',()=>{state.dueYear=state.dueYear===b.dataset.due?'':b.dataset.due;renderDueTable()})); }
  function renderDueTable(){const list=state.dueYear?state.filtered.filter(x=>dateYear(x.inspectionDueDate||x.dueDate||x.inspection_due_date)===state.dueYear):[];const host=document.getElementById('rbiDueTable');if(!host)return;host.innerHTML=state.dueYear?`<div class="report-heading"><h3>Inspection Due ${state.dueYear}</h3><span class="badge">${list.length.toLocaleString('id-ID')} asset</span></div><table><thead><tr><th>Tag No.</th><th>Wilayah Kerja</th><th>Location</th><th>Risk 1AP</th><th>Integrity Status</th><th>Inspection Due Date</th></tr></thead><tbody>${list.map(x=>`<tr><td><b>${escRbi(x.tag)}</b></td><td>${escRbi(x.wilayahKerja||x.region||currentRegion||'-')}</td><td>${escRbi(x.area||'-')}</td><td><span class="risk">${escRbi(x.risk1AP||'-')}</span></td><td>${escRbi(x.integrityStatus||'-')}</td><td>${escRbi(formatDate(x.inspectionDueDate||x.dueDate||x.inspection_due_date))}</td></tr>`).join('')}</tbody></table>`:'<div class="empty">Pilih tahun Inspection Due.</div>'; }
  function render(){const list=state.filtered=baseFiltered();document.getElementById('rbiFilterCount').textContent=`${list.length.toLocaleString('id-ID')} asset`;renderMatrix(list);renderDiagram(list);duePlanning();renderDueTable();}
  function init(){injectStyles();controls(); if(!document.getElementById('rbiStandalone')){const root=document.getElementById('rbi'); const old=root.querySelector('#rbiTable'); if(old)old.style.display='none'; const wrap=document.createElement('div');wrap.id='rbiStandalone';wrap.innerHTML=`<div class="rbi-risk-layout"><div class="rbi-risk-panel"><div class="section-head"><h3>RBI Risk Matrix 1AP</h3><span class="badge" id="rbiMatrixBadge">0 asset</span></div><div id="rbiMatrixStandalone"></div></div><div class="rbi-risk-panel"><div class="section-head"><h3>Diagram Risiko 1AP</h3><span class="badge" id="rbiDiagramBadge">0 asset</span></div><div id="rbiDiagramStandalone"></div></div></div><div class="panel rbi-due"><div id="rbiDuePlanning"></div><div id="rbiDueTable"></div></div><div class="panel"><div class="report-heading"><h3>RBI Assessment</h3><span id="rbiAssetBadge" class="badge">0 asset</span></div><div id="rbiAssessmentTable"></div></div>`; root.querySelector('.panel').after(wrap); }
    const nav=document.querySelector('.nav button[data-page="rbi"]'); if(nav&&!nav.dataset.rbiInit){nav.dataset.rbiInit='1';nav.addEventListener('click',()=>{if(!state.region&&!state.all.length){document.getElementById('rbiFilterCount').textContent='0 asset — pilih Wilayah Kerja';} });}
  }
  window.addEventListener('DOMContentLoaded',init); setTimeout(init,500);
})();
