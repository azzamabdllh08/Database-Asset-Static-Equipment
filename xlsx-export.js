/* RBI Excel report exporter - fixed matrix range and dashboard layout */
(function(){
  const RM={5:{A:'U',B:'U',C:'U',D:'C',E:'C'},4:{A:'T',B:'T',C:'T',D:'T',E:'C'},3:{A:'A',B:'A',C:'T',D:'T',E:'C'},2:{A:'F',B:'A',C:'T',D:'T',E:'U'},1:{A:'F',B:'F',C:'T',D:'T',E:'T'}};
  const CAT={F:'Favourable',A:'Acceptable',T:'Tolerable',U:'Unsatisfactory',C:'Critical',N:'No AP Detected'};
  const COLORS={F:'08AD5A',A:'86C744',T:'FFE000',U:'FFAB00',C:'F20B13',N:'D7DCE1'};
  const MONTH=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const border={top:{style:'thin',color:{rgb:'D9E2EC'}},bottom:{style:'thin',color:{rgb:'D9E2EC'}},left:{style:'thin',color:{rgb:'D9E2EC'}},right:{style:'thin',color:{rgb:'D9E2EC'}}};
  const title={font:{name:'Aptos Display',sz:16,bold:true,color:{rgb:'FFFFFF'}},fill:{fgColor:{rgb:'1269CF'}},alignment:{vertical:'center'}};
  const section={font:{name:'Aptos',sz:12,bold:true,color:{rgb:'17324D'}},fill:{fgColor:{rgb:'EAF3FF'}},alignment:{vertical:'center'},border};
  const header={font:{name:'Aptos',sz:10,bold:true,color:{rgb:'FFFFFF'}},fill:{fgColor:{rgb:'1269CF'}},alignment:{horizontal:'center',vertical:'center',wrapText:true},border};
  const cell={font:{name:'Aptos',sz:10,color:{rgb:'172B3F'}},alignment:{vertical:'center'},border};
  const center={...cell,alignment:{horizontal:'center',vertical:'center'},border};
  const label={font:{name:'Aptos',sz:10,bold:true,color:{rgb:'526A7D'}},fill:{fgColor:{rgb:'F5F8FB'}},border};
  const value={font:{name:'Aptos',sz:10,bold:true,color:{rgb:'172B3F'}},border};
  const riskStyle=g=>({font:{name:'Aptos',sz:11,bold:true,color:{rgb:'111111'}},fill:{fgColor:{rgb:COLORS[g]||COLORS.N}},alignment:{horizontal:'center',vertical:'center',wrapText:true},border});
  const summaryStyle=g=>({font:{name:'Aptos',sz:10,bold:true,color:{rgb:'172B3F'}},fill:{fgColor:{rgb:COLORS[g]||COLORS.N}},border});
  const safe=v=>v==null?'':String(v);
  const date=v=>{const s=safe(v).trim();let m=s.match(/(\d{4})[-\/]?(\d{2})[-\/]?(\d{2})/);if(m)return `${m[3]}/${MONTH[+m[2]-1]}/${m[1]}`;return s||'-'};
  const merge=(ws,r1,c1,r2,c2)=>{ws['!merges']??=[];ws['!merges'].push({s:{r:r1,c:c1},e:{r:r2,c:c2}})};
  const style=(ws,a,s)=>{if(ws[a])ws[a].s=s};
  const riskCode=a=>safe(a.risk1AP||a.risk||a.risk_1ap).toUpperCase().trim();
  const riskCat=code=>{const m=code.match(/^([1-5])([A-E])$/);return m&&RM[+m[1]]?RM[+m[1]][m[2]]:'N'};
  async function assets(){const m=await (await fetch('data/manifest.json',{cache:'no-store'})).json();return (await Promise.all((m.regions||[]).map(async r=>{try{const x=await (await fetch(`data/regions/${encodeURIComponent(r.slug)}.json`,{cache:'no-store'})).json();return x.assets||[]}catch(e){return[]}}))).flat()}
  function selected(all){const rv=document.getElementById('rbiRefRegion')?.value||'',lv=document.getElementById('rbiRefLocation')?.value||'',q=(document.getElementById('rbiRefSearch')?.value||'').toLowerCase().trim();let a=rv?all.filter(x=>(x.wilayahKerja||'')===rv):all.slice();if(lv)a=a.filter(x=>(x.area||'')===lv);if(q)a=a.filter(x=>`${x.tag||''} ${x.name||''}`.toLowerCase().includes(q));return{list:a,region:document.getElementById('rbiRefRegion')?.selectedOptions?.[0]?.text||'All Wilayah Kerja',location:document.getElementById('rbiRefLocation')?.selectedOptions?.[0]?.text||'All Location',search:q}}
  function dashboardSheet(wb,list,f){
    const rows=[['RBI ASSESSMENT REPORT','','','','','','','','','',''],['Assessment Period','24 Months (1AP)','','','','','','','','',''],['Wilayah Kerja',f.region,'','','','','','','','',''],['Location',f.location,'','','','','','','','',''],['Search',f.search||'-','','','','','','','','',''],['Total Asset',list.length,'','','','','','','','',''],['','','','','','','','','','',''],['RISK MATRIX 1AP','','','','','', '', 'RBI RISK SUMMARY','','',''],['Likelihood / Consequence','A','B','C','D','E','','Kategori','Jumlah','Persentase',''],[5,'','','','','','','Favourable',0,0,''],[4,'','','','','','','Acceptable',0,0,''],[3,'','','','','','','Tolerable',0,0,''],[2,'','','','','','','Unsatisfactory',0,0,''],[1,'','','','','','','Critical',0,0,''],['','','','','','','','No AP Detected',0,0,''],['','','','','','','','','',''],['','','','','','','','Inspection Due Planning','','','']];
    const ws=XLSX.utils.aoa_to_sheet(rows);ws['!ref']='A1:K17';
    merge(ws,0,0,0,10);for(let r=1;r<=5;r++)merge(ws,r,1,r,10);merge(ws,7,0,7,5);merge(ws,7,7,7,10);
    style(ws,'A1',title);for(let r=1;r<=5;r++){style(ws,`A${r+1}`,label);style(ws,`B${r+1}`,value)}style(ws,'A8',section);style(ws,'H8',section);
    ['A9','B9','C9','D9','E9','F9','H9','I9','J9'].forEach(a=>style(ws,a,header));
    const counts={};list.forEach(a=>{const c=riskCode(a);counts[c]=(counts[c]||0)+1});const cc={F:0,A:0,T:0,U:0,C:0,N:0};
    [5,4,3,2,1].forEach((r,i)=>{style(ws,`A${10+i}`,header);['A','B','C','D','E'].forEach((col,j)=>{const code=`${r}${col}`,g=RM[r][col],a=XLSX.utils.encode_cell({r:9+i,c:1+j});ws[a]={v:counts[code]||0,t:'n',s:riskStyle(g)};cc[g]+=(counts[code]||0)});});
    const cats=['F','A','T','U','C','N'];cats.forEach((g,i)=>{const rr=10+i;ws[`H${rr}`]={v:CAT[g],t:'s',s:summaryStyle(g)};ws[`I${rr}`]={v:cc[g],t:'n',s:center};ws[`J${rr}`]={v:list.length?cc[g]/list.length:0,t:'n',s:{...center,numFmt:'0.0%'}}});
    ws['H17']={v:'Inspection Due Planning',t:'s',s:section};merge(ws,16,7,16,10);
    ws['!cols']=[{wch:25},{wch:13},{wch:13},{wch:13},{wch:13},{wch:13},{wch:3},{wch:22},{wch:14},{wch:16},{wch:3}];
    ws['!rows']=Array.from({length:17},()=>({hpt:22}));ws['!rows'][0]={hpt:30};ws['!freeze']={xSplit:0,ySplit:7};
    XLSX.utils.book_append_sheet(wb,ws,'RBI Dashboard');
  }
  function summarySheet(wb,list){const cc={F:0,A:0,T:0,U:0,C:0,N:0};list.forEach(a=>cc[riskCat(riskCode(a))]++);const rows=[['RBI RISK SUMMARY','',''],['Kategori','Jumlah','Persentase'],...Object.keys(CAT).map(g=>[CAT[g],cc[g],list.length?cc[g]/list.length:0])];const ws=XLSX.utils.aoa_to_sheet(rows);ws['!ref']='A1:C8';merge(ws,0,0,0,2);style(ws,'A1',title);['A2','B2','C2'].forEach(a=>style(ws,a,header));Object.keys(CAT).forEach((g,i)=>{style(ws,`A${i+3}`,summaryStyle(g));style(ws,`B${i+3}`,center);style(ws,`C${i+3}`,{...center,numFmt:'0.0%'});});ws['!cols']=[{wch:24},{wch:14},{wch:16}];ws['!freeze']={xSplit:0,ySplit:2};XLSX.utils.book_append_sheet(wb,ws,'Risk Summary')}
  function dueSheet(wb,all,f){const key=document.querySelector('.due-card.selected')?.dataset.due||'2026';let d=all.filter(a=>{const m=safe(a.inspectionDueDate).match(/(\d{4})-(\d{2})-(\d{2})/);if(!m)return false;const y=+m[1];if(key==='Overdue')return new Date(`${m[1]}-${m[2]}-${m[3]}`)<new Date('2026-08-12');if(key==='> 2030')return y>2030;return y===+key});if(f.region!=='All Wilayah Kerja')d=d.filter(a=>(a.wilayahKerja||'')===f.region);if(f.location!=='All Location')d=d.filter(a=>(a.area||'')===f.location);const rows=[['INSPECTION DUE PLANNING','','','','','','','',''],['Period',key,'','','','','','',''],[],['No','Tag Number','Equipment Name','Wilayah Kerja','Location','Risk 1AP','Integrity Status','Last Inspection','Inspection Due Date']];d.forEach((a,i)=>rows.push([i+1,safe(a.tag),safe(a.name),safe(a.wilayahKerja),safe(a.area),riskCode(a),safe(a.integrityStatus),date(a.lastInspectionDate),date(a.inspectionDueDate)]));const ws=XLSX.utils.aoa_to_sheet(rows);ws['!ref']=`A1:I${rows.length}`;merge(ws,0,0,0,8);style(ws,'A1',title);style(ws,'A2',label);style(ws,'B2',value);for(let c=0;c<9;c++)style(ws,XLSX.utils.encode_cell({r:3,c}),header);for(let r=4;r<rows.length;r++)for(let c=0;c<9;c++)style(ws,XLSX.utils.encode_cell({r,c}),c===0||c===5?center:cell);ws['!cols']=[{wch:7},{wch:22},{wch:42},{wch:18},{wch:32},{wch:11},{wch:18},{wch:19},{wch:20}];ws['!autofilter']={ref:`A4:I${rows.length}`};ws['!freeze']={xSplit:0,ySplit:4};XLSX.utils.book_append_sheet(wb,ws,'Inspection Due')}
  async function exportExcel(){if(!window.XLSX){alert('Excel exporter belum siap. Refresh halaman.');return}try{const all=await assets(),f=selected(all),wb=XLSX.utils.book_new();dashboardSheet(wb,f.list,f);summarySheet(wb,f.list);dueSheet(wb,all,f);XLSX.writeFile(wb,`RBI_Assessment_${new Date().toISOString().slice(0,10)}_FINAL.xlsx`)}catch(e){console.error(e);alert('Gagal membuat Excel: '+e.message)}}
  window.downloadRbiExcel=exportExcel;
  document.addEventListener('click',e=>{const b=e.target.closest?.('#rbiRefExport');if(!b)return;e.preventDefault();e.stopImmediatePropagation();exportExcel()},true);
})();
