const loadJSON = async (path) => {
  const response = await fetch(path, {cache: 'no-store'});
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return response.json();
};

const fmt = (value, suffix='') => value === null || value === undefined ? '—' : `${typeof value === 'number' && value > 0 ? '+' : ''}${value}${suffix}`;

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

async function boot(){
  const badge = document.getElementById('liveBadge');
  try {
    const [climate, status, regions, pattern] = await Promise.all([
      loadJSON('data/climate_current.json'),
      loadJSON('data/data_status.json'),
      loadJSON('data/ufvs_regions.json'),
      loadJSON('data/pattern_evolution.json')
    ]);

    document.getElementById('lastUpdated').textContent = `Last updated: ${status.generated_at || '—'}`;
    badge.textContent = status.overall_status === 'current' ? 'DATA INTERFACES ONLINE' : 'CHECK DATA';
    badge.className = `badge ${status.overall_status === 'current' ? 'live' : 'research'}`;

    const driverCards = document.getElementById('driverCards');
    climate.indicators.forEach(d => {
      const el = document.createElement('div');
      el.className = 'driver-card';
      el.innerHTML = driverMarkup(d);
      driverCards.appendChild(el);
    });

    const regionCards = document.getElementById('regionCards');
    regions.regions.forEach(r => {
      const el = document.createElement('div');
      el.className = 'region-card';
      el.innerHTML = `<div class="region-top"><span class="region-name">${r.name}</span><span class="badge neutral">READY</span></div>
        <div class="region-meta">Regional ID: ${r.id}</div>
        <div class="region-meta">Precip signal: inactive • Flash-flood signal: inactive</div>`;
      regionCards.appendChild(el);
    });

    const health = document.getElementById('dataHealth');
    status.datasets.forEach(d => {
      const el = document.createElement('div');
      el.className = 'health-item';
      const healthy = ['interface_ready','live'].includes(d.status);
      el.innerHTML = `<span>${d.name}</span><b class="${healthy ? 'ok' : 'warn'}">${d.status.replaceAll('_',' ')}</b>`;
      health.appendChild(el);
    });

    const timeline = document.getElementById('patternSummary');
    pattern.windows.forEach(w => {
      const el = document.createElement('div');
      el.className = 'timeline-row';
      el.innerHTML = `<b>${w.window}</b><span>${w.description}</span>`;
      timeline.appendChild(el);
    });
  } catch (err) {
    console.error(err);
    badge.textContent = 'LOAD ERROR';
    badge.className = 'badge research';
  }
}

boot();
