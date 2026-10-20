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
  let data, timer=null, playing=false, selectedFrames=[], requestNumber=0;
  function stop(){playing=false;clearTimeout(timer);timer=null;$('crPlay').textContent='Play';$('crPlay').setAttribute('aria-pressed','false');}
  function renderCards(){
    const days=$('crHistoryWindow').value;
    $('crCards').innerHTML=(data.sst_regions||[]).map(r=>{
      const rows=r.rows||[],latest=rows.at(-1),stale=r.status!=='current'||age(latest?.date)>3;
      if(!latest)return `<section class="cr-card"><h3>${esc(r.label)}</h3><p>Unavailable — ${esc(r.error||'no verified series')}</p></section>`;
      const cutoff=HistoryView.cutoff(latest.date,days),shown=rows.filter(p=>Date.parse(p.date)>=cutoff);
      return `<section class="cr-card"><h3>${esc(r.label)}</h3><p>${esc(r.bounds)}</p><div class="cr-value">${fmt(latest.sst_c)} <small>°C</small></div><b class="${latest.anomaly_c>=0?'cr-positive':'cr-negative'}">${signed(latest.anomaly_c)} °C anomaly</b><br><span class="cr-state ${stale?'stale':''}">${stale?'STALE / RETAINED · ':''}${latest.preliminary?'PRELIMINARY':'FINALIZED SERIES'} · ${esc(latest.date)}</span>${chart(shown)}<p>1991–2020 seasonal mean: ${fmt(latest.climatology_c)} °C. ${esc(r.error||'')}</p><a class="cr-source" href="${esc(r.source_page)}" target="_blank" rel="noopener">Source series & methodology ↗</a></section>`;
    }).join('');
  }
  async function showFrame(){
    const token=++requestNumber,frame=selectedFrames[Number($('crSlider').value)];

    if(!frame){$('crMovieImage').hidden=true;$('crMovieStatus').textContent='No verified frames available for this view.';return;}

    const image=frameImage(frame);
    try{await image.decode();if(token!==requestNumber)return;$('crMovieImage').src=frame.path;$('crMovieImage').alt=`OISST SST anomaly, ${frame.valid_date}, ${$('crMovieDomain').selectedOptions[0].text}`;$('crMovieImage').hidden=false;$('crMovieStatus').textContent=`Valid ${frame.valid_date} · 1991–2020 baseline${age(frame.valid_date)>3?' · historical frame':''}`;}
    catch{if(token===requestNumber){stop();$('crMovieStatus').textContent=`Frame unavailable: ${frame.valid_date}. Playback stopped.`;}}
  }
  function selectMovie(){stop();++requestNumber;$('crMovieImage').hidden=true;imageCache.clear();const group=data.animation?.domains?.[$('crMovieDomain').value];selectedFrames=group?.frames||[];$('crSlider').max=Math.max(0,selectedFrames.length-1);$('crSlider').value=Math.max(0,selectedFrames.length-1);$('crPlay').disabled=selectedFrames.length<2;$('crSlider').disabled=!selectedFrames.length;$('crMovieRange').textContent=selectedFrames.length?`${selectedFrames[0].valid_date} → ${selectedFrames.at(-1).valid_date} · ${selectedFrames.length} available daily frames${group.status!=='current'?' · partial / retained archive':''}`:'Unavailable';showFrame();}
  async function showAtmosphere(){const item=(data.atmosphere?.maps||[]).find(m=>m.domain===$('crAtmosDomain').value&&m.variable===$('crAtmosVariable').value);$('crAtmosImage').hidden=true;
    if(!item?.path){$('crAtmosStatus').textContent='Selected forecast context unavailable.';return;}
    $('crAtmosStatus').textContent=`${item.status==='current'?'Cached source map':'RETAINED — latest retrieval failed'} · retrieval ${item.retrieved_at}. Valid date is printed on the map; model initialization is not supplied in the verified metadata. Retrieval is not valid time.`;
    $('crAtmosImage').src=item.path;$('crAtmosImage').alt=`GFS forecast-based daily ${$('crAtmosVariable').selectedOptions[0].text}, ${$('crAtmosDomain').selectedOptions[0].text}`;$('crAtmosImage').hidden=false;
    $('crAtmosImage').onerror=()=>{$('crAtmosImage').hidden=true;$('crAtmosStatus').textContent='Forecast map file unavailable.';};
  }
  async function init(){try{const response=await fetch('data/reanalyzer/manifest.json',{cache:'no-cache'});if(!response.ok)throw new Error('Source catalog unavailable');data=await response.json();if(data.schema_version!==1)throw new Error('Unsupported source catalog');renderCards();selectMovie();showAtmosphere();$('crCatalogStatus').textContent=`Source check: ${data.checked_at} · NOAA OISST via Climate Reanalyzer`;}
    catch(err){$('crCatalogStatus').textContent=`Unavailable — ${err.message}`;$('crCards').textContent='Verified SST series have not been loaded.';$('crPlay').disabled=true;$('crAtmosStatus').textContent='Forecast context unavailable.';}
  }
  $('crHistoryWindow').addEventListener('change',()=>data&&renderCards());$('crMovieDomain').addEventListener('change',()=>data&&selectMovie());$('crSlider').addEventListener('input',()=>{stop();showFrame();});
  const imageCache=new Map();
  function frameImage(frame){if(!imageCache.has(frame.path)){const image=new Image();image.src=frame.path;imageCache.set(frame.path,image);if(imageCache.size>8)imageCache.delete(imageCache.keys().next().value);}return imageCache.get(frame.path);}
  async function advance(){timer=null;if(!playing||document.hidden){stop();return;}const i=(Number($('crSlider').value)+1)%selectedFrames.length;$('crSlider').value=i;await showFrame();if(!playing)return;for(let j=1;j<=3;j++)frameImage(selectedFrames[(i+j)%selectedFrames.length]);timer=setTimeout(advance,Number($('crSpeed').value));}
  $('crPlay').addEventListener('click',()=>{if(playing){stop();return;}if(selectedFrames.length<2)return;playing=true;$('crPlay').textContent='Pause';$('crPlay').setAttribute('aria-pressed','true');advance();});
  $('crSpeed').addEventListener('change',()=>{if(playing&&timer){clearTimeout(timer);timer=setTimeout(advance,Number($('crSpeed').value));}});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  ['crAtmosDomain','crAtmosVariable'].forEach(id=>$(id).addEventListener('change',()=>data&&showAtmosphere()));
  init();
})();
