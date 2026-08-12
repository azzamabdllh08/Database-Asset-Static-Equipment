/* Styled XLSX export for the RBI dashboard template. */
(function(){
  const RM={5:{A:'U',B:'U',C:'U',D:'C',E:'C'},4:{A:'T',B:'T',C:'T',D:'T',E:'C'},3:{A:'A',B:'A',C:'T',D:'T',E:'C'},2:{A:'F',B:'A',C:'T',D:'T',E:'U'},1:{A:'F',B:'F',C:'T',D:'T',E:'T'}};
  const CAT={F:'Favourable',A:'Acceptable',T:'Tolerable',U:'Unsatisfactory',C:'Critical',N:'No AP Detected'};
  const CAT_COLOR={F:'08AD5A',A:'86C744',T:'FFE000',U:'FFAB00',C:'F20B13',N:'D7DCE1'};
  const safe=v=>v==null?'':v;
  const fd=v=>{const s=String(v||'').trim();const m=s.match(/^(?:.*?)(\d{4})-(\d{2})-(\d{2})/);if(m)return `${m[3]}/${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][Number(m[2])-1]}/${m[1]}`;return s||'-'};
  const border={top:{style:'thin',color:{rgb:'D9E2EC'}},bottom:{style:'thin',color:{rgb:'D9E2EC'}},left:{style:'thin',color:{rgb:'D9E2EC'}},right:{style:'thin',color:{rgb:'D9E2EC'}}};
  const titleStyle={font:{name:'Aptos Display',sz:16,bold:true,color:{rgb:'FFFFFF'}},fill:{fgColor:{rgb:'1269CF'}},alignment:{vertical:'center'}};
  const sectionStyle={font:{name:'Aptos',sz:12,bold:true,color:{rgb:'17324D'}},fill:{fgColor:{rgb:'EAF3FF'}},alignment:{vertical:'center'}};
  const headStyle={font:{name:'Aptos',sz:10,bold:true,color:{rgb:'FFFFFF'}},fill:{fgColor:{rgb:'1269CF'}},alignment:{horizontal:'center',vertical:'center',wrapText:true},border};
  const cellStyle={font:{name:'Aptos',sz:10,color:{rgb:'172B3F'}},alignment:{vertical:'center'},border};
  const centerStyle={...cellStyle,alignment:{horizontal:'center',vertical:'center'},border};
  const metaLabel={font:{name:'Aptos',sz:10,bold:true,color:{rgb:'526A7D'}},fill:{fgColor:{rgb:'F5F8FB'}},border};
  const metaValue={font:{name:'Aptos',sz:10,bold:true,color:{rgb:'172B3F'}},border};
  const riskFill=g=>({font:{name:'Aptos',sz:11,bold:true,color:{rgb:'111111'}},fill:{fgColor:{rgb:CAT_COLOR[g]}},alignment:{horizontal:'center',vertical:'center'},border});
  const summaryLabel=g=>({font:{name:'Aptos',sz:10,bold:true,color:{rgb:'172B3F'}},fill:{fgColor:{rgb:CAT_COLOR[g]}},border});

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
  function setStyle(ws,cell,style){if(ws[cell])ws[cell].s=style}
  function merge(ws,r1,c1,r2,c2){ws['!merges']??=[];ws['!merges'].push({s:{r:r1,c:c1},e:{r:r2,c:c2}})}
  function matrixSheet(ws,list){
    const raw={};list.forEach(a=>{const r=String(a.risk1AP||a.risk||'').toUpperCase();raw[r]=(raw[r]||0)+1});
    const start=7;
    ws['A7']={v:'RISK MATRIX 1AP',t:'s',s:sectionStyle};merge(ws,6,0,6,5);
    const hdr=['Likelihood / Consequence','A','B','C','D','E'];
    hdr.forEach((v,c)=>{const addr=XLSX.utils.encode_cell({r:start,c});ws[addr]={v,t:'s',s:headStyle}});
    [5,4,3,2,1].forEach((r,i)=>{
      const rr=start+1+i;const a=XLSX.utils.encode_cell({r:rr,c:0});ws[a]={v:r,t:'n',s:headStyle};
      ['A','B','C','D','E'].forEach((col,j)=>{const key=r+col,g=RM[r][col],addr=XLSX.utils.encode_cell({r:rr,c:j+1});ws[addr]={v:raw[key]||0,t:'n',s:riskFill(g)}});
    });
    ws['A14']={v:'Likelihood',t:'s',s:{...sectionStyle,alignment:{horizontal:'center',vertical:'center'}}};
    ws['A15']={v:'Consequence →',t:'s',s:{...sectionStyle,alignment:{horizontal:'center'}}};
    ws['!cols']=[{wch:24},{wch:13},{wch:13},{wch:13},{wch:13},{wch:13}];
  }
  async function exportExcel(){
    if(!window.XLSX){alert('Excel exporter belum siap. Silakan refresh halaman.');return;}
    const all=await getAssets(),f=filterAssets(all),list=f.list,wb=XLSX.utils.book_new();
    const ws=XLSX.utils.aoa_to_sheet([['RBI ASSESSMENT REPORT','','','','',''],['Assessment Period','24 Months (1AP)','','','',''],['Wilayah Kerja',f.region,'','','',''],['Location',f.location,'','','',''],['Search',f.search||'-','','','',''],['Total Asset',list.length,'','','',''],['','','','','','']]);
    merge(ws,0,0,0,5);merge(ws,1,1,1,5);merge(ws,2,1,2,5);merge(ws,3,1,3,5);merge(ws,4,1,4,5);merge(ws,5,1,5,5);
    setStyle(ws,'A1',titleStyle);for(let r=1;r<=5;r++){setStyle(ws,`A${r+1}`,metaLabel);setStyle(ws,`B${r+1}`,metaValue)}
    matrixSheet(ws,list);
    const cc={F:0,A:0,T:0,U:0,C:0,N:0};list.forEach(a=>cc[riskCategory(a.risk1AP||a.risk)]++);
    ws['H7']={v:'RBI RISK SUMMARY',t:'s',s:sectionStyle};merge(ws,6,7,6,10);
    ['Kategori','Jumlah','Persentase'].forEach((v,c)=>{const addr=XLSX.utils.encode_cell({r:7,c:7+c});ws[addr]={v,t:'s',s:headStyle}});
    Object.keys(CAT).forEach((k,i)=>{const r=8+i;ws[`H${r+1}`]={v:CAT[k],t:'s',s:summaryLabel(k)};ws[`I${r+1}`]={v:cc[k],t:'n',s:centerStyle};ws[`J${r+1}`]={v:list.length?cc[k]/list.length:0,t:'n',s:{...centerStyle,numFmt:'0.0%'}}});
    ws['H17']={v:'Inspection Due Planning',t:'s',s:sectionStyle};merge(ws,16,7,16,10);
    ws['H18']={v:'Perencanaan inspeksi berdasarkan tanggal due',t:'s',style:cellStyle};merge(ws,17,7,17,10);
    ws['!cols']=[{wch:24},{wch:13},{wch:13},{wch:13},{wch:13},{wch:13},{wch:3},{wch:22},{wch:14},{wch:16},{wch:4}];
    ws['!rows']=[{hpt:28},{hpt:20},{hpt:20},{hpt:20},{hpt:20},{hpt:20},{hpt:8},{hpt:20},{hpt:20},{hpt:20},{hpt:20},{hpt:20},{hpt:20},{hpt:20},{hpt:20},{hpt:8},{hpt:20},{hpt:18}];
    ws['!freeze']={xSplit:0,ySplit:7};
    XLSX.utils.book_append_sheet(wb,ws,'RBI Dashboard');

    const rs=[['RBI RISK SUMMARY','',''],['Kategori','Jumlah','Persentase'],...Object.keys(CAT).map(k=>[CAT[k],cc[k],list.length?cc[k]/list.length:0])];
    const ws2=XLSX.utils.aoa_to_sheet(rs);ws2['!merges']=[{s:{r:0,c:0},e:{r:0,c:2}}];setStyle(ws2,'A1',titleStyle);['A2','B2','C2'].forEach(a=>setStyle(ws2,a,headStyle));
    Object.keys(CAT).forEach((k,i)=>{const r=i+3;setStyle(ws2,`A${r}`,summaryLabel(k));setStyle(ws2,`B${r}`,centerStyle);setStyle(ws2,`C${r}`,{...centerStyle,numFmt:'0.0%'});});
    ws2['!cols']=[{wch:24},{wch:14},{wch:16}];ws2['!freeze']={xSplit:0,ySplit:2};XLSX.utils.book_append_sheet(wb,ws2,'Risk Summary');

    const dueKey=document.querySelector('.due-card.selected')?.dataset.due||'2026';
    const dueSearch=(document.getElementById('rbiDueSearch')?.value||'').toLowerCase().trim();
    const today=new Date('2026-08-12T00:00:00');
    let due=all.filter(a=>{const m=String(a.inspectionDueDate||'').match(/(\d{4})-(\d{2})-(\d{2})/);if(!m)return false;const d=new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00`);if(dueKey==='Overdue')return d<today;if(dueKey==='> 2030')return +m[1]>2030;return +m[1]===Number(dueKey)});
    if(f.region&&f.region!=='All Wilayah Kerja')due=due.filter(a=>(a.wilayahKerja||'')===f.region);
    if(f.location&&f.location!=='All Location')due=due.filter(a=>(a.area||'')===f.location);
    if(dueSearch)due=due.filter(a=>`${a.tag||''} ${a.name||''} ${a.wilayahKerja||''} ${a.area||''}`.toLowerCase().includes(dueSearch));
    const rows=[['INSPECTION DUE PLANNING','','','','','','','',''],['Period',dueKey,'','','','','','',''],[],['No','Tag Number','Equipment Name','Wilayah Kerja','Location','Risk 1AP','Integrity Status','Last Inspection','Inspection Due Date']];
    due.forEach((a,i)=>rows.push([i+1,safe(a.tag),safe(a.name),safe(a.wilayahKerja),safe(a.area),safe(a.risk1AP),safe(a.integrityStatus),fd(a.lastInspectionDate),fd(a.inspectionDueDate)]));
    const ws3=XLSX.utils.aoa_to_sheet(rows);ws3['!merges']=[{s:{r:0,c:0},e:{r:0,c:8}}];setStyle(ws3,'A1',titleStyle);setStyle(ws3,'A2',metaLabel);setStyle(ws3,'B2',metaValue);
    for(let c=0;c<9;c++)setStyle(ws3,XLSX.utils.encode_cell({r:3,c}),headStyle);
    for(let r=4;r<rows.length;r++){for(let c=0;c<9;c++)setStyle(ws3,XLSX.utils.encode_cell({r,c}),c===0||c===5?centerStyle:cellStyle);}
    ws3['!cols']=[{wch:7},{wch:22},{wch:42},{wch:18},{wch:32},{wch:11},{wch:18},{wch:19},{wch:20}];ws3['!autofilter']={ref:`A4:I${rows.length}`};ws3['!freeze']={xSplit:0,ySplit:4};
    XLSX.utils.book_append_sheet(wb,ws3,'Inspection Due');
    XLSX.writeFile(wb,`RBI_Assessment_${new Date().toISOString().slice(0,10)}.xlsx`);
  }
  window.downloadRbiExcel=exportExcel;
  document.addEventListener('click',function(e){const b=e.target.closest?.('#rbiRefExport');if(!b)return;e.preventDefault();e.stopImmediatePropagation();exportExcel().catch(err=>{console.error(err);alert('Gagal membuat file Excel.');});},true);
})();
