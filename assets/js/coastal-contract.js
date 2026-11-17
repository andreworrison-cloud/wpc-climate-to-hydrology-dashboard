/* Historical coastal research only. An issued outlook requires a separate contract. */
(() => {
  const check=(ok,message)=>{if(!ok)throw new Error('Coastal research: '+message);};
  const iso=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s));
  function validate(d){
    check(d?.schema==='coastal-research-v1'&&iso(d.as_of),'snapshot identity');
    check(d.source_register_sha256==='c5564f35a856c042fd9fcb507af453adeb433dc40a7076c3a8e388e3ef57cb05','source register');
    const c=d.coverage,o=d.outlook;
    check(c?.primary_occurrences===509&&c.winters===45&&c.first_winter_end===1980&&c.last_winter_end===2024&&c.census_certified===false,'coverage');
    check(o?.active===false&&o.state==='not_qualified'&&['probability','issue_time','valid_start','valid_end'].every(k=>o[k]===null),'unexpected issued outlook');
    check(Array.isArray(d.events)&&d.events.length===509,'event inventory');
    const ids=new Set(),years=new Set();let exact=0,tc=0;
    for(const e of d.events){
      check(typeof e.id==='string'&&/^[A-Z0-9_]+$/.test(e.id)&&!ids.has(e.id),'event identity');ids.add(e.id);
      check(Number.isInteger(e.winter_end)&&e.winter_end>=1980&&e.winter_end<=2024,'winter');years.add(e.winter_end);
      check(Number.isInteger(e.support_clocks)&&e.support_clocks>=0&&typeof e.direct_tc_transition==='boolean','clock/lineage fields');
      check(e.support_clocks>0?iso(e.reference_date):e.reference_date===null,'date precision');
      check(iso(e.candidate_start)&&iso(e.candidate_end)&&e.candidate_start<=e.candidate_end,'date envelope');
      check(['scoped_positive','binding_open','not_reviewed'].includes(e.annotation),'annotation state');
      check(Array.isArray(e.regions)&&new Set(e.regions).size===e.regions.length&&e.regions.every(r=>['SOUTHEAST','MID_ATLANTIC','NEW_ENGLAND'].includes(r)),'region vocabulary');
      check(e.annotation==='scoped_positive'?e.regions.length>0:e.regions.length===0,'region unknown/positive distinction');
      exact+=e.support_clocks>0;tc+=e.direct_tc_transition;
    }
    check(years.size===45&&exact===502&&tc===5&&c.clock_supported===exact&&c.date_envelope_only===509-exact&&c.excluding_direct_tc===509-tc,'coverage reconciliation');
    check(Array.isArray(d.comparisons)&&d.comparisons.length===4,'comparison family');const keys=new Set();
    for(const r of d.comparisons){
      const key=r.age+'|'+r.comparison;check(!keys.has(key),'duplicate comparison');keys.add(key);
      check([0,1].includes(r.age)&&['PAIR_STATIONARY-minus-PNA_STATIONARY','PAIR_SEASON-minus-PAIR_STATIONARY'].includes(r.comparison),'comparison identity');
      check(r.exact_count===502&&r.uncertain_count===7&&r.uncertainty_kind==='date_allocation_bounds_not_confidence_interval','uncertainty definition');
      check([r.exact_mean,r.lower,r.upper].every(Number.isFinite)&&r.lower<=r.upper,'comparison values');
    }
    check(d.readiness?.length===4&&d.readiness.every(r=>['not_qualified','partial'].includes(r.status)),'qualification state');
    return d;
  }
  function select(events,{winter='all',excludeTC=false,query=''}={}){
    const normalize=s=>s.toLowerCase().replace(/_/g,' ');const needle=normalize(query.trim());
    return events.filter(e=>(winter==='all'||e.winter_end===Number(winter))&&(!excludeTC||!e.direct_tc_transition)&&(!needle||[e.id,e.reference_date,e.candidate_start,e.candidate_end,...e.regions].join(' ').toLowerCase().replace(/_/g,' ').includes(needle))).sort((a,b)=>(b.reference_date||b.candidate_start).localeCompare(a.reference_date||a.candidate_start)||a.id.localeCompare(b.id));
  }
  const api={validate,select};if(typeof module!=='undefined')module.exports=api;else window.CoastalContract=api;
})();
