const loadJSON = async (path) => {
  const response = await fetch(path, {cache: 'no-store'});
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return response.json();
};

const fmt = (value, suffix='') => value === null || value === undefined ? '—' : `${typeof value === 'number' && value > 0 ? '+' : ''}${value}${suffix}`;
const num = (v, digits=2) => Number.isFinite(Number(v)) ? Number(v).toFixed(digits) : '—';
const signed = (v, digits=2) => Number.isFinite(Number(v)) ? `${Number(v) > 0 ? '+' : ''}${Number(v).toFixed(digits)}` : '—';

const clamp01 = v => Math.max(0, Math.min(1, v));
function signedStateColor(value, scale=1.5){
  const v=Number(value);
  if(!Number.isFinite(v)) return '#9bb8cc';
  const t=clamp01(Math.abs(v)/scale);
  if(Math.abs(v)<0.08) return '#c7d3dc';
  return v>0 ? `hsl(${18-8*t} 88% ${68-14*t}%)` : `hsl(${207+10*t} 92% ${70-15*t}%)`;
}
const mjoPhaseColors={1:'#5ec8ff',2:'#54e0d0',3:'#6ee7a8',4:'#b9e769',5:'#f1d35d',6:'#ffad5c',7:'#ff7a68',8:'#c98cff'};
function mjoStateColor(phase, amplitude=1){ return Number(amplitude)>=1 ? (mjoPhaseColors[Number(phase)]||'#78dfff') : '#91a7b7'; }
function semanticColorForDriver(d){
  if(d.id==='mjo_rmm') return mjoStateColor(d.phase,d.amplitude);
  if(['roni_enso','pna','nao'].includes(d.id)) return signedStateColor(d.value,d.id==='roni_enso'?1.2:1.5);
  return '#78dfff';
}

function driverMarkup(d){
  const stateColor=semanticColorForDriver(d);
  if (d.id === 'mjo_rmm' && d.phase && d.amplitude !== null && d.amplitude !== undefined) {
    return `<div class="driver-top"><span class="driver-name">${d.display_name}</span><span class="status-dot"></span></div>
      <div class="driver-value semantic-value" style="--state-color:${stateColor}">Phase ${d.phase} <span style="font-size:.58em;font-weight:700">• Amp ${Number(d.amplitude).toFixed(2)}</span></div>
      <div class="driver-state-key"><span class="state-swatch" style="background:${stateColor}"></span><span>${d.signal_strength || 'RMM signal'} • ${d.phase_region || ''}</span></div>
      <div class="driver-meta">RMM1 ${Number(d.rmm1).toFixed(2)} • RMM2 ${Number(d.rmm2).toFixed(2)} • valid ${d.valid_time || '—'}</div>
      <div class="driver-meta">Source: ${d.source_name}</div>`;
  }
  return `<div class="driver-top"><span class="driver-name">${d.display_name}</span><span class="status-dot"></span></div>
    <div class="driver-value semantic-value" style="--state-color:${stateColor}">${fmt(d.value, d.units ? ` ${d.units}` : '')}</div>
    <div class="driver-state-key"><span class="state-swatch" style="background:${stateColor}"></span><span>${d.state || 'Awaiting ingestion'}</span></div>
    <div class="driver-meta">valid ${d.valid_time || '—'}</div>
    <div class="driver-meta">Source: ${d.source_name}</div>
    ${d.provisional ? '<div class="driver-meta">Latest value is provisional / subject to CPC revision</div>' : ''}`;
}

