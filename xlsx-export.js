/* Formatted XLSX export for the RBI template. */
(function(){
  const RM={5:{A:'U',B:'U',C:'U',D:'C',E:'C'},4:{A:'T',B:'T',C:'T',D:'T',E:'C'},3:{A:'A',B:'A',C:'T',D:'T',E:'C'},2:{A:'F',B:'A',C:'T',D:'T',E:'U'},1:{A:'F',B:'F',C:'T',D:'T',E:'T'}};
  const CAT={F:'Favourable',A:'Acceptable',T:'Tolerable',U:'Unsatisfactory',C:'Critical',N:'No AP Detected'};
  const safe=v=>v==null?'':v;
  const fd=v=>{const m=String(v||'').match(/(19|20)\d{2}-(\d{2})-(\d{2})/);return m?`${m[3]}/${m[2]}/${m[1]}`:(v||'-')};
  async function getAssets(){
    const m=await (await fetch('data/manifest.json',{cache:'no-store'})).json();
    return (await Promise.all((m.regions||[]).map(async rg=>{try{return (await (await fetch(`data/regions/${encodeURIComponent(rg.slug)}.json`,{cache:'no-store'})).json()).assets||[]}catch(e){return []}}))).flat();
  }
  function filterAssets(all){
    const region=document.getElementById('rbiRefRegion')?.value||'';
    const loc=document.getElementById('rbiRefLocation')?.value||'';
    const q=(document.getElementById('rbiRefSearch')?.value||'').toLowerCase().trim();
    let list=region?all.filter(a=>(a.wilayahKerja||'')===region):all.slice();
    if(loc)list=list.filter(a=>(a.area||'')===loc);
    if(q)list=list.filter(a=>`${a.tag||''} ${a.name||''}`.toLowerCase().includes(q));
    return {list,region:document.getElementById('rbiRefRegion')?.selectedOptions?.[0]?.text||'All Wilayah Kerja',location:document.getElementById('rbiRefLocation')?.selectedOptions?.[0]?.text||'All Location',search:q};
  }
  function riskCategory(r){const m=String(r||'').toUpperCase().match(/^([1-5])([A-E])$/);return m?(RM[+m[1]]?.[m[2]]||'N'):'N'}
  async function exportExcel(){
    if(!window.XLSX){alert('Excel exporter belum siap. Silakan refresh halaman.');return;}
    const all=await getAssets(),f=filterAssets(all),list=f.list,wb=XLSX.utils.book_new();
    const meta=[['RBI ASSESSMENT REPORT'],['Assessment Period','24 Months (1AP)'],['Wilayah Kerja',f.region],['Location',f.location],['Search',f.search||'-'],['Total Asset',list.length],[]];
    const matrix=[['Likelihood / Consequence','A','B','C','D','E']];
    [5,4,3,2,1].forEach(r=>matrix.push([r,...['A','B','C','D','E'].map(c=>list.filter(a=>String(a.risk1AP||a.risk||'').toUpperCase()===r+c).length)]));
    const ws1=XLSX.utils.aoa_to_sheet([...meta,['RISK MATRIX 1AP'],...matrix]);ws1['!cols']=[{wch:30},{wch:24},{wch:18},{wch:18},{wch:18},{wch:18}];XLSX.utils.book_append_sheet(wb,ws1,'RBI Summary');
    const cc={F:0,A:0,T:0,U:0,C:0,N:0};list.forEach(a=>cc[riskCategory(a.risk1AP||a.risk)]++);
    const summary=[['RBI RISK SUMMARY'],[],['Kategori','Jumlah','Persentase'],...Object.keys(CAT).map(k=>[CAT[k],cc[k],list.length?`${(cc[k]/list.length*100).toFixed(1)}%`:'0.0%'])];
    const ws2=XLSX.utils.aoa_to_sheet(summary);ws2['!cols']=[{wch:24},{wch:14},{wch:16}];XLSX.utils.book_append_sheet(wb,ws2,'Risk Summary');
    const dueYear=document.querySelector('.due-card.selected')?.dataset.due||'2026';
    const dueSearch=(document.getElementById('rbiDueSearch')?.value||'').toLowerCase().trim();
    const today=new Date('2026-08-12T00:00:00');
    let due=all.filter(a=>{const m=String(a.inspectionDueDate||'').match(/(\d{4})-(\d{2})-(\d{2})/);if(!m)return false;const d=new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00`);if(dueYear==='Overdue')return d<today;if(dueYear==='> 2030')return +m[1]>2030;return +m[1]===Number(dueYear)});
    if(dueSearch)due=due.filter(a=>`${a.tag||''} ${a.name||''} ${a.wilayahKerja||''} ${a.area||''}`.toLowerCase().includes(dueSearch));
    const rows=[['No','Tag Number','Equipment Name','Wilayah Kerja','Location','Risk 1AP','Integrity Status','Last Inspection','Inspection Due Date']];
    due.forEach((a,i)=>rows.push([i+1,safe(a.tag),safe(a.name),safe(a.wilayahKerja),safe(a.area),safe(a.risk1AP),safe(a.integrityStatus),fd(a.lastInspectionDate),fd(a.inspectionDueDate)]));
    const ws3=XLSX.utils.aoa_to_sheet([['INSPECTION DUE PLANNING'],['Period',dueYear],[],...rows]);ws3['!cols']=[{wch:7},{wch:18},{wch:28},{wch:20},{wch:24},{wch:12},{wch:20},{wch:18},{wch:20}];ws3['!autofilter']={ref:`A4:I${rows.length+3}`};XLSX.utils.book_append_sheet(wb,ws3,'Inspection Due');
    XLSX.writeFile(wb,`RBI_Assessment_${new Date().toISOString().slice(0,10)}.xlsx`);
  }
  window.downloadRbiExcel=exportExcel;
  document.addEventListener('click',function(e){const b=e.target.closest?.('#rbiRefExport');if(!b)return;e.preventDefault();e.stopImmediatePropagation();exportExcel().catch(err=>{console.error(err);alert('Gagal membuat file Excel.');});},true);
})();
