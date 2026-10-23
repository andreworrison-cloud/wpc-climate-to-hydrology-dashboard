/* Display preserved development evidence and historical context; never run inference. */
(() => {
  const $=id=>document.getElementById(id), esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=(v,n=3)=>Number.isFinite(v)?v.toLocaleString('en-US',{maximumFractionDigits:n}):'Not available';
  const gateLabels=['Sample support','Magnitude','Versus climatology','Fold stability','Year stability','Leave-one-fold-out stability','Calibration','Uncertainty','Direction'];
  const reasonLabels={insufficient_sample:'Insufficient sample support',negligible_increment:'Increment below magnitude requirement',nonpositive_vs_climatology:'No improvement over climatology',fold_instability:'Insufficient fold stability',year_instability:'Insufficient year stability',leave_fold_out_instability:'Leave-one-fold-out instability',calibration_failure:'Calibration requirement not met',uncertainty_failure:'Uncertainty requirement not met',direction_unverified:'Direction not qualified',uncertainty_unsupported_empty_resample:'Empty resampled strata prevent complete bootstrap support',parent_season_unqualified:'Parent season does not qualify'};
  let catalog,history,domain='West Coast',lead='D1_7',rows=[],request=0;
  const cache=new Map();
  async function verified(path,m){
    const spec=m.files[path];if(!spec)throw Error('Missing science file identity');
    const key=path+'|'+spec.sha256;
    if(cache.has(key))return cache.get(key);
    const response=await fetch(DashboardRefresh.versioned(path,spec.sha256),{cache:'force-cache'});
    if(!response.ok)throw Error('Science file unavailable: '+response.status);
    const data=await response.arrayBuffer();
    const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data)),b=>b.toString(16).padStart(2,'0')).join('');
    if(hash!==spec.sha256||data.byteLength!==spec.bytes)throw Error('Science file integrity check failed');
    const value=JSON.parse(new TextDecoder().decode(data));cache.set(key,value);return value;
  }
  const provenance=m=>`<details class="evidence-details science-provenance"><summary>Source identity and limitations</summary><p>Original development evidence · 2017–2025. No current issue time or forecast valid period.</p><ul>${m.limitations.map(t=>`<li>${esc(t)}</li>`).join('')}</ul><p>Method SHA-256: <code>${m.methodology_sha256}</code></p>${m.sources.map(s=>`<p><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)} ↗</a><code>${s.sha256}</code></p>`).join('')}</details>`;
  function evidence(){
    const type=$('evidencePeriod').value.length===2?'month':'season';
    const r=rows.find(r=>r.window===lead&&r.target===$('precipTarget').value&&r.model===$('evidenceModel').value&&r.stratum_type===type&&r.stratum===$('evidencePeriod').value);
    if(!r){$('regionEvidence').innerHTML='<p>Evidence unavailable for this selection. Guidance remains inactive.</p>';return;}
    const signed=v=>Number.isFinite(v)?(v>0?'+':'')+v.toExponential(3):'Not available';
    $('regionEvidence').innerHTML=`<div class="science-status-row"><h3>${esc(domain)}</h3><span class="science-status">No qualified signal</span><span class="science-status">Guidance unavailable · not issued</span></div>
      <p class="science-selection">${esc(r.stratum)} anchor ${type} · Days ${lead.slice(1).replace('_','–')} · ${esc($('evidenceModel').selectedOptions[0].textContent)}</p>
      <p class="science-note-visible">${r.tier==='Research Watch'?'<b>Research Watch.</b> ':''}This historical cell did not qualify for a precipitation tendency. Research Watch is not forecast permission. No near-climatology forecast is implied.</p>
      <div class="evidence-metrics"><span>Archived research tier<b>${esc(r.tier)}</b></span><span>Positive fold increments<b>${r.Positive_Folds} / ${r.Folds}</b></span><span>Positive year increments<b>${r.Positive_Years} / ${r.Years}</b></span><span>Calibration ECE<b>${fmt(r.ECE_Candidate,4)}</b></span></div>
      <p class="science-small">Positive increments exceed 0.00001 Brier. Moderate requires ≥4/6 folds and ≥6/9 years; every other gate must also pass.</p>
      <dl class="science-numbers"><div><dt>Paired climate ΔBrier vs hydro-only</dt><dd>${signed(r.Delta_Brier_AH)}</dd></div><div><dt>ΔBrier vs training-only climatology</dt><dd>${signed(r.Delta_Brier_A0)}</dd></div><div><dt>Samples · events / non-events</dt><dd>${fmt(r.N,0)} · ${fmt(r.Events,0)} / ${fmt(r.NonEvents,0)}</dd></div><div><dt>Event-bearing 28-day blocks</dt><dd>${fmt(r.EventBearing_28d_Blocks,0)}</dd></div></dl>
      <p class="science-small">Positive ΔBrier means better accuracy, not a wetter tendency. Samples contain overlapping windows; block counts are not an effective sample size.</p>
      <div class="science-gates" aria-label="Original Moderate-tier gates">${r.moderate_gates.map((pass,i)=>`<span class="${pass?'gate-pass':'gate-fail'}">${pass?'✓':'×'} ${gateLabels[i]}</span>`).join('')}</div>
      <p class="science-small">Parent-season tier: ${esc(r.parent_season_tier)}. Months cannot rescue a failed season. Gates above precede parent-season capping.</p>
      <details class="evidence-details"><summary>Retained failure reasons (${r.reason_codes.length})</summary><ul>${r.reason_codes.map(t=>`<li>${esc(reasonLabels[t]||t.replaceAll('_',' '))}</li>`).join('')}</ul></details>
      <p class="science-cell-id">Cell: ${esc(r.cell_id)}</p>${provenance(catalog)}`;
  }
  function cards(){
    $('regionCards').replaceChildren();
    catalog.domains.forEach(d=>{
      const button=document.createElement('button');button.type='button';button.className='region-card'+(d.kind==='national_summary'?' national-summary':'');
      button.dataset.scienceDomain=d.name;button.setAttribute('aria-pressed',String(d.name===domain));
      button.innerHTML=`<span class="region-name">${esc(d.name)}</span><div class="region-meta">${d.kind==='national_summary'?'Separate national summary':'UFVS region'}</div><div class="region-meta">No qualified signal · guidance inactive</div>`;
      button.onclick=()=>selectDomain(d.name);$('regionCards').append(button);
    });
  }
  async function selectDomain(name){
    domain=name;const token=++request,source=catalog;
    document.querySelectorAll('[data-science-domain]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.scienceDomain===domain)));
    $('regionEvidence').textContent='Loading preserved evidence. No current forecast is issued.';
    try{
      const d=source.domains.find(d=>d.name===name),table=await verified(d.path,source);
      const checked=ScienceContract.evidence(table,name);
      if(token!==request||catalog!==source)return;rows=checked;evidence();
    }catch(error){if(token===request)$('regionEvidence').textContent='Evidence unavailable: '+error.message+'. Guidance remains inactive.';}
  }
  function renderHistory(){
    const selected={Domain:$('historyDomain').value,Season:$('historySeason').value,Precip_Response:$('historyMetric').value,Event_Response:$('historyEvent').value};
    const match=r=>Object.entries(selected).every(([k,v])=>r[k]===v);
    const r=history.phase4c.find(match),conditional=history.phase4d.find(match);
    if(!r||!conditional){$('historicalResults').textContent='Historical context unavailable for this selection.';return;}
    const high=r.Event_Rate_Extreme_perDay,low=r.Event_Rate_NonExtreme_perDay;
    const max=Math.max(high,low,.01)*1.15,scale=v=>Math.max(0,v)/max*390;
    const label=selected.Event_Response==='FFW'?'warning issuances':'local storm reports';
    const ticks=Array.from({length:5},(_,i)=>max*i/4);
    $('historicalResults').innerHTML=`<div class="history-heading"><div><h3>${esc(selected.Domain)} · ${selected.Season}</h3><p>${esc(label)} per day · 2004–2025 historical association</p></div><span class="science-status">Historical context · not a forecast</span></div>
      <svg class="history-rate-chart" viewBox="0 0 700 205" role="img" aria-label="${esc(label)} per extreme precipitation day: ${fmt(high)}; per non-extreme day: ${fmt(low)}. Historical association, not a forecast."><g>${ticks.map(v=>{const x=240+scale(v);return `<line x1="${x}" x2="${x}" y1="20" y2="160" stroke="#354e60"/><text x="${x}" y="185" text-anchor="middle">${fmt(v,2)}</text>`;}).join('')}<text x="225" y="62" text-anchor="end">Extreme precipitation days</text><text x="225" y="128" text-anchor="end">Non-extreme days</text><rect x="240" y="35" width="${scale(high)}" height="38" rx="4" fill="#70bdcc"/><rect x="240" y="101" width="${scale(low)}" height="38" rx="4" fill="#617d94"/><text x="${250+scale(high)}" y="60">${fmt(high,2)}</text><text x="${250+scale(low)}" y="126">${fmt(low,2)}</text></g></svg>
      <dl class="science-numbers"><div><dt>Event-rate ratio · extreme / non-extreme</dt><dd>${fmt(r.Event_Rate_Ratio_Extreme_vs_Non,2)}×</dd></div><div><dt>Days · extreme / non-extreme</dt><dd>${fmt(r.Extreme_Days,0)} / ${fmt(r.NonExtreme_Days,0)}</dd></div><div><dt>Events · extreme / non-extreme</dt><dd>${fmt(r.Events_on_Extreme_Days,0)} / ${fmt(r.Events_on_NonExtreme_Days,0)}</dd></div><div><dt>Original global 192-test BH q</dt><dd>${fmt(r.Global192_BH_Q,6)}</dd></div></dl>
      <p class="science-small">${r.Global192_FDR_0p05?'This cell retains statistical support':'This cell does not meet FDR 0.05'} under the original 192-test family. The 128 trusted display cells retain their original correction; the family was not recalculated.</p>
      <div class="history-conditional"><b>Conditional RONI result</b><p>No additional RONI association with event yield was supported after accounting for precipitation severity in this original core-family cell (BH q = ${fmt(conditional.Core128_BH_Q,3)}). This does not negate climate–precipitation associations or prove a zero effect. Retrospective RONI inputs do not establish issue-time forecast skill.</p></div>
      <details class="evidence-details science-provenance"><summary>Historical lineage, calendar and interpretation</summary><p>Authoritative Phase 1A event foundation → Phase 7A 12Z alignment → unchanged Phase 4C/4D inference.</p><p>${history.formal_dates.toLocaleString()} formal dates; excludes 2004-01-01 and 2007-02-26. An ending day includes the previous day 12Z up to, excluding, its own 12Z. Extremes use the archived seasonal 95th-percentile definition.</p><ul>${history.caveats.map(c=>`<li>${esc(c)}</li>`).join('')}</ul><p>Phase 4C inference SHA-256: <code>${esc(r.Source_SHA256)}</code></p><p>Phase 4D inference SHA-256: <code>${esc(conditional.Source_SHA256)}</code></p><p>FFW foundation SHA-256: <code>${esc(history.lineage.ffw_sha256)}</code></p><p>LSR foundation SHA-256: <code>${esc(history.lineage.lsr_sha256)}</code></p><a href="${catalog.sources[2].url}" target="_blank" rel="noopener">Original historical-context export ↗</a></details>`;
  }
  DashboardRefresh.register('science review',['data/science/manifest.json'],async ([m],{initial})=>{
    try{
    ScienceContract.manifest(m);const selected=domain,token=request;
    const [h,t]=await Promise.all([verified(m.history_path,m),verified(m.domains.find(d=>d.name===selected).path,m)]);
    const checkedHistory=ScienceContract.history(h),checkedRows=ScienceContract.evidence(t,selected);
    if(domain!==selected||request!==token)throw Error('Science selection changed during check');
    catalog=m;history=checkedHistory;rows=checkedRows;
    $('scienceCatalogStatus').textContent='Original Q6 evidence: 5,120 seasonal/monthly cells · 0 qualified · 41 Research Watch · 320 annual context rows preserved. Numerical selection-impact audit under review.';
    cards();evidence();renderHistory();
    }catch(error){
      $('scienceCatalogStatus').textContent=initial?'Science review unavailable: source or inactive-state validation failed. Guidance remains inactive.':'Science source check incomplete; retaining previously verified historical evidence. Guidance remains inactive.';
      if(initial){$('regionEvidence').textContent='Evidence unavailable. No current forecast is issued.';$('historicalResults').textContent='Historical context unavailable: source validation did not pass.';}
      throw error;
    }
  });
  document.querySelectorAll('[data-lead]').forEach(b=>b.onclick=()=>{lead=b.dataset.lead;document.querySelectorAll('[data-lead]').forEach(n=>n.setAttribute('aria-pressed',String(n===b)));if(catalog)evidence();});
  ['precipTarget','evidencePeriod','evidenceModel'].forEach(id=>$(id).onchange=()=>{if(catalog)evidence();});
  ['historyDomain','historySeason','historyMetric','historyEvent'].forEach(id=>$(id).onchange=()=>{if(history)renderHistory();});
})();
