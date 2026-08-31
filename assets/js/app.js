const loadJSON = async (path) => {
  const response = await fetch(path, {cache: 'no-store'});
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return response.json();
};

const fmt = (value, suffix='') => value === null || value === undefined ? '—' : `${typeof value === 'number' && value > 0 ? '+' : ''}${value}${suffix}`;
const num = (v, digits=2) => Number.isFinite(Number(v)) ? Number(v).toFixed(digits) : '—';
const signed = (v, digits=2) => Number.isFinite(Number(v)) ? `${Number(v) > 0 ? '+' : ''}${Number(v).toFixed(digits)}` : '—';

function driverMarkup(d){
  if (d.id === 'mjo_rmm' && d.phase && d.amplitude !== null && d.amplitude !== undefined) {
    return `<div class="driver-top"><span class="driver-name">${d.display_name}</span><span class="status-dot"></span></div>
      <div class="driver-value">Phase ${d.phase} <span style="font-size:.58em;font-weight:700">• Amp ${Number(d.amplitude).toFixed(2)}</span></div>
      <div class="driver-meta">${d.signal_strength || 'RMM signal'} • ${d.phase_region || ''}</div>
      <div class="driver-meta">RMM1 ${Number(d.rmm1).toFixed(2)} • RMM2 ${Number(d.rmm2).toFixed(2)} • valid ${d.valid_time || '—'}</div>
      <div class="driver-meta">Source: ${d.source_name}</div>`;
  }
  return `<div class="driver-top"><span class="driver-name">${d.display_name}</span><span class="status-dot"></span></div>
    <div class="driver-value">${fmt(d.value, d.units ? ` ${d.units}` : '')}</div>
    <div class="driver-meta">${d.state || 'Awaiting ingestion'} • valid ${d.valid_time || '—'}</div>
    <div class="driver-meta">Source: ${d.source_name}</div>
    ${d.provisional ? '<div class="driver-meta">Latest value is provisional / subject to CPC revision</div>' : ''}`;
}

function lineChartSVG(rows, valueKey='value'){
  if (!rows || rows.length < 2) return '<div class="empty-state">Insufficient history.</div>';
  const W=640, H=210, m={l:38,r:14,t:14,b:28};
  const vals=rows.map(r=>Number(r[valueKey])).filter(Number.isFinite);
  if (!vals.length) return '<div class="empty-state">No numeric history.</div>';
  let min=Math.min(...vals), max=Math.max(...vals);
  const abs=Math.max(Math.abs(min),Math.abs(max),0.5);
  min=-abs*1.12; max=abs*1.12;
  const x=i=>m.l+i*(W-m.l-m.r)/(rows.length-1);
  const y=v=>m.t+(max-v)*(H-m.t-m.b)/(max-min);
  const pts=rows.map((r,i)=>`${x(i).toFixed(1)},${y(Number(r[valueKey])).toFixed(1)}`).join(' ');
  const zeroY=y(0);
  const grid=[-1,-.5,0,.5,1].map(f=>min+(max-min)*(f+1)/2).filter(v=>v>=min&&v<=max);
  const gridLines=grid.map(v=>`<line x1="${m.l}" y1="${y(v)}" x2="${W-m.r}" y2="${y(v)}" class="chart-grid-line"/><text x="${m.l-6}" y="${y(v)+3}" text-anchor="end" class="chart-axis-label">${v.toFixed(1)}</text>`).join('');
  const last=rows.length-1;
  const firstLabel=rows[0].date || `${rows[0].season || ''} ${rows[0].year || ''}`;
  const lastLabel=rows[last].date || `${rows[last].season || ''} ${rows[last].year || ''}`;
  return `<svg class="chart-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img">
    ${gridLines}<line x1="${m.l}" y1="${zeroY}" x2="${W-m.r}" y2="${zeroY}" class="chart-zero"/>
    <polyline points="${pts}" class="chart-line"/>
    <circle cx="${x(last)}" cy="${y(Number(rows[last][valueKey]))}" r="4.5" class="chart-dot"/>
    <circle cx="${x(last)}" cy="${y(Number(rows[last][valueKey]))}" r="8" class="chart-latest-ring"/>
    <text x="${m.l}" y="${H-8}" class="chart-axis-label">${firstLabel}</text>
    <text x="${W-m.r}" y="${H-8}" text-anchor="end" class="chart-axis-label">${lastLabel}</text>
  </svg>`;
}

