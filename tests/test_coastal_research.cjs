const assert=require('node:assert/strict'),fs=require('node:fs');
const api=require('../assets/js/coastal-contract.js');
const data=JSON.parse(fs.readFileSync('data/coastal/research_snapshot.json','utf8'));
api.validate(data);
assert.equal(api.select(data.events).length,509);
assert.equal(api.select(data.events,{excludeTC:true}).length,504);
for(let year=1980;year<=2024;year++){
  const x=api.select(data.events,{winter:String(year)});assert(x.length>0);assert(x.every(e=>e.winter_end===year));
}
const uncertain=data.events.filter(e=>e.reference_date===null);assert.equal(uncertain.length,7);
assert.equal(data.events.filter(e=>e.annotation==='scoped_positive').length,43);
assert.equal(data.events.filter(e=>e.annotation==='binding_open').length,1);
assert.equal(api.select(data.events,{query:'not-an-existing-record'}).length,0);
for(const e of uncertain)assert(api.select(data.events,{query:e.id.toLowerCase()}).some(x=>x.id===e.id));
function rejected(change){const x=structuredClone(data);change(x);assert.throws(()=>api.validate(x));}
rejected(x=>x.outlook.active=true);
rejected(x=>x.outlook.probability=0.2);
rejected(x=>x.outlook.issue_time='2026-11-17T12:00:00Z');
rejected(x=>x.coverage.census_certified=true);
rejected(x=>x.events[0].reference_date=null);
rejected(x=>x.events[1].id=x.events[0].id);
rejected(x=>x.events.find(e=>e.annotation==='scoped_positive').annotation='not_reviewed'); // first case has a documented region
rejected(x=>x.comparisons[0].uncertainty_kind='confidence_interval');
rejected(x=>x.comparisons[0].lower=Infinity);
const html=fs.readFileSync('index.html','utf8');assert.equal((html.match(/id="coastal-storms"/g)||[]).length,1);
assert(html.indexOf('assets/js/coastal-contract.js')<html.indexOf('assets/js/coastal.js'));
assert(html.includes('href="#coastal-storms"'));
console.log('Coastal research: inventory reconciliation, filtering, date precision, inactive outlook and invalid-input checks passed.');
