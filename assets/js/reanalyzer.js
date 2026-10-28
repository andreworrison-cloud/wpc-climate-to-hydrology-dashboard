/* Source context only. No Q3 inputs, qualifications, or briefing activation. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const num = v => typeof v === 'number' && Number.isFinite(v);
  const fmt = v => num(v) ? v.toFixed(2) : 'Unavailable';
  const signed = v => num(v) ? `${v > 0 ? '+' : ''}${v.toFixed(2)}` : 'Unavailable';
  const age = d => d ? Math.floor((Date.now()-Date.parse(d+'T00:00:00Z'))/86400000) : Infinity;
  function chart(rows) {
    if (rows.length < 2) return '<p>Insufficient time-series coverage.</p>';
    const W=460,H=190,L=44,R=12,T=12,B=32;
    const valid=rows.flatMap(r=>[r.sst_c,r.climatology_c]).filter(num);
    if (!valid.length) return '<p>No numeric observations.</p>';
    let lo=Math.floor(Math.min(...valid)*2)/2, hi=Math.ceil(Math.max(...valid)*2)/2;
    if(hi-lo<.5){lo-=.25;hi+=.25;}
    const begin=Date.parse(rows[0].date),end=Date.parse(rows.at(-1).date);
    const x=d=>L+(Date.parse(d)-begin)/(end-begin)*(W-L-R), y=v=>T+(hi-v)/(hi-lo)*(H-T-B);
    function line(key){let pen=false;return rows.map((r,i)=>{if(!num(r[key])){pen=false;return '';}if(i && Date.parse(r.date)-Date.parse(rows[i-1].date)>86400000)pen=false;const a=`${pen?'L':'M'}${x(r.date).toFixed(1)},${y(r[key]).toFixed(1)}`;pen=true;return a;}).join(' ');}
    let svg=`<svg class="cr-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Daily SST and 1991–2020 seasonal climatology from ${esc(rows[0].date)} to ${esc(rows.at(-1).date)}"><title>SST (°C), calendar dates; gaps are not connected</title>`;
    for(let i=0;i<3;i++){const v=lo+i*(hi-lo)/2;svg+=`<line class="grid" x1="${L}" x2="${W-R}" y1="${y(v)}" y2="${y(v)}"/><text x="${L-6}" y="${y(v)+4}" text-anchor="end">${v.toFixed(1)}</text>`;}
    svg+=`<path class="normal" d="${line('climatology_c')}"/><path class="actual" d="${line('sst_c')}"/>`;
    rows.forEach(r=>{if(num(r.sst_c))svg+=`<circle cx="${x(r.date)}" cy="${y(r.sst_c)}" r="${r.preliminary?2.4:1.5}" fill="${r.preliminary?'#ffce8a':'#64d9e7'}"><title>${esc(r.date)}: ${fmt(r.sst_c)} °C; anomaly ${signed(r.anomaly_c)} °C${r.preliminary?'; preliminary':''}</title></circle>`;});
    svg+=HistoryView.ticks(begin,end,L,W-L-R,H-B);
    return svg+'</svg>';
  }
  function attachReadout(svg,rows){
    const panel=svg.parentElement.querySelector('.cr-readout'),begin=Date.parse(rows[0].date),end=Date.parse(rows.at(-1).date);let index=rows.length-1;
    svg.setAttribute('tabindex','0');svg.setAttribute('aria-label',svg.getAttribute('aria-label')+'. Use left and right arrows to inspect observations.');
    const marker=document.createElementNS('http://www.w3.org/2000/svg','line');marker.setAttribute('stroke','#f3faff');marker.setAttribute('stroke-dasharray','3 3');marker.setAttribute('y1','12');marker.setAttribute('y2','158');marker.style.pointerEvents='none';marker.style.display='none';svg.append(marker);
    function display(i){index=Math.max(0,Math.min(rows.length-1,i));const row=rows[index],x=44+(Date.parse(row.date)-begin)/(end-begin)*404;marker.setAttribute('x1',x);marker.setAttribute('x2',x);marker.style.display='';panel.textContent=`${row.date} · SST ${fmt(row.sst_c)} °C · 1991–2020 seasonal mean ${fmt(row.climatology_c)} °C · Anomaly ${signed(row.anomaly_c)} °C · ${row.preliminary?'Preliminary':'Finalized series'}`;}
    function point(e){const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;const q=p.matrixTransform(svg.getScreenCTM().inverse()),t=begin+Math.max(0,Math.min(1,(q.x-44)/404))*(end-begin);let i=0;for(let j=1;j<rows.length;j++)if(Math.abs(Date.parse(rows[j].date)-t)<Math.abs(Date.parse(rows[i].date)-t))i=j;display(i);}
    const hit=document.createElementNS('http://www.w3.org/2000/svg','rect');hit.setAttribute('width','460');hit.setAttribute('height','190');hit.setAttribute('fill','transparent');hit.setAttribute('pointer-events','all');hit.style.cursor='crosshair';svg.append(hit);
    svg.addEventListener('pointermove',point);svg.addEventListener('pointerdown',point);svg.addEventListener('focus',()=>display(index));
    svg.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();display(e.key==='Home'?0:e.key==='End'?rows.length-1:index+(e.key==='ArrowRight'?1:-1));}});
  }
  let data, timer=null, playing=false, selectedFrames=[], requestNumber=0;
  function stop(){playing=false;clearTimeout(timer);timer=null;$('crPlay').textContent='Play';$('crPlay').setAttribute('aria-pressed','false');}
  function renderCards(){
    const days=$('crHistoryWindow').value,chartRows=[];
    $('crCards').innerHTML=(data.sst_regions||[]).map(r=>{
      const rows=r.rows||[],latest=rows.at(-1),stale=r.status!=='current'||age(latest?.date)>3;
      if(!latest)return `<section class="cr-card"><h3>${esc(r.label)}</h3><p>Unavailable — ${esc(r.error||'no verified series')}</p></section>`;
      const cutoff=HistoryView.cutoff(latest.date,days),shown=rows.filter(p=>Date.parse(p.date)>=cutoff);chartRows.push(shown);
      return `<section class="cr-card"><h3>${esc(r.label)}</h3><p>${esc(r.bounds)}</p><div class="cr-value">${fmt(latest.sst_c)} <small>°C</small></div><b class="${latest.anomaly_c>=0?'cr-positive':'cr-negative'}">${signed(latest.anomaly_c)} °C anomaly</b><br><span class="cr-state ${stale?'stale':''}">${stale?'STALE / RETAINED · ':''}${latest.preliminary?'PRELIMINARY':'FINALIZED SERIES'} · ${esc(latest.date)}</span>${chart(shown)}<div class="cr-readout" role="status">Hover or tap the chart for a dated SST, climatology and anomaly readout.</div><p>1991–2020 seasonal mean: ${fmt(latest.climatology_c)} °C. ${esc(r.error||'')}</p><a class="cr-source" href="${esc(r.source_page)}" target="_blank" rel="noopener">Source series & methodology ↗</a></section>`;
    }).join('');
    $('crCards').querySelectorAll('svg.cr-chart').forEach((svg,i)=>attachReadout(svg,chartRows[i]));
  }
  async function showFrame(){
    const token=++requestNumber,frame=selectedFrames[Number($('crSlider').value)];

    if(!frame){$('crMovieImage').hidden=true;$('crMovieStatus').textContent='No verified frames available for this view.';return;}

    const image=frameImage(frame);
    try{await image.decode();if(token!==requestNumber)return;$('crMovieImage').src=$('crMovieDomain').value==='north_pacific'?northPacific(image):image.src;$('crMovieImage').alt=`OISST ${$('crMovieVariable').selectedOptions[0].text}, ${frame.valid_date}, ${$('crMovieDomain').selectedOptions[0].text}`;$('crMovieImage').hidden=false;$('crMovieStatus').textContent=`Valid ${frame.valid_date} · ${$('crMovieVariable').value==='sst'?'Absolute SST · °C':'Anomaly · °C · 1991–2020 baseline'}${$('crMovieDomain').value==='north_pacific'?' · North Pacific crop of global source map':''}${age(frame.valid_date)>3?' · historical frame':''}`;}
    catch{if(token===requestNumber){stop();$('crMovieStatus').textContent=`Frame unavailable: ${frame.valid_date}. Playback stopped.`;}}
  }
  function movieGroup(){const variable=$('crMovieVariable').value,domain=$('crMovieDomain').value;return data.animation?.variables?.[variable]?.domains?.[domain]||(variable==='ssta'?data.animation?.domains?.[domain]:null);}
  function northPacific(source){
    // Verified source layout; crop preserves the source projection, not a new lat/lon grid.
    if(source.naturalWidth!==1100||source.naturalHeight!==794)throw Error('Global map layout changed; Pacific view requires review.');
    const canvas=document.createElement('canvas');canvas.width=1100;canvas.height=830;const ctx=canvas.getContext('2d');
    ctx.fillStyle='white';ctx.fillRect(0,0,1100,830);
    ctx.drawImage(source,0,0,1100,55,0,0,1100,55);
    ctx.drawImage(source,5,65,550,345,0,55,1100,690);
    ctx.font='16px sans-serif';ctx.fillStyle='#253747';ctx.textAlign='center';ctx.fillText('North Pacific · crop of global source map · original projection retained',550,765);
    ctx.drawImage(source,0,734,1100,60,0,770,1100,60);
    return canvas.toDataURL('image/png');
  }
  function selectMovie({keepDate=false}={}){
    const date=keepDate?selectedFrames[Number($('crSlider').value)]?.valid_date:null;
    $('crMovieRefresh').hidden=true;stop();++requestNumber;$('crMovieImage').hidden=true;imageCache.clear();
    const group=movieGroup();selectedFrames=group?.frames||[];$('crSlider').setAttribute('aria-label',$('crMovieVariable').selectedOptions[0].text+' date');
    const match=selectedFrames.findIndex(f=>f.valid_date===date);
    $('crSlider').max=Math.max(0,selectedFrames.length-1);$('crSlider').value=match>=0?match:Math.max(0,selectedFrames.length-1);
    $('crPlay').disabled=selectedFrames.length<2;$('crSlider').disabled=!selectedFrames.length;
    $('crMovieRange').textContent=selectedFrames.length?`${selectedFrames[0].valid_date} → ${selectedFrames.at(-1).valid_date} · ${selectedFrames.length} available daily frames${group.status!=='current'?' · partial / retained archive':''}${date&&match<0?' · selected date unavailable; showing latest available frame':''}`:'Unavailable for this variable and view';
    showFrame();
  }

  async function showAtmosphere(){
    const available=(data.atmosphere?.maps||[]).filter(m=>m.domain===$('crAtmosDomain').value&&m.path);
    for(const option of $('crAtmosVariable').options){option.dataset.sourceLabel ||= option.textContent;option.disabled=!available.some(m=>m.variable===option.value);option.textContent=option.dataset.sourceLabel+(option.disabled?((data.atmosphere.maps.find(m=>m.domain===$('crAtmosDomain').value&&m.variable===option.value)?.status==='unsupported')?' — not offered by source':' — unavailable'):'');}
    if(available.length&&!available.some(m=>m.variable===$('crAtmosVariable').value))$('crAtmosVariable').value=available[0].variable;
    const item=(data.atmosphere?.maps||[]).find(m=>m.domain===$('crAtmosDomain').value&&m.variable===$('crAtmosVariable').value);$('crAtmosImage').hidden=true;
    if(!item?.path){$('crAtmosStatus').textContent='Selected forecast context unavailable.';return;}
    $('crAtmosStatus').textContent=`${item.status==='current'?'Cached source map':'RETAINED — latest retrieval failed'} · retrieval ${item.retrieved_at}. Valid date is printed on the map; model initialization is not supplied in the verified metadata. Retrieval is not valid time.`;
    if(item.product_kind==='forecast_snapshot')$('crAtmosStatus').textContent='Regional GFS initialization-time snapshot · cycle '+item.initialization_time+' · valid '+item.valid_time+' · lead '+item.lead_hours+' h · '+(item.status==='current'?'cached source':'retained source')+'. Not a daily average.';
    $('crAtmosImage').src=DashboardRefresh.versioned(item.path,item.sha256||item.retrieved_at);$('crAtmosImage').alt=`GFS ${item.product_kind==='forecast_snapshot'?'forecast snapshot':'forecast-based daily'} ${$('crAtmosVariable').selectedOptions[0].text}, ${$('crAtmosDomain').selectedOptions[0].text}`;$('crAtmosImage').hidden=false;
    $('crAtmosImage').onerror=()=>{$('crAtmosImage').hidden=true;$('crAtmosStatus').textContent='Forecast map file unavailable.';};
  }
  DashboardRefresh.register('SST history and atmospheric context',['data/reanalyzer/manifest.json'],async ([next],{initial})=>{
    if(next.schema_version!==1||!Array.isArray(next.sst_regions)||!Array.isArray(next.atmosphere?.maps))throw Error('Unsupported source catalog');
    const selection=[$('crAtmosDomain').value,$('crAtmosVariable').value].join('/');
    const item=next.atmosphere.maps.find(m=>m.domain===$('crAtmosDomain').value&&m.variable===$('crAtmosVariable').value);
    if(initial){data=next;renderCards();selectMovie();showAtmosphere();}
    else{
      if(!item?.path)throw Error('Selected atmospheric map unavailable');
      const image=await DashboardRefresh.imageReady(DashboardRefresh.versioned(item.path,item.sha256||item.retrieved_at));
      if(selection!==[$('crAtmosDomain').value,$('crAtmosVariable').value].join('/'))throw Error('Atmospheric selection changed; deferred');
      const newFrames=JSON.stringify(data.animation)!==JSON.stringify(next.animation);
      data=next;renderCards();
      $('crAtmosImage').src=image.src;$('crAtmosImage').hidden=false;
      $('crAtmosStatus').textContent=`${item.status==='current'?'Cached source map':'RETAINED — latest retrieval failed'} · retrieval ${item.retrieved_at}. Valid date is printed on the map; retrieval is not valid time.`;
      if(item.product_kind==='forecast_snapshot')$('crAtmosStatus').textContent='Regional GFS initialization-time snapshot · cycle '+item.initialization_time+' · valid '+item.valid_time+' · lead '+item.lead_hours+' h · '+(item.status==='current'?'cached source':'RETAINED — regional refresh incomplete')+'. Not a daily average.';
      // Keep the selected frame, playback state and frame list until explicit user engagement.
      if(newFrames)$('crMovieRefresh').hidden=false;
    }
    $('crCatalogStatus').textContent=`Source check: ${data.checked_at} · NOAA OISST via Climate Reanalyzer`;
  });
  $('crMovieRefresh').addEventListener('click',()=>data&&selectMovie());
  $('crHistoryWindow').addEventListener('change',()=>data&&renderCards());['crMovieDomain','crMovieVariable'].forEach(id=>$(id).addEventListener('change',()=>data&&selectMovie({keepDate:true})));$('crSlider').addEventListener('input',()=>{stop();showFrame();});
  const imageCache=new Map();
  function frameImage(frame){if(!imageCache.has(frame.path)){const image=new Image();image.src=DashboardRefresh.versioned(frame.path,frame.sha256||frame.retrieved_at);imageCache.set(frame.path,image);if(imageCache.size>8)imageCache.delete(imageCache.keys().next().value);}return imageCache.get(frame.path);}
  async function advance(){timer=null;if(!playing||document.hidden){stop();return;}const i=(Number($('crSlider').value)+1)%selectedFrames.length;$('crSlider').value=i;await showFrame();if(!playing)return;for(let j=1;j<=3;j++)frameImage(selectedFrames[(i+j)%selectedFrames.length]);timer=setTimeout(advance,Number($('crSpeed').value));}
  $('crPlay').addEventListener('click',()=>{if(playing){stop();return;}if(selectedFrames.length<2)return;playing=true;$('crPlay').textContent='Pause';$('crPlay').setAttribute('aria-pressed','true');advance();});
  $('crSpeed').addEventListener('change',()=>{if(playing&&timer){clearTimeout(timer);timer=setTimeout(advance,Number($('crSpeed').value));}});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  ['crAtmosDomain','crAtmosVariable'].forEach(id=>$(id).addEventListener('change',()=>data&&showAtmosphere()));
})();


