/* Inactive review contract. A future issued product requires a separate schema. */
(() => {
  const domains=['West Coast','Southwest','Interior Mountain West','Northern Plains','Southern Plains','Southeast','Northeast','National CONUS'];
  const windows=['D1_7','D8_14','D15_21','D22_28'];
  const models=['A_H_ALL','A_H_RONI','A_H_MJO','A_H_PNA','A_H_NAO'];
  const targets=['AreaMeanExtreme','AreaFrac25Extreme'];
  const nulls=['probability','anchor_probability','delta_probability','issue_time','valid_start','valid_end'];
  const method='fa6141ca2a7158cc5622924c70f9197a25d631aabb1170cc6ddc45f9dc843a9e';
  const check=(ok,message)=>{if(!ok)throw Error('Science review: '+message);};
  const finite=v=>typeof v==='number'&&Number.isFinite(v);
  function manifest(m){
    check(m.schema_version==='q6-inactive-review-v1','unknown schema');
    check(m.active===false&&m.deployment_eligible===false&&m.qualification_rerun===false,'unexpected activation');
    check(m.methodology_sha256===method,'method identity');
    check(m.counts.total===5440&&m.counts.qualified===0&&m.counts.research_watch===41&&m.counts.no_qualified_signal===5079,'family counts');
    const d=m.guidance_defaults;
    check(d.active===false&&d.deployment_eligible===false&&d.input_status==='not_evaluated'&&d.display_state==='unavailable','issued guidance in review catalog');
    check(nulls.every(k=>d[k]===null)&&['issue_time','valid_start','valid_end'].every(k=>m[k]===null),'unexpected issued value');
    check(Array.isArray(m.domains)&&m.domains.length===8&&new Set(m.domains.map(d=>d.name)).size===8,'domain inventory');
    check(Array.isArray(m.sources)&&m.sources.length===4&&m.sources.every(s=>/^https:\/\/drive\.google\.com\/file\/d\/[A-Za-z0-9_-]+\/view$/.test(s.url)&&/^[a-f0-9]{64}$/.test(s.sha256)),'source inventory');
    check(m.sources.some(s=>s.sha256==='dbb2ef927217a49050db10b8f0e0abcc1e73ddf961bbb7ba63a86845ec5f7b9b'),'frozen score identity');
    check(Array.isArray(m.limitations)&&m.limitations.length>=6,'missing limitations');
    m.domains.forEach(d=>{
      check(domains.includes(d.name)&&d.cells===680,'domain cells');
      check(d.kind===(d.name==='National CONUS'?'national_summary':'ufvs_region'),'national summary distinction');
      check(/^data\/science\/evidence_[a-z_]+\.json$/.test(d.path),'evidence path');
      check(m.files[d.path]&&/^[a-f0-9]{64}$/.test(m.files[d.path].sha256),'evidence hash');
    });
    check(m.history_path==='data/science/historical_context_v1.json'&&m.files[m.history_path],'history identity');
    return m;
  }
  function evidence(table,domain){
    check(table.schema_version==='q6-review-table-v1'&&table.active===false&&table.domain===domain,'evidence identity');
    check(Array.isArray(table.rows)&&table.rows.length===680&&new Set(table.columns).size===table.columns.length,'evidence schema');
    const keys=['window','target','model','stratum_type','stratum','tier','reason_codes','moderate_gates','parent_season_tier','N','Events','NonEvents','Years','Folds','Brier_Candidate','Brier_AH','Brier_A0','Delta_Brier_AH','Delta_Brier_A0','ECE_Candidate','ECE_AH','Positive_Folds','Positive_Years','Minimum_LeaveOneFoldOut_Gain','EventBearing_28d_Blocks','Minimum_Valid_Bootstrap_Replicates','Lower90_AH_Worst_Length','Lower90_A0_Worst_Length'];
    check(table.columns.length===keys.length&&keys.every((k,i)=>table.columns[i]===k),'column identity');
    const seen=new Set();
    const rows=table.rows.map(values=>{
      check(values.length===keys.length,'short evidence row');
      const r=Object.fromEntries(keys.map((k,i)=>[k,values[i]]));
      check(windows.includes(r.window)&&targets.includes(r.target)&&models.includes(r.model),'task identity');
      const strata={season:['DJF','MAM','JJA','SON'],month:Array.from({length:12},(_,i)=>String(i+1).padStart(2,'0')),annual:['ANN']};
      check(strata[r.stratum_type]?.includes(r.stratum),'stratum identity');
      check(r.stratum_type==='annual'?r.tier==='Context Only':['No Qualified Signal','Research Watch'].includes(r.tier),'qualified tier in review catalog');
      check(Array.isArray(r.reason_codes)&&r.reason_codes.length>0&&r.reason_codes.every(s=>typeof s==='string'),'missing reasons');
      check(r.moderate_gates.length===9&&r.moderate_gates.every(v=>typeof v==='boolean'),'gate identity');
      check(r.N===r.Events+r.NonEvents&&r.N>0&&r.Folds===6&&r.Years===9,'sample counts');
      for(const k of keys.slice(9))check(r[k]===null||finite(r[k]),'nonfinite metric');
      check(r.Positive_Folds<=r.Folds&&r.Positive_Years<=r.Years,'stability counts');
      const key=[r.window,r.target,r.model,r.stratum_type,r.stratum].join('|');
      check(!seen.has(key),'duplicate evidence cell');seen.add(key);
      r.cell_id=[domain,key].join('|');return r;
    });
    // 4 windows × 2 targets × 5 models × (4 seasons + 12 months + annual) = 680.
    check(seen.size===680,'incomplete evidence family');return rows;
  }
  function history(h){
    check(h.schema_version==='q6-historical-context-v0.1'&&h.active===false,'history schema');
    check(h.formal_dates===8034&&h.event_alignment==='[previous day 12Z, current day 12Z)','history calendar');
    check(h.lineage.ffw_sha256==='2d8a19aef884bf51ecb7f1fe25042b388bac260b3f91fd65bef291c2dda02471'&&h.lineage.lsr_sha256==='2bbcae69ba28565a6e2b9ca75367aed107e7bc57c47b6f5239e14c07f7ce6b96','authoritative event lineage');
    for(const [group,hash] of [['phase4c',h.lineage.phase4c_sha256],['phase4d',h.lineage.phase4d_sha256]]){
      check(h[group]?.length===128,'history family');const seen=new Set();
      h[group].forEach(r=>{
        check(r.Active===false&&r.Interpretation==='historical_association_not_forecast','history interpretation');
        check(domains.includes(r.Domain)&&['DJF','MAM','JJA','SON'].includes(r.Season)&&['FFW','LSR'].includes(r.Event_Response)&&['AreaMean','AreaFrac_GE25mm'].includes(r.Precip_Response),'untrusted history dimension');
        check(r.Source_SHA256===hash&&typeof r.Original_Correction_Family==='string','history provenance');
        const key=[r.Domain,r.Season,r.Precip_Response,r.Event_Response].join('|');check(!seen.has(key),'duplicate history cell');seen.add(key);
        if(group==='phase4c'){
          check(r.Formal_Days===r.Extreme_Days+r.NonExtreme_Days&&r.Extreme_Days>0&&r.NonExtreme_Days>0,'history sample counts');
          check(finite(r.Event_Rate_Extreme_perDay)&&finite(r.Event_Rate_NonExtreme_perDay)&&r.Event_Rate_Extreme_perDay>=0&&r.Event_Rate_NonExtreme_perDay>=0,'history event rates');
          check(Math.abs(r.Event_Rate_Extreme_perDay-r.Events_on_Extreme_Days/r.Extreme_Days)<1e-7&&Math.abs(r.Event_Rate_NonExtreme_perDay-r.Events_on_NonExtreme_Days/r.NonExtreme_Days)<1e-7,'history rate reconstruction');
          check(r.Original_Correction_Family==='Global192_BH / ResponseFamily96_BH; not recalculated after trusted-metric filtering','original correction family');
        }else check(r.Original_Correction_Family==='Core128_BH / CoreEvent64_BH'&&r.Core128_FDR_0p05===false,'conditional family');
      });
    }
    check(h.phase4c.filter(r=>r.Global192_FDR_0p05).length===122,'original family result');return h;
  }
  const api={manifest,evidence,history};
  if(typeof module!=='undefined')module.exports=api;else window.ScienceContract=api;
})();
