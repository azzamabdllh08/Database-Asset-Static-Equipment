(() => {
  function applyLayout(){
    const s=document.getElementById('rbi');
    if(!s || document.getElementById('rbiLayoutPatch')) return;
    const style=document.createElement('style');style.id='rbiLayoutPatch';style.textContent=`
      #rbiDirectUi{padding-top:2px}
      #rbiDirectUi .rbi-direct-section:first-of-type{border:0;padding:0;margin:0;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:18px;position:relative}
      #rbiDirectUi .rbi-direct-section:first-of-type>.section-head{grid-column:1/-1;margin:0;padding:0}
      #rbiDirectUi .rbi-direct-section:first-of-type>#rbiDirectMatrix{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:18px;min-width:0}
      #rbiDirectUi .rbi-direct-section:first-of-type>#rbiDirectSummary{display:none}
      #rbiDirectUi .rbi-direct-section:first-of-type>#rbiDirectDiagram{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:18px;min-width:0}
      #rbiDirectUi .risk-matrix-wrap{margin:0 auto!important}
      #rbiDirectUi .risk-matrix-box{width:min(520px,100%)!important}
      #rbiDirectUi .risk-matrix-grid{grid-template-rows:26px repeat(5,55px)!important}
      #rbiDirectUi .risk-diagram{min-height:300px!important}
      #rbiDirectUi .rbi-direct-section:nth-of-type(2){margin-top:18px;padding:18px;border:1px solid #e2e8f0;border-radius:12px;background:#fff}
      #rbiDirectUi .rbi-direct-section:nth-of-type(2) .section-head{margin-bottom:12px}
      #rbiDirectUi .rbi-due-cards{display:grid!important;grid-template-columns:repeat(auto-fill,minmax(125px,1fr));gap:10px}
      #rbiDirectUi .rbi-due-card{width:auto;min-width:0;box-sizing:border-box}
      @media(max-width:900px){#rbiDirectUi .rbi-direct-section:first-of-type{grid-template-columns:1fr}}
    `;document.head.appendChild(style);
    const old=s.querySelector('.notice');if(old)old.style.marginBottom='0';
  }
  document.addEventListener('click',e=>{if(e.target.closest('.nav button[data-page="rbi"]'))setTimeout(applyLayout,50)},true);
  window.addEventListener('DOMContentLoaded',()=>{setTimeout(applyLayout,500);setTimeout(applyLayout,1500)});
})();