function phaseSpaceSVG(rows){
  if (!rows || rows.length < 2) return '<div class="empty-state">Insufficient MJO history.</div>';
  const W=520,H=310,cx=260,cy=155,scale=31,maxR=4;
  const sx=v=>cx+Math.max(-maxR,Math.min(maxR,Number(v)))*scale;
  const sy=v=>cy-Math.max(-maxR,Math.min(maxR,Number(v)))*scale;
  const edgeR=118;
  const radial=Array.from({length:8},(_,i)=>{
    const a=i*Math.PI/4;
    const x=cx+Math.cos(a)*edgeR,y=cy-Math.sin(a)*edgeR;
    return `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" class="phase-boundary"/>`;
  }).join('');
  const phaseAngles=[202.5,247.5,292.5,337.5,22.5,67.5,112.5,157.5];
  const labels=phaseAngles.map((deg,i)=>{
    const a=deg*Math.PI/180,r=103;
    return `<text x="${cx+Math.cos(a)*r}" y="${cy-Math.sin(a)*r+4}" text-anchor="middle" class="phase-label">${i+1}</text>`;
  }).join('');
  const pts=rows.map(r=>`${sx(r.rmm1)},${sy(r.rmm2)}`).join(' ');
  const points=rows.map((r,i)=>`<circle cx="${sx(r.rmm1)}" cy="${sy(r.rmm2)}" r="${i===rows.length-1?4.5:2.2}" class="phase-point ${i===rows.length-1?'latest':''}" opacity="${(0.25+0.75*(i+1)/rows.length).toFixed(2)}"/>`).join('');
  return `<svg class="chart-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Wheeler-Hendon RMM phase-space diagram">
    <line x1="${cx-edgeR}" y1="${cy}" x2="${cx+edgeR}" y2="${cy}" class="phase-axis"/><line x1="${cx}" y1="${cy-edgeR}" x2="${cx}" y2="${cy+edgeR}" class="phase-axis"/>
    ${radial}<circle cx="${cx}" cy="${cy}" r="${scale}" class="phase-circle"/>
    <text x="${cx}" y="${cy+3}" text-anchor="middle" class="weak-label">Weak MJO</text>
    ${labels}
    <text x="${cx}" y="18" text-anchor="middle" class="phase-region">WESTERN PACIFIC</text>
    <text x="${W-9}" y="${cy+3}" text-anchor="end" class="phase-region">MARITIME CONTINENT</text>
    <text x="${cx}" y="${H-9}" text-anchor="middle" class="phase-region">INDIAN OCEAN</text>
    <text x="9" y="${cy-5}" class="phase-region">W. HEM.</text><text x="9" y="${cy+7}" class="phase-region">& AFRICA</text>
    <text x="${W-18}" y="${cy-6}" text-anchor="end" class="chart-axis-label">+RMM1</text><text x="${cx+7}" y="${cy-edgeR-7}" class="chart-axis-label">+RMM2</text>
    <polyline points="${pts}" class="phase-trail"/>${points}
  </svg>`;
}

function statChip(label,value){ return `<span class="stat-chip">${label}: <b>${value}</b></span>`; }
function sliceDaily(rows,days){ return (rows || []).slice(-days); }

function renderObservedPatterns(histories, days=60){
  const roniRows=(histories.roni?.values || []).slice(-24);
  const pnaRows=sliceDaily(histories.pna?.values || [],days);
  const naoRows=sliceDaily(histories.nao?.values || [],days);
  const mjoRows=sliceDaily(histories.mjo?.values || [],30);

  document.getElementById('roniChart').innerHTML=lineChartSVG(roniRows);
  document.getElementById('pnaChart').innerHTML=lineChartSVG(pnaRows);
  document.getElementById('naoChart').innerHTML=lineChartSVG(naoRows);
  document.getElementById('mjoChart').innerHTML=phaseSpaceSVG(mjoRows);
  document.getElementById('pnaWindowLabel').textContent=`Recent ${days} days`;
  document.getElementById('naoWindowLabel').textContent=`Recent ${days} days`;

  if(roniRows.length){
    const a=roniRows.at(-1), prev=roniRows.at(-2);
    document.getElementById('roniLatest').textContent=`${signed(a.value,2)} °C`;
    document.getElementById('roniStats').innerHTML=statChip('Valid',`${a.season} ${a.year}`)+statChip('1-season Δ',signed(a.value-prev.value,2)+' °C')+statChip('24-season range',`${num(Math.min(...roniRows.map(r=>r.value)),2)} to ${signed(Math.max(...roniRows.map(r=>r.value)),2)} °C`);
  }
  const renderDailyStats=(rows,prefix,units='σ')=>{
    if(!rows.length)return;
    const a=rows.at(-1), back=rows[Math.max(0,rows.length-8)];
    document.getElementById(`${prefix}Latest`).textContent=`${signed(a.value,3)} ${units}`;
    document.getElementById(`${prefix}Stats`).innerHTML=statChip('Valid',a.date)+statChip('7-day Δ',`${signed(a.value-back.value,3)} ${units}`)+statChip(`${days}D range`,`${num(Math.min(...rows.map(r=>r.value)),2)} to ${signed(Math.max(...rows.map(r=>r.value)),2)} ${units}`);
  };
  renderDailyStats(pnaRows,'pna'); renderDailyStats(naoRows,'nao');
  if(mjoRows.length){
    const a=mjoRows.at(-1), maxAmp=Math.max(...mjoRows.map(r=>Number(r.amplitude)));
    document.getElementById('mjoLatest').textContent=`P${a.phase} • ${num(a.amplitude,2)}`;
    document.getElementById('mjoStats').innerHTML=statChip('Valid',a.date)+statChip('RMM1',signed(a.rmm1,2))+statChip('RMM2',signed(a.rmm2,2))+statChip('30D max amp',num(maxAmp,2));
  }
}


