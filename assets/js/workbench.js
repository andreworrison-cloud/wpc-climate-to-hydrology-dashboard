/* Observed ocean context and inactive science shell. No model inference here. */
(() => {
  const $ = id => document.getElementById(id);
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let ocean, provider='sport', product='sst', region='global', lead='D1_7', selectedRegion=null;
  const title = p => p==='sst'?'Sea surface temperature':'SST anomaly';
  const utc = value => { const d=new Date(value); return value && Number.isFinite(d.getTime())?d.toISOString().replace('T',' ').slice(0,16)+' UTC':'not supplied'; };
  let zoom=1;
  const viewport=$('oceanViewport'), stage=$('oceanStage'), mapImage=$('oceanImage');
  function fitScale(){return Math.min(viewport.clientWidth/mapImage.naturalWidth,viewport.clientHeight/mapImage.naturalHeight);}
  function setZoom(next,focus){
    if(!mapImage.naturalWidth||mapImage.hidden)return;
    const oldW=stage.scrollWidth,oldH=stage.scrollHeight;
    focus=focus||[(viewport.scrollLeft+viewport.clientWidth/2)/oldW,(viewport.scrollTop+viewport.clientHeight/2)/oldH];
    zoom=Math.max(1,Math.min(8,next));
    const scale=fitScale()*zoom,w=mapImage.naturalWidth*scale,h=mapImage.naturalHeight*scale;
    const sw=Math.max(w,viewport.clientWidth),sh=Math.max(h,viewport.clientHeight);
    stage.style.width=sw+'px';stage.style.height=sh+'px';
    Object.assign(mapImage.style,{width:w+'px',height:h+'px',left:(sw-w)/2+'px',top:(sh-h)/2+'px'});
    viewport.scrollLeft=focus[0]*sw-viewport.clientWidth/2;viewport.scrollTop=focus[1]*sh-viewport.clientHeight/2;
    $('oceanZoomLevel').textContent=Math.round(zoom*100)+'%';
    $('oceanZoomOut').disabled=zoom<=1;$('oceanZoomIn').disabled=zoom>=8;
  }
  $('oceanZoomIn').onclick=()=>setZoom(zoom*1.5);
  $('oceanZoomOut').onclick=()=>setZoom(zoom/1.5);
  $('oceanZoomFit').onclick=()=>setZoom(1,[.5,.5]);
  $('oceanZoomNative').onclick=()=>setZoom(1/fitScale());
  let drag=null;
  viewport.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse'||e.button!==0)return;drag=[e.clientX,e.clientY,viewport.scrollLeft,viewport.scrollTop];viewport.setPointerCapture(e.pointerId);viewport.classList.add('dragging');});
  viewport.addEventListener('pointermove',e=>{if(drag){viewport.scrollLeft=drag[2]+drag[0]-e.clientX;viewport.scrollTop=drag[3]+drag[1]-e.clientY;}});
  const endDrag=()=>{drag=null;viewport.classList.remove('dragging');};
  viewport.addEventListener('pointerup',endDrag);viewport.addEventListener('pointercancel',endDrag);
  viewport.addEventListener('keydown',e=>{const offsets={ArrowLeft:[-80,0],ArrowRight:[80,0],ArrowUp:[0,-80],ArrowDown:[0,80]};if(offsets[e.key]){e.preventDefault();viewport.scrollBy(...offsets[e.key]);}});
  new ResizeObserver(()=>setZoom(zoom)).observe(viewport);
  function renderOcean(){
    const rows=ocean?.products||[];
    document.querySelectorAll('[data-ocean-region]').forEach(b=>{const available=rows.some(r=>(r.provider||'noaa')===provider&&r.region===b.dataset.oceanRegion);b.hidden=!available;b.textContent=({global:'Global',pacific:'Pacific',atlantic:'Atlantic'})[b.dataset.oceanRegion];});
    if(!rows.some(r=>(r.provider||'noaa')===provider&&r.region===region))region='global';
    document.querySelectorAll('[data-ocean-region]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.oceanRegion===region)));
    const row=rows.find(r=>(r.provider||'noaa')===provider&&r.product===product && r.region===region);
    const img=$('oceanImage'); img.hidden=true; img.removeAttribute('src');
    $('oceanFull').hidden=true;
    $('oceanEmpty').hidden=false;
    $('oceanEmpty').textContent='Ocean imagery unavailable for this selection.';
    $('oceanLabel').textContent=`${title(product)} · ${row?.region_label||region} · °C`;
    $('oceanBaseline').textContent=product==='ssta'?(row?.baseline||'Not available'):'Absolute temperature (°C)';
    $('oceanProvenance').textContent=row?`Product: ${row.version}. Retrieved: ${utc(row.retrieved_at)}. Source HTTP Last-Modified: ${row.source_last_modified||'not supplied'}. ${row.coverage_note||''}`:'No verified ocean manifest loaded.';
    $('oceanSourceTitle').textContent=provider==='sport'?'NASA SPoRT composite · 2 km':'NOAA nighttime SST · 5 km';
    if(row){$('oceanSource').href=row.source_url;}
    if(!row?.image_path || !['available','stale'].includes(row.status)){
      $('oceanStatus').textContent='Unavailable · source image could not be retrieved.'; return;
    }
    // Compute delivery age on every page load, even if the update workflow has stopped.
    const retrieved=Date.parse(row.retrieved_at);
    const modified=Date.parse(row.source_last_modified);
    const valid=Date.parse(row.valid_time);
    const stale=(Number.isFinite(valid)&&Date.now()-valid>72*3600000)||row.status==='stale'||!Number.isFinite(retrieved)||Date.now()-retrieved>72*3600000||(Number.isFinite(modified)&&Date.now()-modified>72*3600000);
    $('oceanStatus').textContent=`${stale?'STALE CACHE · ':'Cached '+row.source_name+' image · '}${row.valid_time?'Composite valid '+utc(row.valid_time):'Observation date printed on map'}. Retrieved ${utc(row.retrieved_at)}.`;
    img.alt=`${row.source_name} ${row.region_label} ${title(product)}, degrees Celsius${row.baseline?', baseline '+row.baseline:''}. Observation date and color legend are printed on the map.`;
    img.onload=()=>{img.hidden=false;$('oceanEmpty').hidden=true;setZoom(row.initial_zoom||1,row.view_focus||[.5,.5]);};
    img.onerror=()=>{img.hidden=true;$('oceanEmpty').hidden=false;$('oceanEmpty').textContent='Cached image could not load. Open the source below.';$('oceanFull').hidden=true;};
    img.src=row.image_path;
    $('oceanFull').href=row.image_path;$('oceanFull').hidden=false;
  }
  document.querySelectorAll('[data-ocean-product],[data-ocean-region],[data-ocean-provider]').forEach(btn=>btn.addEventListener('click',()=>{
    if(btn.dataset.oceanProvider){provider=btn.dataset.oceanProvider;document.querySelectorAll('[data-ocean-provider]').forEach(b=>b.setAttribute('aria-pressed',String(b===btn)));renderOcean();return;}
    const key=btn.dataset.oceanProduct?'oceanProduct':'oceanRegion';
    if(key==='oceanProduct')product=btn.dataset[key];else region=btn.dataset[key];
    document.querySelectorAll(key==='oceanProduct'?'[data-ocean-product]':'[data-ocean-region]').forEach(b=>b.setAttribute('aria-pressed',String(b===btn)));
    renderOcean();
  }));
  Promise.all([loadJSON('data/ocean/manifest.json').catch(()=>({products:[]})),loadJSON('data/ocean/sport_manifest.json').catch(()=>({products:[]}))]).then(([n,s])=>{ocean={products:[...n.products,...s.products]};renderOcean();});
  function showEvidence(){
    if(!selectedRegion)return;
    const days={D1_7:'Days 1–7',D8_14:'Days 8–14',D15_21:'Days 15–21',D22_28:'Days 22–28'};
    const target=$('precipTarget').selectedOptions[0].textContent;
    $('regionEvidence').innerHTML=`<h3>${escape(selectedRegion.name)} <span class="badge neutral">UNAVAILABLE</span></h3><p>${days[lead]} · ${escape(target)}</p><p class="region-meta">No verified current science product is connected. Guidance is inactive; no issue time or forecast valid period has been assigned. This is not a near-climatology forecast.</p><div class="evidence-metrics"><span>Tendency<b>Not issued</b></span><span>Fold stability<b>—</b></span><span>Calibration support<b>—</b></span><span>Evidence tier<b>Not loaded</b></span></div>`;
  }
  loadJSON('data/ufvs_regions.json').then(data=>{
    $('regionCards').replaceChildren();
    data.regions.forEach(r=>{const b=document.createElement('button');b.type='button';b.className='region-card';b.setAttribute('aria-pressed','false');
      b.innerHTML=`<span class="region-name">${escape(r.name)}</span><div class="region-meta">Unavailable · guidance inactive</div><div class="region-meta">Inspect evidence →</div>`;
      b.onclick=()=>{selectedRegion=r;document.querySelectorAll('.region-card').forEach(n=>n.setAttribute('aria-pressed',String(n===b)));showEvidence();};$('regionCards').append(b);
    });$('regionCards').firstElementChild?.click();
  }).catch(()=>{$('regionEvidence').textContent='Region inventory unavailable. Guidance remains inactive.';});
  document.querySelectorAll('[data-lead]').forEach(b=>b.onclick=()=>{lead=b.dataset.lead;document.querySelectorAll('[data-lead]').forEach(n=>n.setAttribute('aria-pressed',String(n===b)));showEvidence();});
  $('precipTarget').onchange=showEvidence;
})();