function lineChartSVG(rows, valueKey='value', palette='signed'){
  if (!rows || rows.length < 2) return '<div class="empty-state">Insufficient history.</div>';
  const W=640,H=210,m={l:38,r:14,t:14,b:28},vals=rows.map(r=>Number(r[valueKey])).filter(Number.isFinite);
  if(!vals.length) return '<div class="empty-state">No numeric history.</div>';
  let min=Math.min(...vals),max=Math.max(...vals); const abs=Math.max(Math.abs(min),Math.abs(max),.5); min=-abs*1.12;max=abs*1.12;
  const x=i=>m.l+i*(W-m.l-m.r)/(rows.length-1),y=v=>m.t+(max-v)*(H-m.t-m.b)/(max-min),zeroY=y(0);
  const grid=[-1,-.5,0,.5,1].map(f=>min+(max-min)*(f+1)/2).filter(v=>v>=min&&v<=max);
  const gridLines=grid.map(v=>`<line x1="${m.l}" y1="${y(v)}" x2="${W-m.r}" y2="${y(v)}" class="chart-grid-line"/><text x="${m.l-6}" y="${y(v)+3}" text-anchor="end" class="chart-axis-label">${v.toFixed(1)}</text>`).join('');
  const scale=palette==='roni'?1.2:1.5;
  const segments=rows.slice(1).map((r,i)=>{const av=Number(rows[i][valueKey]),bv=Number(r[valueKey]),c=signedStateColor((av+bv)/2,scale);return `<line x1="${x(i)}" y1="${y(av)}" x2="${x(i+1)}" y2="${y(bv)}" class="chart-semantic-segment" stroke="${c}"/>`;}).join('');
  const last=rows.length-1,lastVal=Number(rows[last][valueKey]),lastColor=signedStateColor(lastVal,scale);
  const firstLabel=rows[0].date||`${rows[0].season||''} ${rows[0].year||''}`,lastLabel=rows[last].date||`${rows[last].season||''} ${rows[last].year||''}`;
  return `<svg class="chart-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img">${gridLines}<line x1="${m.l}" y1="${zeroY}" x2="${W-m.r}" y2="${zeroY}" class="chart-zero"/>${segments}<circle cx="${x(last)}" cy="${y(lastVal)}" r="4.5" fill="${lastColor}" class="chart-dot-semantic"/><circle cx="${x(last)}" cy="${y(lastVal)}" r="8" class="chart-latest-ring" style="stroke:${lastColor}"/><text x="${m.l}" y="${H-8}" class="chart-axis-label">${firstLabel}</text><text x="${W-m.r}" y="${H-8}" text-anchor="end" class="chart-axis-label">${lastLabel}</text></svg>`;
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
  const trailSegments=rows.slice(1).map((r,i)=>{const prev=rows[i],c=mjoStateColor(r.phase,r.amplitude);return `<line x1="${sx(prev.rmm1)}" y1="${sy(prev.rmm2)}" x2="${sx(r.rmm1)}" y2="${sy(r.rmm2)}" class="phase-semantic-segment" stroke="${c}" opacity="${(0.35+0.65*(i+2)/rows.length).toFixed(2)}"/>`;}).join('');
  const points=rows.map((r,i)=>{const c=mjoStateColor(r.phase,r.amplitude);return `<circle cx="${sx(r.rmm1)}" cy="${sy(r.rmm2)}" r="${i===rows.length-1?4.5:2.2}" fill="${c}" class="phase-point-semantic" opacity="${(0.25+0.75*(i+1)/rows.length).toFixed(2)}"${i===rows.length-1?' stroke="#eafff5" stroke-width="1.4"':''}/>`;}).join('');
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
    ${trailSegments}${points}
  </svg>`;
}

function statChip(label,value){ return `<span class="stat-chip">${label}: <b>${value}</b></span>`; }
function sliceDaily(rows,days){ return (rows || []).slice(-days); }

function renderObservedPatterns(histories, days=60){
  const roniRows=(histories.roni?.values || []).slice(-24);
  const pnaRows=sliceDaily(histories.pna?.values || [],days);
  const naoRows=sliceDaily(histories.nao?.values || [],days);
  const mjoRows=sliceDaily(histories.mjo?.values || [],30);

  document.getElementById('roniChart').innerHTML=lineChartSVG(roniRows,'value','roni');
  document.getElementById('pnaChart').innerHTML=lineChartSVG(pnaRows);
  document.getElementById('naoChart').innerHTML=lineChartSVG(naoRows);
  document.getElementById('mjoChart').innerHTML=phaseSpaceSVG(mjoRows);
  document.getElementById('pnaWindowLabel').textContent=`Recent ${days} days`;
  document.getElementById('naoWindowLabel').textContent=`Recent ${days} days`;

  if(roniRows.length){
    const a=roniRows.at(-1), prev=roniRows.at(-2);
    document.getElementById('roniLatest').textContent=`${signed(a.value,2)} °C`; document.getElementById('roniLatest').style.color=signedStateColor(a.value,1.2);
    document.getElementById('roniStats').innerHTML=statChip('Valid',`${a.season} ${a.year}`)+statChip('1-season Δ',signed(a.value-prev.value,2)+' °C')+statChip('24-season range',`${num(Math.min(...roniRows.map(r=>r.value)),2)} to ${signed(Math.max(...roniRows.map(r=>r.value)),2)} °C`);
  }
  const renderDailyStats=(rows,prefix,units='σ')=>{
    if(!rows.length)return;
    const a=rows.at(-1), back=rows[Math.max(0,rows.length-8)];
    document.getElementById(`${prefix}Latest`).textContent=`${signed(a.value,3)} ${units}`; document.getElementById(`${prefix}Latest`).style.color=signedStateColor(a.value,1.5);
    document.getElementById(`${prefix}Stats`).innerHTML=statChip('Valid',a.date)+statChip('7-day Δ',`${signed(a.value-back.value,3)} ${units}`)+statChip(`${days}D range`,`${num(Math.min(...rows.map(r=>r.value)),2)} to ${signed(Math.max(...rows.map(r=>r.value)),2)} ${units}`);
  };
  renderDailyStats(pnaRows,'pna'); renderDailyStats(naoRows,'nao');
  if(mjoRows.length){
    const a=mjoRows.at(-1), maxAmp=Math.max(...mjoRows.map(r=>Number(r.amplitude)));
    document.getElementById('mjoLatest').textContent=`P${a.phase} • ${num(a.amplitude,2)}`; document.getElementById('mjoLatest').style.color=mjoStateColor(a.phase,a.amplitude);
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
  const isEcmwf=String(product.source_name||product.model||'').includes('ECMWF');
  const diagnosticNote=product.id==='nao_context_ecmwf_regimes' ? `<div class="diagnostic-note"><b>Diagnostic distinction:</b> Regime probabilities ≠ standardized NAO index.</div>` : '';
  return `<section class="forecast-card ${options.className||''}">
    <div class="forecast-card-head"><div><b>${product.name||'Forecast guidance'}</b><span>${product.model||'Authoritative source'}</span></div><span class="forecast-status ${statusClass}">${statusText}</span></div>
    ${image}${timeline}
    <div class="forecast-meta-row"><span>${product.horizon||'—'}</span><span>${issue}</span></div>
    <div class="forecast-note">${product.note||''}</div>
    ${diagnosticNote}
    ${product.source_page ? `<a class="source-link ${isEcmwf?'source-link-ecmwf':'source-link-noaa'}" href="${product.source_page}" target="_blank" rel="noopener">${isEcmwf?'ECMWF source':'NOAA/CPC source'} ↗</a>` : ''}
  </section>`;
}

function consensusStrip(kind,leftProduct,rightProduct){
  const ready=leftProduct?.status==='live' && rightProduct?.status==='live';
  const criteria={mjo:'Phase • amplitude • propagation • ensemble spread',pna:'GEFS PNA tendency • ECMWF Pacific 500-hPa pattern consistency',nao:'GEFS NAO tendency • ECMWF Euro-Atlantic regime probabilities'}[kind]||'Matched model evidence';
  return `<div class="consensus-strip ${ready?'ready':'waiting'}"><div><span class="consensus-kicker">MULTI-MODEL CONSENSUS</span><b>${ready?'EVIDENCE AVAILABLE — SCORE GUARDED':'AWAITING BOTH SOURCES'}</b></div><p>${criteria}</p><span class="consensus-guardrail">${ready?'High / Moderate / Low is intentionally withheld until structured forecast values—not chart pixels—are ingested and validated.':'Consensus scoring remains disabled.'}</span></div>`;
}
function comparisonRow(label, sublabel, leftProduct, rightProduct, kind){
  return `<section class="forecast-comparison-row"><div class="forecast-row-heading"><b>${label}</b><span>${sublabel}</span></div><div class="forecast-pair">${forecastCard(leftProduct||{name:'GEFS guidance',status:'missing'})}${forecastCard(rightProduct||{name:'ECMWF guidance',status:'missing'})}</div>${consensusStrip(kind,leftProduct,rightProduct)}</section>`;
}

function renderForwardGuidance(forecast){
  const enso=document.getElementById('ensoForecastBlock');
  const compare=document.getElementById('forecastComparison');
  if(!enso || !compare) return;
  const products=forecast?.products||[];
  const byId=Object.fromEntries(products.map(p=>[p.id,p]));
  enso.innerHTML=forecastCard(byId.enso_probabilities||{name:'ENSO / RONI probabilities',status:'missing'},{ensoTimeline:true,className:'forecast-card-seasonal'});
  compare.innerHTML=[
    comparisonRow('MJO / RMM','Direct ensemble comparison of Wheeler–Hendon phase-space evolution.',byId.mjo_gefs,byId.mjo_ecmwf_ifs_subseasonal_ens,'mjo'),
    comparisonRow('PNA / Pacific–North American circulation','GEFS standardized PNA index versus ECMWF Pacific-sector 500-hPa circulation context.',byId.pna_gefs,byId.pna_context_ecmwf_z500_pacific,'pna'),
    comparisonRow('NAO / Euro-Atlantic regimes','GEFS standardized NAO index versus ECMWF probabilistic Euro-Atlantic weather regimes.',byId.nao_gefs,byId.nao_context_ecmwf_regimes,'nao')
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