function ensoTimeline(issueHint){
  const match=String(issueHint||'').match(/^(\d{4})-(\d{2})$/);
  if(!match) return '';
  const issueYear=Number(match[1]), issueMonth=Number(match[2]);
  const monthNames=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const initials=['J','F','M','A','M','J','J','A','S','O','N','D'];
  const seasons=[];
  const rangeLabel=(centerOffset)=>{
    const center=new Date(Date.UTC(issueYear,issueMonth-1+centerOffset,1));
    const a=new Date(Date.UTC(center.getUTCFullYear(),center.getUTCMonth()-1,1));
    const b=new Date(Date.UTC(center.getUTCFullYear(),center.getUTCMonth()+1,1));
    const season=`${initials[a.getUTCMonth()]}${initials[center.getUTCMonth()]}${initials[b.getUTCMonth()]}`;
    const yr=(a.getUTCFullYear()===b.getUTCFullYear()) ? `${a.getUTCFullYear()}` : `${a.getUTCFullYear()}–${String(b.getUTCFullYear()).slice(-2)}`;
    seasons.push(`${season} ${yr}`);
    return {a,b};
  };
  let first,last;
  for(let i=0;i<9;i++){ const r=rangeLabel(i); if(i===0)first=r.a; if(i===8)last=r.b; }
  const full=`${monthNames[first.getUTCMonth()]}–${monthNames[(first.getUTCMonth()+2)%12]} ${first.getUTCFullYear()} → ${monthNames[(last.getUTCMonth()+10)%12]}–${monthNames[last.getUTCMonth()]} ${last.getUTCFullYear()}`;
  return `<div class="enso-timeline"><div class="enso-timeline-title"><span>Forecast calendar</span><b>${full}</b></div><div class="enso-season-strip">${seasons.map(x=>`<span>${x}</span>`).join('')}</div></div>`;
}

function forecastCard(product, options={}){
  const live=product?.status==='live' && product.image_path;
  const statusClass=live?'ok':'warn';
  const statusText=live?'LIVE GUIDANCE':'UNAVAILABLE';
  const issue=product.issue_hint ? `Issue ${product.issue_hint}` : (product.last_modified ? `Source update ${product.last_modified}` : 'Latest available source product');
  const image=live ? `<a class="forecast-image-link" href="${product.source_page}" target="_blank" rel="noopener"><img class="forecast-image" src="${product.image_path}?v=${encodeURIComponent(product.retrieved_at||'')}" alt="${product.name}" loading="lazy"></a>` : `<div class="forecast-unavailable">Forecast graphic unavailable on the latest source check.</div>`;
  const timeline=options.ensoTimeline ? ensoTimeline(product.issue_hint) : '';
  return `<section class="forecast-card ${options.className||''}">
    <div class="forecast-card-head"><div><b>${product.name||'Forecast guidance'}</b><span>${product.model||'Authoritative source'}</span></div><span class="forecast-status ${statusClass}">${statusText}</span></div>
    ${image}${timeline}
    <div class="forecast-meta-row"><span>${product.horizon||'—'}</span><span>${issue}</span></div>
    <div class="forecast-note">${product.note||''}</div>
    ${product.source_page ? `<a class="source-link" href="${product.source_page}" target="_blank" rel="noopener">${String(product.source_name||'Source').includes('ECMWF')?'ECMWF source':'NOAA/CPC source'} ↗</a>` : ''}
  </section>`;
}

