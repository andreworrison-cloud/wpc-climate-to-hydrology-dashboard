/* Descriptive ending-day maps; no model evaluation, qualification or issuance. */
(function(root){
 'use strict';
 const need=(ok,msg)=>{if(!ok)throw Error('Historical maps: '+msg);};
 const key=r=>[r.domain,r.season,r.metric,r.precipitation_days,r.driver,r.state].join('|');
 function validate(data,manifest){
  need(manifest.schema_version==='historical-maps-manifest-v1'&&manifest.active_prediction===false,'manifest role');
  need(data.schema_version==='historical-maps-v1'&&data.active_prediction===false&&data.rows.length===4416,'complete inactive family');
  const rows=data.rows.map(a=>{need(a.length===data.columns.length,'row shape');return Object.fromEntries(data.columns.map((k,i)=>[k,a[i]]));}),index=new Map();
  for(const r of rows){need(manifest.domains.includes(r.domain)&&['DJF','MAM','JJA','SON'].includes(r.season)&&manifest.metrics.includes(r.metric)&&manifest.categories.includes(r.precipitation_days),'cell coordinates');need((r.driver==='NONE'&&r.state==='ALL')||(manifest.drivers[r.driver]&&(r.state==='ALL'||manifest.drivers[r.driver].includes(r.state))),'state coordinates');need(!index.has(key(r)),'duplicate cell');index.set(key(r),r);need(Number.isInteger(r.days)&&r.days>=0&&r.days<=8034&&Number.isInteger(r.years)&&r.years>=0&&r.years<=22&&(r.days===0)===(r.years===0),'sample support');
   for(const event of Object.keys(manifest.events))need(Number.isInteger(r[event+'_events'])&&r[event+'_events']>=0&&Number.isInteger(r[event+'_days'])&&r[event+'_days']>=0&&r[event+'_days']<=r.days&&r[event+'_days']<=r[event+'_events'],'event arithmetic');
   need(r.LSR_events===r.LSR_FLASH_events+r.LSR_FLOOD_events+r.LSR_SLOPE_events,'LSR type totals');
  }
  for(const r of rows.filter(r=>r.state==='ALL'&&r.driver!=='NONE')){
   const states=manifest.drivers[r.driver].map(state=>index.get(key({...r,state})));need(states.every(Boolean),'retained state family');
   for(const col of ['days',...Object.keys(manifest.events).flatMap(e=>[e+'_events',e+'_days'])])need(states.reduce((s,v)=>s+v[col],0)===r[col],'state partition: '+col);
  }
  return {rows,index};
 }
 function value(row,event,measure){return row.days>0?100*row[event+(measure==='event_days'?'_days':'_events')]/row.days:null;}
 function compare(row,base,event,measure,view){const a=value(row,event,measure),b=value(base,event,measure);return view==='background'?b:view==='difference'?(a===null||b===null?null:a-b):a;}
 function regionRings(runs){
  // Cancel shared cell edges before projection. Separate projected row strips
  // leave visible seams because a long latitude chord differs from short ones.
  const edges=new Map(),cells=new Set(),point=(x,y)=>x+','+y;
  const edgeKey=e=>e.join(',');
  const add=(x,y,a,b)=>{const reverse=[a,b,x,y],k=edgeKey(reverse);if(edges.has(k))edges.delete(k);else edges.set(edgeKey([x,y,a,b]),[x,y,a,b]);};
  for(const run of runs){need(run.length===4&&run.every(Number.isFinite),'mask run coordinates');const v=run.map(n=>Math.round(n*4));need(run.every((n,i)=>Math.abs(n*4-v[i])<1e-7)&&v[2]>v[0]&&v[3]>v[1],'quarter-degree mask lattice');
   for(let y=v[1];y<v[3];y++)for(let x=v[0];x<v[2];x++){need(!cells.has(point(x,y)),'overlapping mask cells');cells.add(point(x,y));add(x,y,x+1,y);add(x+1,y,x+1,y+1);add(x+1,y+1,x,y+1);add(x,y+1,x,y);}
  }
  const outgoing=new Map();for(const e of edges.values()){const k=point(e[0],e[1]);if(!outgoing.has(k))outgoing.set(k,[]);outgoing.get(k).push(e);}
  const direction=e=>e[2]>e[0]?0:e[3]>e[1]?1:e[2]<e[0]?2:3;
  const rings=[],unused=new Map(edges),rank={1:0,0:1,3:2,2:3};
  while(unused.size){let e=unused.values().next().value;const start=point(e[0],e[1]),ring=[[e[0]/4,e[1]/4]];let walked=0;
   for(;;){need(unused.delete(edgeKey(e)),'repeated mask boundary edge');ring.push([e[2]/4,e[3]/4]);walked++;need(walked<=edges.size,'unclosed mask boundary');const end=point(e[2],e[3]);if(end===start)break;
    const candidates=(outgoing.get(end)||[]).filter(a=>unused.has(edgeKey(a)));need(candidates.length>0,'open mask boundary');const prior=direction(e);
    // At diagonal contacts, turn left to retain separate components and holes.
    candidates.sort((a,b)=>rank[(direction(a)-prior+4)%4]-rank[(direction(b)-prior+4)%4]);e=candidates[0];
   }
   need(ring.length>=5,'degenerate mask ring');rings.push(ring);
  }
  return rings;
 }
 function scaleMaximum(values,limit=Infinity){const maximum=values.reduce((m,v)=>Number.isFinite(v)?Math.max(m,Math.abs(v)):m,0);if(maximum===0)return 1;const power=10**Math.floor(Math.log10(maximum)),step=[1,2,2.5,5,10].find(n=>n*power>=maximum-1e-10);return Math.min(limit,step*power);}
 function palette(event){return event==='FFW'?{sequential:['#172735','#ffb8a0','#ff795d','#f12e49','#a90027'],lower:'#70b9ff',neutral:'#1b3040',higher:'#ff3c55',accent:'#ff7c80'}:{sequential:['#172735','#a2edc2','#53df9c','#0bc777','#007b49'],lower:'#70b9ff',neutral:'#1b3040',higher:'#25eb98',accent:'#5bf0ae'};}
 function color(v,max,diff,event){if(!Number.isFinite(v))return'#172735';const p=palette(event),t=Math.max(0,Math.min(1,Math.abs(v)/max)),stops=diff?[p.neutral,v<0?p.lower:p.higher]:p.sequential,k=t*(stops.length-1),i=Math.min(stops.length-2,Math.floor(k)),f=k-i;
  const rgb=h=>[1,3,5].map(a=>parseInt(h.slice(a,a+2),16)),a=rgb(stops[i]),b=rgb(stops[i+1]);return'rgb('+a.map((n,j)=>Math.round(n+(b[j]-n)*f)).join(',')+')';}
 root.HistoricalMapContract={validate,key,value,compare,regionRings,scaleMaximum,palette,color};
 if(typeof module!=='undefined'&&module.exports)module.exports=root.HistoricalMapContract;
})(typeof window!=='undefined'?window:globalThis);

