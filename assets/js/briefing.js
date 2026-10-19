/* Read-only presentation of an archived AI issuance; no API key or AI calls in browser. */
(async()=>{
  const $=id=>document.getElementById(id),content=$('briefingContent');
  const date=s=>new Date(s).toLocaleString('en-US',{timeZone:'America/New_York',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'});
  const get=async path=>{const r=await fetch(path,{cache:'no-store'});if(!r.ok)throw Error('Unavailable');return r.json();};
  const el=(tag,text)=>{const n=document.createElement(tag);n.textContent=text;return n;};
  try{
    const [b,status]=await Promise.all([get('data/briefing/latest.json'),get('data/briefing/status.json')]);
    const issued=Date.parse(b.generated_at),expiry=Date.parse(b.expires_at),now=Date.now();
    if(b.status!=='available'||!Number.isFinite(issued)||!Number.isFinite(expiry)||issued>now+60000||now>=expiry){
      $('briefingStatus').textContent='AI briefing unavailable';
      $('briefingMeta').textContent=b.status==='available'?`Last briefing issued ${date(b.generated_at)} has expired; awaiting a new issuance.`:(status.message||'Awaiting the first verified AI briefing.');
      content.append(el('p','Current observations and forecast-driver graphics remain available below. No replacement narrative has been inferred.'));return;
    }
    $('briefingStatus').textContent=status.status==='available'?'AI-derived · automated checks passed':'Previous AI briefing · refresh unavailable';
    $('briefingMeta').textContent=`Issued ${date(b.generated_at)} · Morning target 6:30 a.m. Eastern · Source valid times may differ. ${status.status==='available'?'':status.message}`;
    const lookup=new Map(b.facts.map(f=>[f.id,f]));
    for(const [key,label] of [['observed','Observed state'],['forecast','Forecast evolution'],['watch','What to watch']]){
      const box=el('article','');box.append(el('h3',label));
      for(const row of b.sections[key]){
        if(!row.evidence_ids.length||row.evidence_ids.some(id=>!lookup.has(id)))throw Error('Missing source');
        const p=el('p',row.text);box.append(p);
        const sources=el('small','Evidence: ');
        for(const id of row.evidence_ids){const a=el('a',id.replaceAll('_',' '));a.href='#briefing-fact-'+id;a.onclick=()=>{$('briefingSources').open=true;};sources.append(a,document.createTextNode(' '));}
        box.append(sources);
      }
      content.append(box);
    }
    const list=$('briefingSourceList');
    list.append(el('p',`AI-generated; not human reviewed. Automated checks do not establish forecast skill. Model: ${b.model}. Policy: ${b.prompt_version}.`));
    for(const f of b.facts){const p=el('p',`${f.id}: ${f.text} `);p.id='briefing-fact-'+f.id;
      if(typeof f.source==='string'&&(/^https:\/\//.test(f.source)||/^data\/[\w/.-]+\.json$/.test(f.source))){const a=el('a','Source ↗');a.href=f.source;a.target='_blank';a.rel='noopener';p.append(a);}list.append(p);}
    if(/^data\/briefing\/archive\/[\w-]+\/inputs\.json$/.test(b.archive_path)){const a=el('a','Archived input snapshot ↗');a.href=b.archive_path;list.append(a);}
    $('briefingSources').hidden=false;
  }catch(e){content.replaceChildren();$('briefingStatus').textContent='AI briefing unavailable';$('briefingMeta').textContent='The briefing could not be loaded or verified. Dashboard source products remain available below.';}
})();
