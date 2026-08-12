/* Excel export for RBI module. Requires SheetJS (XLSX) loaded before this file. */
(function(){
  function fd(v){const m=String(v||'').match(/(19|20)\d{2}-\d{2}-\d{2}/);if(!m)return v||'-';const d=new Date(m[0]+'T00:00:00');return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;}
  function safe(v){return v==null?'':v}
  function downloadRbiExcel(){
    if(!window.XLSX){alert('Excel exporter belum siap. Silakan refresh halaman.');return;}
    const list=Array.isArray(window.rbiList)?window.rbiList:[];
    const region=document.getElementById('rbiRegion')?.selectedOptions?.[0]?.text||'All Wilayah Kerja';
    const location=document.getElementById('rbiLocation')?.selectedOptions?.[0]?.text||'All Location';
    const search=document.getElementById('rbiSearch')?.value||'';
    const wb=XLSX.utils.book_new();
    const meta=[['RBI ASSESSMENT REPORT'],['Assessment Period','24 Months (1AP)'],['Wilayah Kerja',region],['Location',location],['Search',search||'-'],['Total Asset',list.length],[]];
    const matrixRows=[['Likelihood / Consequence','A','B','C','D','E']];
    [5,4,3,2,1].forEach(r=>matrixRows.push([r,...['A','B','C','D','E'].map(c=>{const k=r+c;return list.filter(a=>String(a.risk1AP||a.risk||'').toUpperCase()===k).length;})]));
    meta.push(['RISK MATRIX 1AP'],...matrixRows);
    const wsMatrix=XLSX.utils.aoa_to_sheet(meta);wsMatrix['!cols']=[{wch:30},{wch:24},{wch:18},{wch:18},{wch:18},{wch:18}];XLSX.utils.book_append_sheet(wb,wsMatrix,'RBI Summary');
    const categories={F:'Favourable',A:'Acceptable',T:'Tolerable',U:'Unsatisfactory',C:'Critical',N:'No AP Detected'};
    const catRows=[['Kategori','Jumlah','Persentase']],catMap={F:0,A:0,T:0,U:0,C:0,N:0};
    const RM={5:{A:'U',B:'U',C:'U',D:'C',E:'C'},4:{A:'T',B:'T',C:'T',D:'T',E:'C'},3:{A:'A',B:'A',C:'T',D:'T',E:'C'},2:{A:'F',B:'A',C:'T',D:'T',E:'U'},1:{A:'F',B:'F',C:'T',D:'T',E:'T'}};
    list.forEach(a=>{const m=String(a.risk1AP||a.risk||'').toUpperCase().match(/^([1-5])([A-E])$/);const cat=m?(RM[+m[1]]?.[m[2]]||'N'):'N';catMap[cat]++});
    Object.keys(categories).forEach(k=>catRows.push([categories[k],catMap[k],list.length?`${(catMap[k]/list.length*100).toFixed(1)}%`:'0.0%']));
    const wsSummary=XLSX.utils.aoa_to_sheet([['RBI RISK SUMMARY'],[],...catRows]);wsSummary['!cols']=[{wch:24},{wch:14},{wch:16}];XLSX.utils.book_append_sheet(wb,wsSummary,'Risk Summary');
    const dueRows=[['No','Tag Number','Equipment Name','Wilayah Kerja','Location','Risk 1AP','Integrity Status','Last Inspection','Inspection Due Date']];
    list.forEach((a,i)=>dueRows.push([i+1,safe(a.tag),safe(a.name),safe(a.wilayahKerja),safe(a.area),safe(a.risk1AP),safe(a.integrityStatus),fd(a.lastInspectionDate),fd(a.inspectionDueDate)]));
    const wsDue=XLSX.utils.aoa_to_sheet([['RBI INSPECTION DUE PLANNING'],[],...dueRows]);wsDue['!cols']=[{wch:7},{wch:18},{wch:28},{wch:20},{wch:24},{wch:12},{wch:20},{wch:18},{wch:20}];wsDue['!autofilter']={ref:`A3:I${dueRows.length+2}`};XLSX.utils.book_append_sheet(wb,wsDue,'Inspection Due');
    const wbout=XLSX.write(wb,{bookType:'xlsx',type:'array'}),blob=new Blob([wbout],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`RBI_Assessment_${new Date().toISOString().slice(0,10)}.xlsx`;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
  }
  window.downloadRbiExcel=downloadRbiExcel;
  document.addEventListener('DOMContentLoaded',function(){const b=document.getElementById('rbiExport');if(b){b.textContent='⇩  Export Excel';b.addEventListener('click',function(e){e.preventDefault();e.stopImmediatePropagation();downloadRbiExcel();},true);}});
})();