function comparisonRow(label, sublabel, leftProduct, rightProduct){
  return `<section class="forecast-comparison-row">
    <div class="forecast-row-heading"><b>${label}</b><span>${sublabel}</span></div>
    <div class="forecast-pair">${forecastCard(leftProduct||{name:'GEFS guidance',status:'missing'})}${forecastCard(rightProduct||{name:'ECMWF guidance',status:'missing'})}</div>
  </section>`;
}

function renderForwardGuidance(forecast){
  const enso=document.getElementById('ensoForecastBlock');
  const compare=document.getElementById('forecastComparison');
  if(!enso || !compare) return;
  const products=forecast?.products||[];
  const byId=Object.fromEntries(products.map(p=>[p.id,p]));
  enso.innerHTML=forecastCard(byId.enso_probabilities||{name:'ENSO / RONI probabilities',status:'missing'},{ensoTimeline:true,className:'forecast-card-seasonal'});
  compare.innerHTML=[
    comparisonRow('MJO / RMM','Direct ensemble comparison of Wheeler–Hendon phase-space evolution.',byId.mjo_gefs,byId.mjo_ecmwf_ifs_subseasonal_ens),
    comparisonRow('PNA / Pacific–North American circulation','GEFS standardized PNA index versus ECMWF Pacific-sector 500-hPa circulation context.',byId.pna_gefs,byId.pna_context_ecmwf_z500_pacific),
    comparisonRow('NAO / Euro-Atlantic regimes','GEFS standardized NAO index versus ECMWF probabilistic Euro-Atlantic weather regimes.',byId.nao_gefs,byId.nao_context_ecmwf_regimes)
  ].join('');
}

async function boot(){
  const badge = document.getElementById('liveBadge');
  try {
    const [climate, status, regions, histories, forecast] = await Promise.all([
      loadJSON('data/climate_current.json'),
      loadJSON('data/data_status.json'),
      loadJSON('data/ufvs_regions.json'),
      Promise.all([
        loadJSON('data/roni_history.json'), loadJSON('data/mjo_history.json'), loadJSON('data/pna_history.json'), loadJSON('data/nao_history.json')
      ]).then(([roni,mjo,pna,nao])=>({roni,mjo,pna,nao})),
      loadJSON('data/forecast_status.json').catch(()=>({products:[],overall_status:'pending'}))
    ]);

    document.getElementById('lastUpdated').textContent = `Last updated: ${status.generated_at || '—'}`;
    badge.textContent = status.overall_status === 'current' ? 'DATA INTERFACES ONLINE' : 'CHECK DATA';
    badge.className = `badge ${status.overall_status === 'current' ? 'live' : 'research'}`;

    const driverCards = document.getElementById('driverCards');
    climate.indicators.forEach(d => {
      const el = document.createElement('div'); el.className = 'driver-card'; el.innerHTML = driverMarkup(d); driverCards.appendChild(el);
    });

    const regionCards = document.getElementById('regionCards');
    regions.regions.forEach(r => {
      const el = document.createElement('div'); el.className = 'region-card';
      el.innerHTML = `<div class="region-top"><span class="region-name">${r.name}</span><span class="badge neutral">READY</span></div><div class="region-meta">Regional ID: ${r.id}</div><div class="region-meta">Precip signal: inactive • Flash-flood signal: inactive</div>`;
      regionCards.appendChild(el);
    });

    const health = document.getElementById('dataHealth');
    status.datasets.forEach(d => {
      const el = document.createElement('div'); el.className = 'health-item'; const healthy = ['interface_ready','live'].includes(d.status);
      el.innerHTML = `<span>${d.name}</span><b class="${healthy ? 'ok' : 'warn'}">${d.status.replaceAll('_',' ')}</b>`; health.appendChild(el);
    });

    renderObservedPatterns(histories,60);
    renderForwardGuidance(forecast);
    document.querySelectorAll('.window-btn').forEach(btn=>btn.addEventListener('click',()=>{
      document.querySelectorAll('.window-btn').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); renderObservedPatterns(histories,Number(btn.dataset.days));
    }));
  } catch (err) {
    console.error(err); badge.textContent = 'LOAD ERROR'; badge.className = 'badge research';
  }
}

boot();
