/* Observed ocean context and inactive science shell. No model inference here. */
(() => {
  const $ = id => document.getElementById(id);
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let ocean, product='ssta', region='global', lead='D1_7', selectedRegion=null;
  const title = p => p==='sst'?'Sea surface temperature':'SST anomaly';
  const utc = value => { const d=new Date(value); return value && Number.isFinite(d.getTime())?d.toISOString().replace('T',' ').slice(0,16)+' UTC':'not supplied'; };
  function renderOcean(){
    const row=ocean?.products?.find(r=>r.product===product && r.region===region);
    const img=$('oceanImage'); img.hidden=true; img.removeAttribute('src');
    $('oceanFull').hidden=true;
    $('oceanEmpty').hidden=false;
    $('oceanEmpty').textContent='Ocean imagery unavailable for this selection.';
    $('oceanLabel').textContent=`${title(product)} · ${row?.region_label||region} · °C`;
    $('oceanBaseline').textContent=product==='ssta'?'1991–2020':'Absolute temperature (°C)';
    $('oceanProvenance').textContent=row?`Product: ${row.version}. Retrieved: ${utc(row.retrieved_at)}. Source HTTP Last-Modified: ${row.source_last_modified||'not supplied'}.`:'No verified ocean manifest loaded.';
    if(row){$('oceanSource').href=row.source_url;}
    if(!row?.image_path || !['available','stale'].includes(row.status)){
      $('oceanStatus').textContent='Unavailable · source image could not be retrieved.'; return;
    }
    // Compute delivery age on every page load, even if the update workflow has stopped.
    const retrieved=Date.parse(row.retrieved_at);
    const modified=Date.parse(row.source_last_modified);
    const stale=row.status==='stale'||!Number.isFinite(retrieved)||Date.now()-retrieved>72*3600000||(Number.isFinite(modified)&&Date.now()-modified>72*3600000);
    $('oceanStatus').textContent=`${stale?'STALE CACHE · ':'Cached NOAA image · '}Observation date printed on map. Retrieved ${utc(row.retrieved_at)}.`;
    img.alt=`NOAA ${row.region_label} ${title(product)}, degrees Celsius${row.baseline?', baseline '+row.baseline:''}. Observation date and color legend are printed on the map.`;
    img.onload=()=>{img.hidden=false;$('oceanEmpty').hidden=true;};
    img.onerror=()=>{img.hidden=true;$('oceanEmpty').hidden=false;$('oceanEmpty').textContent='Cached image could not load. Open the NOAA source below.';$('oceanFull').hidden=true;};
    img.src=row.image_path;
    $('oceanFull').href=row.image_path;$('oceanFull').hidden=false;
  }
  document.querySelectorAll('[data-ocean-product],[data-ocean-region]').forEach(btn=>btn.addEventListener('click',()=>{
    const key=btn.dataset.oceanProduct?'oceanProduct':'oceanRegion';
    if(key==='oceanProduct')product=btn.dataset[key];else region=btn.dataset[key];
    document.querySelectorAll(key==='oceanProduct'?'[data-ocean-product]':'[data-ocean-region]').forEach(b=>b.setAttribute('aria-pressed',String(b===btn)));
    renderOcean();
  }));
  loadJSON('data/ocean/manifest.json').then(d=>{ocean=d;renderOcean();}).catch(()=>renderOcean());
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