if(typeof document!=='undefined')(()=>{
 const $=id=>document.getElementById(id),C=window.HistoricalMapContract;
 if(!$('historicalMapPanel'))return;
 const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const fmt=(v,n=1)=>Number.isFinite(v)?v.toLocaleString('en-US',{maximumFractionDigits:n}):'Unavailable';
 const cache=new Map();let manifest,geometry,catalog,hovered=null;
 const label={all:'All valid precipitation days',extreme:'Extreme precipitation days',non_extreme:'Non-extreme precipitation days'};
 const centers={'West Coast':[-122,42],'Southwest':[-112,36],'Interior Mountain West':[-112,46],'Northern Plains':[-95,45],'Southern Plains':[-95,34],'Southeast':[-82,32.5],'Northeast':[-76,43]};
 const qs=()=>({domain:$('researchDomain').value,season:$('researchSeason').value,metric:$('researchTarget').value==='AreaMeanExtreme_Any'?'AreaMean':'AreaFrac_GE25mm',driver:$('researchDriver').value,precipitation_days:$('mapPrecipDays').value,state:$('mapClimateState').value,event:$('mapEvent').value,measure:$('mapMeasure').value,view:$('mapView').value});
 function prefs(){try{localStorage.setItem('wpc-historical-map-v1',JSON.stringify({mode:$('research-view').dataset.atlasMode,fields:Object.fromEntries(['mapPrecipDays','mapEvent','mapMeasure','mapView','mapClimateState'].map(id=>[id,$(id).value]))}));}catch{}}
 function states(){if(!manifest)return;const current=$('mapClimateState').value,driver=$('researchDriver').value,options=manifest.drivers[driver];$('mapClimateState').replaceChildren(...options.map(state=>new Option(state.replace('Relative El Nino','El Niño').replace('Relative La Nina','La Niña').replace('Weak','Weak · amplitude <1'),state)));$('mapClimateState').value=options.includes(current)?current:driver==='RONI'?'Neutral':driver==='MJO'?'Phase 1':'Near zero';}
 function mode(view,persist=true){$('research-view').dataset.atlasMode=view;$('historicalMapPanel').hidden=view!=='map';document.querySelectorAll('button[data-atlas-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.atlasMode===view)));if(view==='map'&&manifest)render();if(persist)prefs();}
 function row(s,domain,state){return catalog.index.get([domain,s.season,s.metric,s.precipitation_days,s.driver,state].join('|'));}
 function selected(s,domain){const base=row(s,domain,'ALL'),r=s.view==='background'?base:row(s,domain,s.state);if(!r||!base)throw Error('Retained historical cell unavailable');return {r,base,v:C.compare(r,base,s.event,s.measure,s.view)};}
 function limited(r){return r.days<manifest.descriptive_support.minimum_days||r.years<manifest.descriptive_support.minimum_years;}
 function project(lon,lat){const rad=Math.PI/180,n=(Math.sin(29.5*rad)+Math.sin(45.5*rad))/2,c=Math.cos(29.5*rad)**2+2*n*Math.sin(29.5*rad),rho=Math.sqrt(c-2*n*Math.sin(lat*rad))/n,theta=n*(lon+96)*rad;return [450+rho*Math.sin(theta)*900,220+(Math.sqrt(c-2*n*Math.sin(37.5*rad))/n-rho*Math.cos(theta))*-900];}
 const path=points=>points.map((p,i)=>{const[x,y]=project(...p);return(i?'L':'M')+x.toFixed(2)+','+y.toFixed(2);}).join('');
 function readout(domain){if(!manifest)return;const s=qs(),{r,base,v}=selected(s,domain),daypct=C.value(r,s.event,'event_days'),rate=C.value(r,s.event,'events'),delta=C.compare(r,base,s.event,s.measure,'difference');
  $('mapReadout').innerHTML=`<div class="map-card-kicker">${domain==='National CONUS'?'SEPARATE CONUS SUMMARY':'UFVS REGION'}</div><h3>${esc(domain)}</h3><div class="map-big-value ${s.view==='difference'&&v<0?'negative':''}">${fmt(v)}<small>${s.view==='difference'?(s.measure==='event_days'?'percentage points':'events / 100 days'):s.measure==='event_days'?'% of selected days':'events / 100 days'}</small></div><p>${esc(s.view==='background'?'Seasonal background':s.state.replace('Relative ',''))} · ${s.season}</p><dl><div><dt>Qualifying days / years</dt><dd>${fmt(r.days,0)} / ${r.years}</dd></div><div><dt>Warning or report records</dt><dd>${fmt(r[s.event+'_events'],0)}</dd></div><div><dt>Days with ≥1 record</dt><dd>${fmt(r[s.event+'_days'],0)} · ${fmt(daypct)}%</dd></div><div><dt>Records per 100 days</dt><dd>${fmt(rate)}</dd></div><div><dt>Matched background</dt><dd>${fmt(C.value(base,s.event,s.measure))} · ${fmt(base.days,0)} days</dd></div><div><dt>Difference from background</dt><dd>${delta===null?'Unavailable':(delta>0?'+':'')+fmt(delta)} ${s.measure==='event_days'?'pp':'/100d'}</dd></div></dl><p class="map-support ${limited(r)?'limited':''}">${limited(r)?'Limited descriptive support: fewer than 30 days or 5 represented years. Values retained; shading hatched.':'Descriptive sample support shown; this is not a confidence or forecast-skill tier.'}</p>`;
 }
 function render(){if(!manifest||!catalog||!geometry)return;const s=qs(),diff=s.view==='difference',regions=geometry.regions.map(g=>({...g,...selected(s,g.name)}));$('mapClimateState').disabled=s.view==='background';
  const family=[];for(const g of geometry.regions)for(const state of ['ALL',...manifest.drivers[s.driver]]){const r=row(s,g.name,state),b=row(s,g.name,'ALL');family.push(C.compare(r,b,s.event,s.measure,diff?'difference':'composite'));}
  const max=C.scaleMaximum(family,s.measure==='event_days'?100:Infinity),pal=C.palette(s.event);$('historicalMapPanel').dataset.eventFamily=s.event==='FFW'?'ffw':'lsr';
  let svg='<svg viewBox="0 0 900 480" role="group" aria-label="Historical regional warning and report activity. Seven UFVS sampling regions; not local flood probabilities."><defs><pattern id="mapLimitedHatch" width="7" height="7" patternUnits="userSpaceOnUse"><path d="M0 7L7 0" stroke="#d8dfe7" stroke-opacity=".5" stroke-width="1"/></pattern></defs>';
  for(const g of regions){const p=g.rings.map(r=>path(r)+'Z').join('');svg+=`<g class="map-region ${s.domain===g.name?'selected':''}" tabindex="0" role="button" data-map-domain="${esc(g.name)}" aria-label="${esc(g.name)}: ${fmt(g.v)} ${diff?'difference':'historical frequency'}; ${g.r.days} days"><path class="map-region-fill" d="${p}" fill-rule="evenodd" fill="${C.color(g.v,max,diff,s.event)}"/>${limited(g.r)?`<path d="${p}" fill-rule="evenodd" fill="url(#mapLimitedHatch)" pointer-events="none"/>`:''}</g>`;}
  svg+='<g class="map-state-lines" pointer-events="none">'+geometry.state_arcs.map(a=>'<path d="'+path(a)+'"/>').join('')+'</g>';
  for(const g of regions){const[x,y]=project(...centers[g.name]);const title=g.name==='Interior Mountain West'?'Interior Mountain West':g.name;svg+=`<g class="map-label" pointer-events="none"><text x="${x}" y="${y}" text-anchor="middle">${esc(title)}</text><text class="map-label-value" x="${x}" y="${y+20}" text-anchor="middle">${g.v===null?'No sample':(diff&&g.v>0?'+':'')+fmt(g.v)+(s.measure==='event_days'?(diff?' pp':'%'):'/100d')}</text></g>`;}
  svg+='</svg>';$('historicalMap').innerHTML=svg;
  $('mapTitle').textContent=manifest.events[s.event]+' · '+s.season+' · '+(s.view==='background'?'Seasonal background':s.state.replace('Relative El Nino','El Niño').replace('Relative La Nina','La Niña'));
  $('mapSubtitle').textContent=label[s.precipitation_days]+' · '+(s.metric==='AreaMean'?'regional mean P95':'≥25 mm coverage P95')+' · same ending day · 2004–2025';
  const ticks=diff?[-max,-max/2,0,max/2,max]:[0,max/4,max/2,3*max/4,max],eventName=s.event==='FFW'?'FFW':'LSR',gradient=diff?[pal.lower,pal.neutral,pal.higher]:pal.sequential;
  $('mapLegend').innerHTML=`<div class="map-scale"><div class="map-scale-names"><span>${diff?'Lower historical activity':'Lower '+eventName+' activity'}</span><span>${diff?'Higher historical activity':'Higher '+eventName+' activity'}</span></div><div class="map-scale-bar" style="background:linear-gradient(90deg,${gradient.join(',')})"></div><div class="map-scale-ticks">${ticks.map(v=>'<span>'+(diff&&v>0?'+':'')+fmt(v,2)+'</span>').join('')}</div></div><b>${s.measure==='event_days'?(diff?'percentage points':'% of selected days'):'records / 100 days'}</b><small>Shared regional scale across all climate states in this sample · hatching: limited descriptive support · color shows activity, not confidence</small>`;
  $('historicalMap').querySelectorAll('[data-map-domain]').forEach(el=>{const name=el.dataset.mapDomain;el.addEventListener('pointerenter',()=>{hovered=name;readout(name);});el.addEventListener('pointerleave',()=>{hovered=null;readout(qs().domain);});el.addEventListener('focus',()=>readout(name));const choose=()=>{$('researchDomain').value=name;$('researchDomain').dispatchEvent(new Event('change',{bubbles:true}));};el.addEventListener('click',choose);el.addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();choose();}});});
  $('mapTable').innerHTML='<table><thead><tr><th>Domain</th><th>Displayed value</th><th>Days</th><th>Years</th><th>Records</th></tr></thead><tbody>'+manifest.domains.map(name=>{const x=selected(s,name);return`<tr><th>${esc(name)}</th><td>${fmt(x.v)}</td><td>${x.r.days}</td><td>${x.r.years}</td><td>${x.r[s.event+'_events']}</td></tr>`;}).join('')+'</tbody></table>';
  readout(hovered||s.domain);
 }
 async function verified(path,m){const spec=m.files[path];if(!spec)throw Error('Missing map source identity');const id=path+'|'+spec.sha256;if(cache.has(id))return cache.get(id);const response=await fetch(DashboardRefresh.versioned(path,spec.sha256),{cache:'force-cache'});if(!response.ok)throw Error('Map source HTTP '+response.status);const bytes=await response.arrayBuffer(),hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');if(hash!==spec.sha256||bytes.byteLength!==spec.bytes)throw Error('Map source integrity check failed');const data=JSON.parse(new TextDecoder().decode(bytes));cache.set(id,data);return data;}
 const fieldIds=['mapPrecipDays','mapEvent','mapMeasure','mapView'];let saved;try{saved=JSON.parse(localStorage.getItem('wpc-historical-map-v1')||'null');if(saved)for(const id of fieldIds)if([...$(id).options].some(o=>o.value===saved.fields[id]))$(id).value=saved.fields[id];}catch{}
 document.querySelectorAll('button[data-atlas-mode]').forEach(b=>b.onclick=()=>mode(b.dataset.atlasMode));
 fieldIds.concat('mapClimateState').forEach(id=>$(id).addEventListener('change',()=>{hovered=null;render();prefs();}));
 ['researchDomain','researchSeason','researchDriver','researchTarget'].forEach(id=>$(id).addEventListener('change',()=>{if(id==='researchDriver')states();hovered=null;render();prefs();}));
 $('mapNational').onclick=()=>{$('researchDomain').value='National CONUS';$('researchDomain').dispatchEvent(new Event('change',{bubbles:true}));};
 mode(saved?.mode==='map'?'map':'relationship',false);
 DashboardRefresh.register('historical warning/report maps',['data/historical/manifest.json'],async([m],{initial})=>{
  try{const[d,g,q]=await Promise.all([verified('data/historical/maps.json',m),verified('data/historical/geometry.json',m),verified('data/historical/qa.json',m)]);const checked=C.validate(d,m);if(q.status!=='PASS'||q.phase4c_count_comparisons!==256||g.regions.length!==7||g.regions.some(r=>r.name==='National CONUS'))throw Error('Map provenance or geometry inventory failed');manifest=m;catalog=checked;geometry={...g,regions:g.regions.map(r=>({...r,rings:C.regionRings(r.runs)}))};states();if(saved?.fields&&m.drivers[$('researchDriver').value].includes(saved.fields.mapClimateState))$('mapClimateState').value=saved.fields.mapClimateState;saved=null;
   $('mapProvenance').innerHTML='<p>'+esc(m.calendar)+'. '+esc(m.baseline)+'.</p><p>Extreme definition: '+esc(m.reference)+'. No threshold is refit.</p><p>LSRs include flash flood (96,810), flood (57,974), debris flow (2,775) and landslide (728); subsets remain available.</p><ul>'+m.limitations.map(t=>'<li>'+esc(t)+'</li>').join('')+'</ul><p>FFW locations: 81,526 original; 2,148 reconstructed for regional assignment. No individual event points are plotted.</p><p>Regional shapes follow the exact inherited CPC sampling masks. State lines are contextual Census 2017 boundaries via us-atlas.</p><p>All 256 extreme/non-extreme Phase 4C count comparisons and 192 RONI state comparisons passed. No new p-values, FDR findings, predictive tiers or causal claims.</p><p>Source hashes:</p>'+Object.entries(m.source_hashes).map(([k,v])=>'<code>'+esc(k)+' · '+esc(v)+'</code>').join('');render();$('mapStatus').textContent='Verified historical composites · 83,674 authoritative warnings / 158,287 reports · 8,034 formal dates';
  }catch(error){$('mapStatus').textContent='Map update unavailable: '+error.message+(initial?'':'. Previously verified data retained.');if(initial){$('historicalMap').textContent='Historical map unavailable until source checks pass.';$('mapReadout').textContent='No verified map values available.';}throw error;}
 });
})();

